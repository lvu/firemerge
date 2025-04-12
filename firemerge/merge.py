import re
from datetime import timedelta
from typing import Optional, Tuple

from thefuzz.process import extractOne

from .model import Currency, Money, StatementTransaction, Transaction, TransactionState, TransactionType

"""
def parse_notes(notes: str) -> dict[str, str]:
    result = {}
    for line in notes.split("\n"):
        line = line.strip()
"""



def best_match(tranactions: list[Transaction], st: StatementTransaction) -> Optional[Transaction]:
    for meta_field in [
        "Description",  # maybe we'll have more at some point?
    ]:
        if (value := st.meta.get(meta_field)) is not None:
            data = {idx: tr.meta.get(meta_field, tr.description) for idx, tr in enumerate(tranactions)}
            if (best := extractOne(value, data, score_cutoff=90)) is not None:
                _, _, idx = best
                return tranactions[idx]
    return None


def match_single_transaction(tranactions: list[Transaction], st: StatementTransaction) -> Optional[Transaction]:
    candidates = [tr for tr in tranactions if abs(tr.amount) == abs(st.amount) and abs(tr.date - st.date) < timedelta(days=1)]
    if (res := best_match(candidates, st)) is not None:
        return res
    return candidates[0] if candidates else None


def parse_foreign_amount(foreign_str: str, currencies: list[Currency]) -> Tuple[Money, Currency]:
    if foreign_str is None:
        return None
    m = re.match(r"-?([\d.,]+) (.+)", foreign_str)
    return (
        Money(m.group(1).replace(",", ".")).quantize(Money("0.01")),
        next(curr for curr in currencies if curr.symbol == m.group(2))
    )


def statement_to_transaction(
    st: StatementTransaction, currencies: list[Currency], account_currency: Currency
) -> Transaction:
    foreign_currency = st.foreign_currency_code and next(
        curr for curr in currencies if curr.code == st.foreign_currency_code
    )

    return Transaction(
        id = None,
        state=TransactionState.New,
        type=TransactionType.Withdrawal if st.amount < 0 else TransactionType.Transfer,
        date=st.date,
        amount=abs(st.amount),
        description=st.name,
        currency_id=account_currency.id,
        currency_code=account_currency.code,
        foreign_amount=st.foreign_amount and abs(st.foreign_amount),
        foreign_currency_id=foreign_currency.id if foreign_currency is not None else None,
        foreign_currency_code=foreign_currency.code if foreign_currency is not None else None,
        notes=st.notes,
    )


def merge_transactions(
        transactions: list[Transaction], statement: list[StatementTransaction],
        currencies: list[Currency], account_currency: Currency
    ) -> list[Transaction]:
    transactions.sort(key=lambda tr: tr.date, reverse=True)
    transactions_to_match = transactions[:]
    result: list[Transaction] = []
    for st in statement:
        if (tr := match_single_transaction(transactions_to_match, st)) is not None:
            transactions_to_match.remove(tr)
            if tr.notes == st.notes:
                tr.state = TransactionState.Matched
            else:
                tr.notes = st.notes
                tr.state = TransactionState.Annotated
            result.append(tr)
        else:
            tr = statement_to_transaction(st, currencies, account_currency)
            if (source_tr := best_match(transactions, st)) is not None:
                tr.state = TransactionState.Enriched
                tr.type = source_tr.type
                tr.description = source_tr.description
                tr.category_id = source_tr.category_id
                tr.category_name = source_tr.category_name
                tr.source_id = source_tr.source_id
                tr.source_name = source_tr.source_name
                tr.destination_id = source_tr.destination_id
                tr.destination_name = source_tr.destination_name
            result.append(tr)
    min_date = min(st.date for st in statement) - timedelta(days=1)
    for tr in transactions_to_match:
        if tr.date >= min_date:
            result.append(tr)
    result.sort(key=lambda tr: tr.date, reverse=True)
    return result

