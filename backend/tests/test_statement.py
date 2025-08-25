from collections.abc import Iterable, Sequence
from datetime import datetime
from unittest.mock import patch
from zoneinfo import ZoneInfo

import pytest

from firemerge.model.account_settings import AccountSettings
from firemerge.model.api import StatementTransaction
from firemerge.model.common import Account, AccountType, Currency, Money
from firemerge.statement.config_repo import load_config
from firemerge.statement.parser import NewStatementParser
from firemerge.statement.reader import BaseStatementReader, ValueType


class MockReader(BaseStatementReader):
    def __init__(self, data: Sequence[Sequence[ValueType]]):
        self.mock_data = data

    def iter_pages(self) -> Iterable[Iterable[Sequence[ValueType]]]:
        yield self.mock_data


@pytest.fixture
def iban_primary():
    return "US123456789012345678901234567890"


@pytest.fixture
def iban_secondary():
    return "US543210987654321098765432109876"


@pytest.fixture
def account_primary(iban_primary):
    return Account(
        id=1,
        type=AccountType.Asset,
        name="Test Account",
        currency_id=1,
        iban=iban_primary,
    )


@pytest.fixture
def account_secondary(iban_secondary):
    return Account(
        id=2,
        type=AccountType.Asset,
        name="Test Account 2",
        currency_id=2,
        iban=iban_secondary,
    )


@pytest.fixture
def currency_usd():
    return Currency(
        id=1,
        code="USD",
        name="US Dollar",
        symbol="$",
    )


@pytest.fixture
def currency_eur():
    return Currency(
        id=2,
        code="EUR",
        name="Euro",
        symbol="€",
    )


@pytest.fixture
def utc():
    return ZoneInfo("UTC")


def test_statement_aval(account_primary, utc, currency_usd):
    reader = MockReader(
        data=[
            [
                "Дата операції",
                "Дата обробки операції",
                "Номер картки",
                "Тип операції",
                "Деталі операції",
                "Сума у валюті рахунку",
                "Сума у валюті операції",
                "Валюта операції",
                "Вихідний залишок (у валюті рахунку)",
            ],
            [  # Withdrawal, native currency
                "19.08.2025 12:00",
                "19.08.2025",
                "1234567890",
                "POS",
                "WalMart",
                "-100,00",
                "-100,00",
                "USD",
                "400,00",
            ],
            [  # Deposit, foreign currency
                "19.08.2025 10:00",
                "19.08.2025",
                "1234567890",
                "POS",
                "Uncle Joe",
                "200,00",
                "180,00",
                "EUR",
                "500,00",
            ],
        ]
    )
    aval_settings = load_config("aval_online.yaml")
    parser = NewStatementParser(
        None,
        account_primary,
        utc,
        AccountSettings(parser_settings=aval_settings),
        currency_usd,
    )
    with patch.object(parser, "_create_reader", return_value=reader):
        transactions = list(parser._parse())

    assert transactions == [
        StatementTransaction(
            name="WalMart",
            date=datetime(2025, 8, 19, 12, 0, 0, tzinfo=utc),
            amount=Money("-100.00"),
            foreign_amount=None,
            foreign_currency_code=None,
            notes="Op Type: POS\nDescription: WalMart",
        ),
        StatementTransaction(
            name="Uncle Joe",
            date=datetime(2025, 8, 19, 10, 0, 0, tzinfo=utc),
            amount=Money("200.00"),
            foreign_amount=Money("180.00"),
            foreign_currency_code="EUR",
            notes="Op Type: POS\nDescription: Uncle Joe",
        ),
    ]


@pytest.fixture
def aval_reader(iban_primary, iban_secondary):
    def satetement_row(iban, currency, date, doc_number, debit, credit, purpose):
        return [
            "--",
            "--",
            iban,
            currency,
            date,
            "--",
            "--",
            "--",
            "--",
            "--",
            "--",
            doc_number,
            "--",
            debit,
            credit,
            purpose,
            "0",
        ]

    return MockReader(
        data=[
            [
                "ЄДРПОУ",
                "МФО",
                "Рахунок",
                "Валюта",
                "Дата операції",
                "Код операції",
                "МФО банка",
                "Назва банка",
                "Рахунок кореспондента",
                "ЄДРПОУ кореспондента",
                "Кореспондент",
                "Документ",
                "Дата документа",
                "Дебет",
                "Кредит",
                "Призначення платежу",
                "Гривневе покриття",
            ],
            # Withdrawal, primary account
            satetement_row(
                iban_primary,
                "USD",
                "19.08.2025 12:00",
                "xx",
                "123.00",
                "",
                "101;Tax payment",
            ),
            # Deposit, secondary account
            satetement_row(
                iban_secondary,
                "EUR",
                "19.08.2025 10:00",
                "yy",
                "",
                "234.00",
                "FROM: ACME INC.",
            ),
            # Transfer from secondary to primary, credit
            satetement_row(
                iban_primary,
                "USD",
                "19.08.2025 09:00",
                "doc100",
                "",
                "456.00",
                "Currency sold",
            ),
            # Transfer from secondary to primary, debit
            satetement_row(
                iban_secondary,
                "EUR",
                "19.08.2025 08:00",
                "doc100",
                "345.00",
                "",
                "Selling currency",
            ),
        ]
    )


