import csv
import logging
import os
from datetime import date, datetime, timedelta
from io import BytesIO, StringIO
from typing import Annotated, List, Optional
from zoneinfo import ZoneInfo

import redis.asyncio as redis
import uvicorn
from fastapi import (
    APIRouter,
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
    Body,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from thefuzz.process import extract

from firemerge.firefly_client import FireflyClient
from firemerge.merge import merge_transactions
from firemerge.model import (
    Account,
    Category,
    Currency,
    DisplayTransaction,
    DisplayTransactionType,
    StatementTransaction,
    Transaction,
    TransactionType,
    TransactionState,
    TransactionUpdateResponse,
)
from firemerge.statement import StatementReader
from firemerge.deps import (
    FireflyClientDep,
    SessionDataDep,
    CurrenciesDep,
    AccountsDep,
    CategoriesDep,
)
from firemerge.session import SessionData


logger = logging.getLogger("uvicorn.error")

router = APIRouter()


@router.post("/api/upload")
async def upload_statement(
    file: UploadFile,
    timezone: Annotated[str, Query(description="Client timezone")],
    session_data: SessionDataDep,
) -> None:
    """Handle file upload for bank statement"""
    try:
        content = BytesIO(await file.read())

        # Validate timezone
        try:
            tz = ZoneInfo(timezone)
        except Exception:
            tz = ZoneInfo("UTC")

        # Parse the statement
        try:
            statement_transactions = list(StatementReader.read(content, tz))
        except Exception as e:
            logger.exception("Upload failed")
            raise HTTPException(status_code=400, detail=str(e)) from e

        session_data.statement = statement_transactions

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Upload failed")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/api/accounts")
async def get_accounts(accounts: AccountsDep) -> List[Account]:
    return accounts


@router.get("/api/categories")
async def get_categories(categories: CategoriesDep) -> List[Category]:
    return categories


@router.get("/api/currencies")
async def get_currencies(currencies: CurrenciesDep) -> List[Currency]:
    return currencies


@router.get("/api/transactions")
async def get_transactions(
    account_id: Annotated[int, Query(...)],
    session_data: SessionDataDep,
    firefly_client: FireflyClientDep,
    currencies: CurrenciesDep,
) -> List[DisplayTransaction]:
    """Get merged transactions for an account"""
    logger.info("transactions start")

    transactions_data = session_data.statement

    if not transactions_data:
        logger.warning("No statement transactions found")
        raise HTTPException(status_code=204, detail="No statement transactions found")

    # Calculate start date from statement transactions
    start_date = max(tr.date.date() for tr in transactions_data) - timedelta(days=365)

    merged_transactions = merge_transactions(
        await _get_transactions(account_id, start_date, session_data, firefly_client),
        transactions_data,
        currencies,
        account_id,
    )

    return merged_transactions


@router.post("/api/transaction")
async def store_transaction(
    account_id: Annotated[int, Query(...)],
    transaction: Annotated[DisplayTransaction, Body(...)],
    session_data: SessionDataDep,
    accounts: AccountsDep,
    firefly_client: FireflyClientDep,
) -> TransactionUpdateResponse:
    """Store a transaction"""
    account = next(a for a in accounts if a.id == account_id)

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
        tr_type = TransactionType.Transfer
        source_id = account_id
        source_name = account.name
        destination_id = transaction.account_id
        destination_name = transaction.account_name
    elif transaction.type is DisplayTransactionType.TransferIn:
        tr_type = TransactionType.Transfer
        assert transaction.account_id is not None
        source_id = transaction.account_id
        source_name = transaction.account_name
        destination_id = account_id
        destination_name = account.name
    elif transaction.type is DisplayTransactionType.Deposit:
        tr_type = TransactionType.Deposit
        assert transaction.account_id is not None
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

    new_transaction = await firefly_client.store_transaction(new_transaction)

    assert account_id in session_data.transactions
    app_transactions = session_data.transactions[account_id][:]
    if transaction.state is TransactionState.New:
        app_transactions.append(new_transaction)
    else:
        idx = next(
            idx for (idx, tr) in enumerate(app_transactions) if tr.id == transaction.id
        )
        app_transactions[idx] = new_transaction
    app_transactions.sort(key=lambda tr: tr.date, reverse=True)
    session_data.transactions[account_id] = app_transactions

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
        new_account = await firefly_client.get_account(new_acc_id)
        session_data.accounts = (
            [*session_data.accounts, new_account]
            if session_data.accounts
            else [new_account]
        )
        response.account = new_account

    return response


@router.get("/api/descriptions")
async def search_descriptions(
    account_id: Annotated[int, Query(...)],
    query: Annotated[str, Query(...)],
    session_data: SessionDataDep,
    firefly_client: FireflyClientDep,
):
    """Search for transaction descriptions"""
    app_transactions = await _get_transactions(
        account_id,
        start_date=None,
        session_data=session_data,
        firefly_client=firefly_client,
    )
    candidates = list(set(tr.as_candidate(account_id) for tr in app_transactions))
    data = {idx: tr.description for idx, tr in enumerate(candidates)}
    result = [candidates[idx] for _, _, idx in extract(query, data)]
    return [tr.model_dump(mode="json") for tr in result]


@router.get("/api/taxer_statement")
async def get_taxer_statement(
    account_id: Annotated[int, Query(...)],
    start_date: Annotated[
        str, Query(..., description="Start date in ISO format (YYYY-MM-DD)")
    ],
    accounts: AccountsDep,
    currencies: CurrenciesDep,
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
    account_map = {acc.id: acc.name for acc in accounts}
    currency_map = {curr.id: curr.code for curr in currencies}

    # Generate CSV content
    output = StringIO()
    writer = csv.writer(output)

    seen_transactions = set()
    async for tr in firefly_client.get_transactions(account_id, start_date_dt.date()):
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


async def _get_transactions(
    account_id: int,
    start_date: date | None,
    session_data: SessionData,
    firefly_client: FireflyClient,
) -> List[Transaction]:
    """Get transactions from Firefly III for the given account and date range"""
    if account_id not in session_data.transactions:
        if start_date is None:
            start_date = date.today() - timedelta(days=365)
        session_data.transactions[account_id] = [
            tr async for tr in firefly_client.get_transactions(account_id, start_date)
        ]
    return session_data.transactions[account_id]
