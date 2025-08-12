import csv
import logging
import os
from datetime import date, datetime, timedelta
from io import BytesIO, StringIO
from typing import Annotated, List, Optional
from zoneinfo import ZoneInfo

from fastapi import (
    APIRouter,
    HTTPException,
    Query,
    Response,
    UploadFile,
    Body,
)

from firemerge.firefly_client import FireflyClient
from firemerge.merge import best_candidates, deduplicate_candidates, merge_transactions
from firemerge.model import (
    Account,
    AccountSettings,
    Category,
    Currency,
    DisplayTransaction,
    DisplayTransactionType,
    Transaction,
    TransactionCandidate,
    TransactionType,
    TransactionState,
    TransactionUpdateResponse,
    StatementTransaction,
)
from firemerge.statement import StatementReader
from firemerge.deps import FireflyClientDep
from firemerge.util import async_collect


DESCRIPTION_SCORE_CUTOFF = 80

logger = logging.getLogger("uvicorn.error")

api_router = APIRouter(prefix="/api")


@api_router.post("/parse_statement")
async def parse_statement(
    file: UploadFile,
    account_id: Annotated[int, Query(...)],
    timezone: Annotated[str, Query(description="Client timezone")],
    firefly_client: FireflyClientDep,
) -> list[StatementTransaction]:
    """Handle file upload for bank statement"""
    try:
        content = BytesIO(await file.read())
        account = await firefly_client.get_account(account_id)

        # Validate timezone
        try:
            tz = ZoneInfo(timezone)
        except Exception:
            tz = ZoneInfo("UTC")

        # Parse the statement
        try:
            return list(StatementReader.read(content, account, tz))
        except Exception as e:
            logger.exception("Parse failed")
            raise HTTPException(status_code=400, detail=str(e)) from e

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Parse failed")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@api_router.get("/accounts")
async def get_accounts(firefly_client: FireflyClientDep) -> List[Account]:
    return await firefly_client.get_accounts()


@api_router.get("/accounts/{account_id}")
async def get_account(account_id: int, firefly_client: FireflyClientDep) -> Account:
    return await firefly_client.get_account(account_id)


@api_router.get("/categories")
async def get_categories(firefly_client: FireflyClientDep) -> List[Category]:
    return await firefly_client.get_categories()


@api_router.get("/currencies")
async def get_currencies(firefly_client: FireflyClientDep) -> List[Currency]:
    return await firefly_client.get_currencies()


@api_router.post("/transactions")
async def get_transactions(
    account_id: Annotated[int, Query(...)],
    statement: Annotated[list[StatementTransaction], Body(...)],
    firefly_client: FireflyClientDep,
) -> List[DisplayTransaction]:
    """Get merged transactions for an account"""
    start_date = min(
        (tr.date.date() for tr in statement), default=date.today()
    ) - timedelta(days=365)
    return merge_transactions(
        await _get_transactions(account_id, firefly_client, start_date),
        statement,
        await firefly_client.get_currencies(),
        account_id,
    )


@api_router.post("/transaction")
async def store_transaction(
    account_id: Annotated[int, Query(...)],
    transaction: Annotated[DisplayTransaction, Body(...)],
    firefly_client: FireflyClientDep,
) -> TransactionUpdateResponse:
    """Store a transaction"""
    account = await firefly_client.get_account(account_id)
    assert account.currency_id is not None

    # Determine transaction type and IDs
    source_name: Optional[str]
    destination_name: Optional[str]

    if transaction.type is DisplayTransactionType.Withdrawal:
        tr_type = TransactionType.Withdrawal
        source_id = account_id
        source_name = account.name
        destination_id = transaction.account_id
        destination_name = transaction.account_name
    elif transaction.type is DisplayTransactionType.TransferOut:
        assert transaction.account_id is not None
        tr_type = TransactionType.Transfer
        source_id = account_id
        source_name = account.name
        destination_id = transaction.account_id
        destination_name = transaction.account_name
    elif transaction.type is DisplayTransactionType.TransferIn:
        assert transaction.account_id is not None
        tr_type = TransactionType.Transfer
        source_id = transaction.account_id
        source_name = transaction.account_name
        destination_id = account_id
        destination_name = account.name
    elif transaction.type is DisplayTransactionType.Deposit:
        assert transaction.account_id is not None
        tr_type = TransactionType.Deposit
        source_id = transaction.account_id
        source_name = transaction.account_name
        destination_id = account_id
        destination_name = account.name
    else:
        raise HTTPException(status_code=400, detail="Invalid transaction type")

    new_transaction = Transaction(
        id=None if transaction.state is TransactionState.New else int(transaction.id),
        type=tr_type,
        date=transaction.date,
        amount=transaction.amount,
        description=transaction.description,
        currency_id=account.currency_id,
        foreign_amount=transaction.foreign_amount,
        foreign_currency_id=transaction.foreign_currency_id,
        category_id=transaction.category_id,
        source_id=source_id,
        source_name=source_name if source_id is None else None,
        destination_id=destination_id,
        destination_name=destination_name if destination_id is None else None,
        notes=transaction.notes,
    )

    if transaction.type is DisplayTransactionType.TransferIn and transaction.foreign_amount is not None:
        new_transaction.amount, new_transaction.foreign_amount = new_transaction.foreign_amount, new_transaction.amount
        new_transaction.currency_id, new_transaction.foreign_currency_id = new_transaction.foreign_currency_id, new_transaction.currency_id

    new_transaction = await firefly_client.store_transaction(new_transaction)

    firefly_client.clear_transactions_cache()

    response = TransactionUpdateResponse(
        transaction=new_transaction.as_display_transaction(account_id).model_copy(
            update={"state": TransactionState.Matched}
        ),
        account=None,
    )

    new_acc_id = None
    if new_transaction.source_id is None:
        new_acc_id = new_transaction.source_id
    if new_transaction.destination_id is None:
        new_acc_id = new_transaction.destination_id
    if new_acc_id is not None:
        response.account = await firefly_client.get_account(new_acc_id)
        firefly_client.clear_accounts_cache()

    return response


