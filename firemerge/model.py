from datetime import datetime
from decimal import Decimal
from enum import Enum
from functools import cached_property
from typing import Optional

from pydantic import BaseModel
from pydantic_core import core_schema


class Money(Decimal):

    @classmethod
    def __get_pydantic_core_schema__(cls, _, handler):
        return core_schema.no_info_after_validator_function(
            lambda x: cls(x).quantize(Decimal("0.01")), handler(Decimal)
        )


class TransactionType(Enum):
    Withdrawal = "withdrawal"
    Transfer = "transfer"
    Deposit = "deposit"
    Reconciliation = "reconciliation"


class TransactionState(Enum):
    Matched = "matched"
    Annotated = "annotated"
    New = "new"
    Unmatched = "unmatched"
    Enriched = "enriched"


class AccountType(Enum):
    Asset = "asset"
    Expese = "expense"
    Debt = "debt"
    Revenue = "revenue"
    Cash = "cash"
    Reconciliation = "reconciliation"
    InitialBalance = "initial-balance"
    Liabilities = "liabilities"


class StatementTransaction(BaseModel):
    """Transaction representation as received from bank."""

    name: str
    date: datetime
    amount: Money
    foreign_amount: Optional[Money]
    foreign_currency_code: Optional[str]
    meta: dict[str, str]
    fee: Optional[str] = None

    @cached_property
    def notes(self) -> str:
        return "\n".join(f"{k}: {v}" for k, v in self.meta.items())


class Account(BaseModel):
    id: int
    type: AccountType
    currency_id: int
    name: str


class Category(BaseModel):
    id: int
    name: str


class Currency(BaseModel):
    id: int
    code: str
    name: str
    symbol: str


class Transaction(BaseModel):
    """Transaction representation as received from bank."""

    id: Optional[int]
    state: TransactionState
    type: TransactionType
    date: datetime
    amount: Money
    description: str
    currency_id: int
    currency_code: str
    foreign_amount: Optional[Money]
    foreign_currency_id: Optional[int]
    foreign_currency_code: Optional[str]
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    source_id: Optional[int] = None
    source_name: Optional[str] = None
    destination_id: Optional[int] = None
    destination_name: Optional[str] = None
    reconciled: bool = False
    notes: Optional[str] = None

    @cached_property
    def meta(self) -> dict[str, str]:
        result: dict[str, str] = {}
        if self.notes is None:
            return result

        for line in self.notes.splitlines():
            line = line.strip()
            if ":" in line:
                k, v = line.split(":", 1)
                result[k] = v
        return result
