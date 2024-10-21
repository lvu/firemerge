from datetime import datetime
from decimal import Decimal
from enum import Enum
from types import NoneType
from typing import Any, get_args, get_origin, Optional, Union

from pydantic import BaseModel, Field, model_validator, model_serializer
from pydantic_core import core_schema


class Money(Decimal):

    @classmethod
    def __get_pydantic_core_schema__(cls, _, handler):
        return core_schema.no_info_after_validator_function(lambda x: cls(x).quantize(Decimal("0.01")), handler(Decimal))


class TransactionType(Enum):
    Withdrawal = "withdrawal"
    Transfer = "transfer"
    Deposit = "deposit"
    Reconciliation = "reconciliation"


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
    meta: dict[str, str]
    fee: Optional[str] = None


class Account(BaseModel):
    id: int
    type: AccountType
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
    id: int
    type: TransactionType
    date: datetime
    amount: Money
    description: str
    currency_id: int
    currency_code: str
    foreign_amount: Optional[Money]
    foreign_currency_id: Optional[int]
    foreign_currency_code: Optional[str]
    category_id: Optional[int]
    category_name: Optional[str]
    source_id: int
    source_name: str
    destination_id: int
    destination_name: str
    reconciled: bool
    notes: Optional[str]
