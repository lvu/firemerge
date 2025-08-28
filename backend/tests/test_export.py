from datetime import datetime

from firemerge.model.firefly import Transaction, TransactionType
from firemerge.model.common import Money
from firemerge.statement.export import export_statement


def test_export_statement(account_primary, account_secondary, currency_usd, currency_eur):
    account_map = {acct.id: acct.name for acct in [account_primary, account_secondary]}
    currency_map = {c.id: c.code for c in [currency_usd, currency_eur]}
    transactions = [
        Transaction(
            id=1,
            type=TransactionType.Deposit,
            date=datetime(2021, 1, 1),
            description="Deposit",
            amount=Money(150),
            currency_id=currency_usd.id,
            foreign_amount=None,
            foreign_currency_id=None,
            source_id=1024,
            destination_id=account_primary.id,
        ),
        Transaction(
            id=2,
            type=TransactionType.Transfer,
            date=datetime(2021, 1, 2),
            description="Transfer",
            amount=Money(100),
            currency_id=currency_usd.id,
            foreign_amount=Money(90),
            foreign_currency_id=currency_eur.id,
            source_id=account_primary.id,
            destination_id=account_secondary.id,
        ),
        Transaction(
            id=3,
            type=TransactionType.Withdrawal,
            date=datetime(2021, 1, 3),
            description="Withdrawal",
            amount=Money(50),
            currency_id=currency_usd.id,
            foreign_amount=None,
            foreign_currency_id=None,
            source_id=account_primary.id,
            destination_id=2048,
        ),
    ]
    content = export_statement(transactions, account_map, currency_map, "TAX_CODE")
    assert content == (
        "TAX_CODE,2021-01-01,150.00,,,,USD Account,USD\r\n"
        "TAX_CODE,2021-01-02,100.00,,Обмін валюти,,USD Account,USD,EUR Account,EUR,0.90000\r\n"
    )