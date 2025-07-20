from pydantic import BaseModel, NonNegativeFloat

from firemerge.model import (
    Account,
    Category,
    Currency,
    Transaction,
    StatementTransaction,
)


class SessionData(BaseModel):
    accounts: list[Account] | None = None
    categories: list[Category] | None = None
    currencies: list[Currency] | None = None
    transactions: dict[int, list[Transaction]] = {}
    statement: list[StatementTransaction] | None = None


session_data = SessionData()
