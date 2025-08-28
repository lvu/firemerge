from zoneinfo import ZoneInfo

import pytest

from firemerge.model.common import Account, AccountType, Currency


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



@pytest.fixture
def iban_primary():
    return "US123456789012345678901234567890"


@pytest.fixture
def iban_secondary():
    return "US543210987654321098765432109876"


@pytest.fixture
def account_primary(iban_primary, currency_usd):
    return Account(
        id=1,
        type=AccountType.Asset,
        name="USD Account",
        currency_id=currency_usd.id,
        iban=iban_primary,
    )


@pytest.fixture
def account_secondary(iban_secondary, currency_eur):
    return Account(
        id=2,
        type=AccountType.Asset,
        name="EUR Account",
        currency_id=currency_eur.id,
        iban=iban_secondary,
    )