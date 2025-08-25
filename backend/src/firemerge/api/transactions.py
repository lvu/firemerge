from datetime import date, timedelta
from typing import Annotated, AsyncIterable, List, Optional

from fastapi import APIRouter, Body, HTTPException, Query

from firemerge.api.deps import FireflyClientDep
from firemerge.firefly_client import FireflyClient
from firemerge.merge import best_candidates, deduplicate_candidates, merge_transactions
from firemerge.model.api import (
    DisplayTransaction,
    DisplayTransactionType,
    StatementTransaction,
    TransactionCandidate,
    TransactionUpdateResponse,
)
from firemerge.model.firefly import Transaction, TransactionState, TransactionType
from firemerge.util import async_collect

router = APIRouter(prefix="/transactions")


@router.post("/")
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


@router.put("/")
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
    source_id: Optional[int]
    destination_id: Optional[int]

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

    if (
        transaction.type is DisplayTransactionType.TransferIn
        and transaction.foreign_amount is not None
    ):
        assert new_transaction.foreign_currency_id is not None
        assert new_transaction.foreign_amount is not None  # mypy bug?
        new_transaction.amount, new_transaction.foreign_amount = (
            new_transaction.foreign_amount,
            new_transaction.amount,
        )
        new_transaction.currency_id, new_transaction.foreign_currency_id = (
            new_transaction.foreign_currency_id,
            new_transaction.currency_id,
        )

    new_transaction = await firefly_client.store_transaction(new_transaction)

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


@router.get("/descriptions")
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
    candidates = [c for c in candidates if query.lower() in c.description.lower()]
    return best_candidates(candidates, query, lambda tr: tr.description, score_cutoff=0)


@async_collect
async def _get_transactions(
    account_id: int,
    firefly_client: FireflyClient,
    start_date: Optional[date] = None,
) -> AsyncIterable[Transaction]:
    """Get transactions from Firefly III for the given account and date range"""
    if start_date is None:
        start_date = date.today() - timedelta(days=365)
    for tr in await firefly_client.get_transactions(account_id, start_date):
        if (
            tr.type is TransactionType.Transfer
            and tr.destination_id == account_id
            and tr.foreign_amount is not None
        ):
            tr.amount, tr.foreign_amount = tr.foreign_amount, tr.amount
            tr.currency_id, tr.foreign_currency_id = (
                tr.foreign_currency_id,
                tr.currency_id,
            )
        yield tr
