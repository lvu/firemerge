"""API models."""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict

from .common import Account, Money


class TransactionState(Enum):
    Matched = "matched"
    Annotated = "annotated"
    Unmatched = "unmatched"
    New = "new"


class DisplayTransactionType(Enum):
    Withdrawal = "withdrawal"
    TransferIn = "transfer-in"
    TransferOut = "transfer-out"
    Deposit = "deposit"
    Reconciliation = "reconciliation"


class TransactionCandidate(BaseModel):
    model_config = ConfigDict(frozen=True)
    description: str
    date: datetime
    type: DisplayTransactionType
    category_id: Optional[int] = None
    account_id: Optional[int] = None
    score: Optional[float] = None
    notes: Optional[str] = None


class DisplayTransaction(BaseModel):
    id: str
    type: DisplayTransactionType
    state: TransactionState
    description: str
    date: datetime
    amount: Money
    foreign_amount: Optional[Money]
    foreign_currency_id: Optional[int]
    account_id: Optional[int] = None
    account_name: Optional[str] = None  # for input only
    category_id: Optional[int] = None
    notes: Optional[str] = None
    candidates: list[TransactionCandidate] = []  # for output only


class StatementTransaction(BaseModel):
    """Transaction representation as received from bank."""

    name: str
    date: datetime
    amount: Money
    foreign_amount: Optional[Money]
    foreign_currency_code: Optional[str]
    notes: Optional[str] = None
    fee: Optional[str] = None


class TransactionUpdateResponse(BaseModel):
    """Response from Firefly III when updating a transaction."""

    transaction: DisplayTransaction
    account: Optional[Account]
