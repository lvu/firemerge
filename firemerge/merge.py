from datetime import timedelta
from typing import Optional, TypeVar

from thefuzz.process import extractBests

from .model import (
    Currency,
    DisplayTransaction,
    DisplayTransactionType,
    StatementTransaction,
    Transaction,
    TransactionCandidate,
    TransactionState,
)


MAX_CANDIDATES = 10
SCORE_CUTOFF = 90

TMatch = TypeVar("TMatch", bound=Transaction | TransactionCandidate)


def meta_to_notes(meta: dict[str, str]) -> Optional[str]:
    return "\n".join(f"{k}: {v}" for k, v in meta.items()) if meta else None


def best_matches(
    candidates: list[TMatch], st: StatementTransaction
) -> list[TMatch]:
    data = {idx: tr.notes for idx, tr in enumerate(candidates)}
    extracted = extractBests(
        meta_to_notes(st.meta), data,
        limit=MAX_CANDIDATES, score_cutoff=SCORE_CUTOFF
    )
    return [candidates[idx] for _, _, idx in extracted]


def match_single_transaction(
    tranactions: list[Transaction], st: StatementTransaction
) -> Optional[Transaction]:
    candidates = [
        tr
        for tr in tranactions
        if abs(tr.amount) == abs(st.amount)
        and abs(tr.date - st.date) < timedelta(days=1)
    ]
    if res := best_matches(candidates, st):
        return res[0]
    return candidates[0] if candidates else None


def merge_transactions(
    transactions: list[Transaction],
    statement: list[StatementTransaction],
    currencies: list[Currency],
    current_account_id: int,
) -> list[DisplayTransaction]:
    candidates = list(set(tr.as_candidate(current_account_id) for tr in transactions))
    currency_map = {curr.code: curr for curr in currencies}
    transactions.sort(key=lambda tr: tr.date, reverse=True)
    transactions_to_match = transactions[:]
    result: list[DisplayTransaction] = []
    for st in statement:
        if (tr := match_single_transaction(transactions_to_match, st)) is not None:
            transactions_to_match.remove(tr)
            notes = meta_to_notes(st.meta)
            result.append(tr.as_display_transaction(current_account_id).model_copy(update={
                "state": TransactionState.Matched if tr.notes == notes else TransactionState.Annotated,
                "notes": notes,
            }))
        else:
            result.append(DisplayTransaction.model_validate({
                "type": DisplayTransactionType.Withdrawal if st.amount < 0 else DisplayTransactionType.Deposit,
                "state": TransactionState.New,
                "description": st.name,
                "date": st.date,
                "amount": abs(st.amount),
                "foreign_amount": abs(st.foreign_amount) if st.foreign_amount else None,
                "foreign_currency_id": currency_map[st.foreign_currency_code].id if st.foreign_currency_code else None,
                "notes": meta_to_notes(st.meta),
                "candidates": best_matches(candidates, st),
            }))

    min_date = min(st.date for st in statement) - timedelta(days=1)
    for tr in transactions_to_match:
        if tr.date >= min_date:
            result.append(tr.as_display_transaction(current_account_id))

    result.sort(key=lambda tr: tr.date, reverse=True)
    return result
