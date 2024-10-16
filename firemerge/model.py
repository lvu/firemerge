from datetime import datetime
from decimal import Decimal
from enum import Enum
from types import NoneType
from typing import Any, get_args, get_origin, Optional, Union

from pydantic import BaseModel, Field, model_validator, model_serializer


class StatementTransaction(BaseModel):
    """Transaction representation as received from bank."""
    name: str
    date: datetime
    amount: Decimal
    meta: dict[str, str]
    fee: Optional[str] = None


class Account(BaseModel):
    id: int
    name: str


class Currency(BaseModel):
    id: int
    code: str


class TransactionType(Enum):
    withdrawal = "withdrawal"
    transfer = "transfer"
    deposit = "deposit"
    reconciliation = "reconciliation"


class Transaction(BaseModel):
    """Transaction representation as received from bank."""
    type: TransactionType
    date: datetime
    amount: Decimal
    description: str
    currency_id: int
    currency_code: str
    foreign_amount: Optional[Decimal]
    foreign_currency_id: Optional[int]
    foreign_currency_code: Optional[str]
    category_id: Optional[int]
    category_name: Optional[str]
    source_id: int
    source_name: str
    destination_id: int
    destination_name: str
    reconciled: bool
    notes: str