@api_router.get("/descriptions")
async def search_descriptions(
    account_id: Annotated[int, Query(...)],
    query: Annotated[str, Query(...)],
    firefly_client: FireflyClientDep,
) -> list[TransactionCandidate]:
    """Search for transaction descriptions"""
    app_transactions = await _get_transactions(account_id, firefly_client)
    candidates = deduplicate_candidates(
        (tr.as_candidate(account_id) for tr in app_transactions), ignore_notes=True
    )
    return best_candidates(candidates, query, lambda tr: tr.description, score_cutoff=DESCRIPTION_SCORE_CUTOFF)


@api_router.post("/clear_cache")
async def clear_cache(firefly_client: FireflyClientDep) -> None:
    await firefly_client.clear_cache()


@api_router.get("/accounts/{account_id}/settings")
async def get_account_settings(
    account_id: int,
    firefly_client: FireflyClientDep,
) -> Optional[AccountSettings]:
    return await firefly_client.get_account_settings(account_id)


@api_router.post("/accounts/{account_id}/settings")
async def update_account_settings(
    account_id: int,
    settings: Annotated[AccountSettings, Body(...)],
    firefly_client: FireflyClientDep,
) -> None:
    await firefly_client.update_account_settings(account_id, settings)


@api_router.get("/accounts/{account_id}/taxer-statement")
async def get_taxer_statement(
    account_id: int,
    start_date: Annotated[
        str, Query(..., description="Start date in ISO format (YYYY-MM-DD)")
    ],
    firefly_client: FireflyClientDep,
):
    """Generate taxer statement CSV for selected account"""
    try:
        start_date_dt = datetime.fromisoformat(start_date)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid start_date format. Use ISO format (YYYY-MM-DD)",
        )

    tax_code = os.getenv("TAX_CODE", "TAX_CODE")

    # Get account and currency mappings
    account_map = {acc.id: acc.name for acc in await firefly_client.get_accounts()}
    currency_map = {
        curr.id: curr.code for curr in await firefly_client.get_currencies()
    }

    # Generate CSV content
    output = StringIO()
    writer = csv.writer(output)

    seen_transactions = set()
    for tr in await firefly_client.get_transactions(account_id, start_date_dt.date()):
        if tr.id in seen_transactions:
            continue
        seen_transactions.add(tr.id)

        if tr.type is TransactionType.Deposit and tr.destination_id is not None:
            writer.writerow(
                [
                    tax_code,
                    tr.date.date().isoformat(),
                    f"{tr.amount:.02f}",
                    "",
                    "",
                    "",
                    account_map[tr.destination_id],
                    currency_map[tr.currency_id],
                ]
            )
        elif (
            tr.type is TransactionType.Transfer
            and tr.foreign_amount is not None
            and tr.source_id is not None
            and tr.destination_id is not None
            and tr.foreign_currency_id is not None
        ):
            writer.writerow(
                [
                    tax_code,
                    tr.date.date().isoformat(),
                    f"{tr.amount:.02f}",
                    "",
                    "Обмін валюти",
                    "",
                    account_map[tr.source_id],
                    currency_map[tr.currency_id],
                    account_map[tr.destination_id],
                    currency_map[tr.foreign_currency_id],
                    f"{tr.foreign_amount / tr.amount:.05f}",
                ]
            )

    csv_content = output.getvalue()
    output.close()

    # Return CSV file
    headers = {
        "Content-Disposition": f'attachment; filename="taxer_statement_{account_id}_{start_date_dt.date()}.csv"'
    }
    return Response(content=csv_content, media_type="text/csv", headers=headers)


@async_collect
async def _get_transactions(
    account_id: int,
    firefly_client: FireflyClient,
    start_date: Optional[date] = None,
) -> List[Transaction]:
    """Get transactions from Firefly III for the given account and date range"""
    if start_date is None:
        start_date = date.today() - timedelta(days=365)
    for tr in await firefly_client.get_transactions(account_id, start_date):
        if tr.type is TransactionType.Transfer and tr.destination_id == account_id and tr.foreign_amount is not None:
            tr.amount, tr.foreign_amount = tr.foreign_amount, tr.amount
            tr.currency_id, tr.foreign_currency_id = tr.foreign_currency_id, tr.currency_id
        yield tr
