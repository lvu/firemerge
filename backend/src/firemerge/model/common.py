"""
Common models.

Includes utility models and models shared between external (frontend)
API and Firefly III client.
"""

from decimal import Decimal
from enum import Enum
from typing import Annotated, Optional

from pydantic import BaseModel, PlainSerializer

Money = Annotated[
    Decimal,
    PlainSerializer(
        lambda x: str(x.quantize(Decimal("0.01"))),
        return_type=str,
        when_used="unless-none",
    ),
]


class AccountType(Enum):
    Asset = "asset"
    Expense = "expense"
    Debt = "debt"
    Revenue = "revenue"
    Cash = "cash"
    Reconciliation = "reconciliation"
    InitialBalance = "initial-balance"
    Liabilities = "liabilities"


class Account(BaseModel):
    id: int
    type: AccountType
    currency_id: Optional[int]
    name: str
    iban: Optional[str] = None
    current_balance: Optional[Money] = None


class Category(BaseModel):
    id: int
    name: str


class Currency(BaseModel):
    id: int
    code: str
    name: str
    symbol: str
