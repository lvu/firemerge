from datetime import timedelta
from hashlib import md5
from typing import Callable, Iterable, Optional, Tuple, TypeVar

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
SCORE_CUTOFF = 93

TMatch = TypeVar("TMatch", bound=Transaction | TransactionCandidate)


def best_matches(
    candidates: list[TMatch],
    query: Optional[str],
    extractor: Callable[[TMatch], Optional[str]],
    limit: int = MAX_CANDIDATES,
    score_cutoff: int = SCORE_CUTOFF,
) -> list[Tuple[TMatch, float]]:
    if query is None:
        return []
    data = {
        idx: value
        for idx, tr in enumerate(candidates)
        if (value := extractor(tr)) is not None
    }
    extracted = extractBests(query, data, limit=limit, score_cutoff=score_cutoff)
    return [(candidates[idx], score) for _, score, idx in extracted]


def deduplicate_candidates(
    candidates: Iterable[TransactionCandidate], ignore_notes: bool = False
) -> list[TransactionCandidate]:
    ignore_fields = ["date", "score"] + (["notes"] if ignore_notes else [])
    result: dict[str, TransactionCandidate] = {}
    for tr in candidates:
        key = tr.model_copy(update={f: None for f in ignore_fields}).model_dump_json()
        if key not in result:
            result[key] = tr
        elif (old_tr := result[key]).date < tr.date:
            result[key] = tr.model_copy(
                update={"score": max(tr.score or 0, old_tr.score or 0)}
            )
    return list(result.values())


def best_candidates(
    candidates: list[TransactionCandidate],
    query: Optional[str],
    extractor: Callable[[TransactionCandidate], Optional[str]],
    limit: int = MAX_CANDIDATES,
    score_cutoff: int = SCORE_CUTOFF,
) -> list[TransactionCandidate]:
    result = deduplicate_candidates(
        (
            candidate.model_copy(update={"score": score})
            for candidate, score in best_matches(
                candidates, query, extractor, limit, score_cutoff
            )
        ),
        ignore_notes=True,
    )
    result.sort(key=lambda tr: (tr.score, tr.date), reverse=True)
    return result


def match_single_transaction(
    tranactions: list[Transaction], st: StatementTransaction
) -> Optional[Transaction]:
    candidates = [
        tr
        for tr in tranactions
        if abs(tr.amount) == abs(st.amount)
        and abs(tr.date - st.date) < timedelta(days=1)
    ]
    if not candidates:
        return None
    if res := best_matches(candidates, st.notes, lambda tr: tr.notes, limit=1):
        return res[0][0]
    return candidates[0]


def merge_transactions(
    transactions: list[Transaction],
    statement: list[StatementTransaction],
    currencies: list[Currency],
    current_account_id: int,
) -> list[DisplayTransaction]:
    candidates = deduplicate_candidates(
        tr.as_candidate(current_account_id) for tr in transactions
    )
    currency_map = {curr.code: curr for curr in currencies}
    transactions.sort(key=lambda tr: tr.date, reverse=True)
    transactions_to_match = transactions[:]
    result: list[DisplayTransaction] = []
    for idx, st in enumerate(statement):
        if (tr := match_single_transaction(transactions_to_match, st)) is not None:
            transactions_to_match.remove(tr)
            result.append(
                tr.as_display_transaction(current_account_id).model_copy(
                    update={
                        "state": TransactionState.Matched
                        if tr.notes == st.notes
                        else TransactionState.Annotated,
                        "notes": st.notes,
                    }
                )
            )
        else:
            fake_id = f"fake:{idx}:{md5(st.model_dump_json().encode()).hexdigest()}"
            result.append(
                DisplayTransaction.model_validate(
                    {
                        "id": fake_id,
                        "type": DisplayTransactionType.Withdrawal
                        if st.amount < 0
                        else DisplayTransactionType.Deposit,
                        "state": TransactionState.New,
                        "description": st.name,
                        "date": st.date,
                        "amount": abs(st.amount),
                        "foreign_amount": abs(st.foreign_amount)
                        if st.foreign_amount
                        else None,
                        "foreign_currency_id": currency_map[st.foreign_currency_code].id
                        if st.foreign_currency_code
                        else None,
                        "notes": st.notes,
                        "candidates": best_candidates(
                            candidates, st.notes, lambda tr: tr.notes
                        ),
                    }
                )
            )

    min_date = min(st.date for st in statement) - timedelta(days=1)
    for tr in transactions_to_match:
        if tr.date >= min_date:
            result.append(tr.as_display_transaction(current_account_id))

    result.sort(key=lambda tr: tr.date, reverse=True)
    return result