def test_statement_aval_business_primary(
    account_primary, utc, aval_reader, currency_usd, iban_primary, iban_secondary
):
    aval_settings = load_config("aval_business.yaml")
    parser = NewStatementParser(
        None,
        account_primary,
        utc,
        AccountSettings(parser_settings=aval_settings),
        currency_usd,
    )
    with patch.object(parser, "_create_reader", return_value=aval_reader):
        transactions = sorted(parser._parse(), key=lambda x: x.date, reverse=True)

    assert transactions == [
        StatementTransaction(
            name="101;Tax payment",
            date=datetime(2025, 8, 19, 12, 0, 0, tzinfo=utc),
            amount=Money("-123.00"),
            foreign_amount=None,
            foreign_currency_code=None,
            notes=f"IBAN: {iban_primary}\nDescription: 101;Tax payment",
        ),
        StatementTransaction(
            name="Currency sold",
            date=datetime(2025, 8, 19, 8, 0, 0, tzinfo=utc),
            amount=Money("456.00"),
            foreign_amount=Money("345.00"),
            foreign_currency_code="EUR",
            notes="\n".join(
                [
                    f"IBAN [D]: {iban_secondary}",
                    "Description [D]: Selling currency",
                    f"IBAN [C]: {iban_primary}",
                    "Description [C]: Currency sold",
                ]
            ),
        ),
    ]


def test_statement_aval_business_secondary(
    account_secondary, utc, aval_reader, currency_eur, iban_primary, iban_secondary
):
    aval_settings = load_config("aval_business.yaml")
    parser = NewStatementParser(
        None,
        account_secondary,
        utc,
        AccountSettings(parser_settings=aval_settings),
        currency_eur,
    )
    with patch.object(parser, "_create_reader", return_value=aval_reader):
        transactions = sorted(parser._parse(), key=lambda x: x.date, reverse=True)

    assert transactions == [
        StatementTransaction(
            name="FROM: ACME INC.",
            date=datetime(2025, 8, 19, 10, 0, 0, tzinfo=utc),
            amount=Money("234.00"),
            foreign_amount=None,
            foreign_currency_code=None,
            notes=f"IBAN: {iban_secondary}\nDescription: FROM: ACME INC.",
        ),
        StatementTransaction(
            name="Selling currency",
            date=datetime(2025, 8, 19, 8, 0, 0, tzinfo=utc),
            amount=Money("-345.00"),
            foreign_amount=Money("-456.00"),
            foreign_currency_code="USD",
            notes="\n".join(
                [
                    f"IBAN [D]: {iban_secondary}",
                    "Description [D]: Selling currency",
                    f"IBAN [C]: {iban_primary}",
                    "Description [C]: Currency sold",
                ]
            ),
        ),
    ]


def test_statement_privat(account_primary, utc, currency_usd):
    reader = MockReader(
        data=[
            [
                "Дата",
                "Категорія",
                "Картка",
                "Опис операції",
                "Сума в валюті картки",
                "Валюта картки",
                "Сума в валюті транзакції",
                "Валюта транзакції",
                "Залишок на кінець періоду",
                "Валюта залишку",
            ],
            [
                "19.08.2025 12:00:00",
                "Entertainment",
                "123***890",
                "Netflix",
                -100,
                "USD",
                -80,
                "EUR",
                400,
                "USD",
            ],
            [
                "19.08.2025 10:00:00",
                "Reimbursement",
                "123***890",
                "Uncle Joe",
                123,
                "USD",
                123,
                "USD",
                300,
                "USD",
            ],
        ]
    )
    privat_settings = load_config("privat24.yaml")
    parser = NewStatementParser(
        None,
        account_primary,
        utc,
        AccountSettings(parser_settings=privat_settings),
        currency_usd,
    )
    with patch.object(parser, "_create_reader", return_value=reader):
        transactions = list(parser._parse())

    assert transactions == [
        StatementTransaction(
            name="Netflix",
            date=datetime(2025, 8, 19, 12, 0, 0, tzinfo=utc),
            amount=Money("-100.00"),
            foreign_amount=Money("-80.00"),
            foreign_currency_code="EUR",
            notes="Category: Entertainment\nDescription: Netflix",
        ),
        StatementTransaction(
            name="Uncle Joe",
            date=datetime(2025, 8, 19, 10, 0, 0, tzinfo=utc),
            amount=Money("123.00"),
            foreign_amount=None,
            foreign_currency_code=None,
            notes="Category: Reimbursement\nDescription: Uncle Joe",
        ),
    ]
