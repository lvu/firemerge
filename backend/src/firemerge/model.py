from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Annotated, Optional

from pydantic import BaseModel, ConfigDict, PlainSerializer

Money = Annotated[
    Decimal,
    PlainSerializer(
        lambda x: str(x.quantize(Decimal("0.01"))),
        return_type=str,
        when_used="unless-none",
    ),
]


class TransactionType(Enum):
    Withdrawal = "withdrawal"
    Transfer = "transfer"
    Deposit = "deposit"
    Reconciliation = "reconciliation"


class TransactionState(Enum):
    Matched = "matched"
    Annotated = "annotated"
    Unmatched = "unmatched"
    New = "new"


class AccountType(Enum):
    Asset = "asset"
    Expense = "expense"
    Debt = "debt"
    Revenue = "revenue"
    Cash = "cash"
    Reconciliation = "reconciliation"
    InitialBalance = "initial-balance"
    Liabilities = "liabilities"


class DisplayTransactionType(Enum):
    Withdrawal = "withdrawal"
    TransferIn = "transfer-in"
    TransferOut = "transfer-out"
    Deposit = "deposit"
    Reconciliation = "reconciliation"


class AccountSettings(BaseModel):
    blacklist: list[str] = []


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
