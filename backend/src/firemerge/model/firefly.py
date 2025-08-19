"""Firefly III client models."""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel

from .api import (
    DisplayTransaction,
    DisplayTransactionType,
    TransactionCandidate,
    TransactionState,
)
from .common import Money


class TransactionType(Enum):
    Withdrawal = "withdrawal"
    Transfer = "transfer"
    Deposit = "deposit"
    Reconciliation = "reconciliation"


class Transaction(BaseModel):
    """Firefly III transaction representation."""

    id: Optional[int]
    type: TransactionType
    date: datetime
    amount: Money
    description: str
    currency_id: int
    foreign_amount: Optional[Money]
    foreign_currency_id: Optional[int]
    category_id: Optional[int] = None
    source_id: Optional[int] = None
    source_name: Optional[str] = None
    destination_id: Optional[int] = None
    destination_name: Optional[str] = None
    reconciled: bool = False
    notes: Optional[str] = None

    def as_candidate(self, current_account_id: int) -> TransactionCandidate:
        if self.type == TransactionType.Transfer:
            if self.source_id == current_account_id:
                trans_type = DisplayTransactionType.TransferOut
                account_id = self.destination_id
            elif self.destination_id == current_account_id:
                trans_type = DisplayTransactionType.TransferIn
                account_id = self.source_id
            else:
                err_message = (
                    f"Transaction {self.id} is not related to account "
                    f"{current_account_id}"
                )
                raise ValueError(err_message)
        elif self.type == TransactionType.Withdrawal:
            trans_type = DisplayTransactionType.Withdrawal
            account_id = self.destination_id
        elif self.type == TransactionType.Deposit:
            trans_type = DisplayTransactionType.Deposit
            account_id = self.source_id
        else:
            raise ValueError(f"Unknown transaction type: {self.type}")

        return TransactionCandidate(
            description=self.description,
            date=self.date,
            type=trans_type,
            category_id=self.category_id,
            account_id=account_id,
            notes=self.notes,
        )

    def as_display_transaction(self, current_account_id: int) -> DisplayTransaction:
        return DisplayTransaction.model_validate(
            {
                **self.as_candidate(current_account_id).model_dump(),
                "id": str(self.id),
                "state": TransactionState.Unmatched,
                "date": self.date,
                "amount": self.amount,
                "foreign_amount": self.foreign_amount,
                "foreign_currency_id": self.foreign_currency_id,
            }
        )
