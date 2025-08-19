import logging
from abc import ABC, abstractmethod
from collections.abc import Iterable, Sequence
from datetime import datetime
from decimal import Decimal
from io import BytesIO
from typing import NamedTuple, Optional, cast
from zoneinfo import ZoneInfo

from firemerge.model import Account, AccountSettings, Money, StatementTransaction
from firemerge.statement.reader import (
    BaseStatementReader,
    CSVStatementReader,
    PDFStatementReader,
    ValueType,
    XSLXStatementReader,
)

logger = logging.getLogger("uvicorn.error")


def make_notes(meta: dict[str, str]) -> Optional[str]:
    return "\n".join(f"{k}: {v}" for k, v in meta.items()) if meta else None


class StatementParser(ABC):
    HEADER: list[str]

    def __init__(self, data: BytesIO, account: Account, tz: ZoneInfo):
        self.data = data
        self.account = account
        self.tz = tz

    @abstractmethod
    def _create_reader(self) -> BaseStatementReader:
        pass

    def _parse(self) -> Iterable[StatementTransaction]:
        for page in self._create_reader().iter_pages():
            for row in page:
                # Allow for header to be in the middle of the page
                if row == self.HEADER:
                    yield from self._parse_rows(page)
                    return
        raise ValueError("Statement not found")

    @abstractmethod
    def _parse_rows(
        self, rows: Iterable[Sequence[ValueType]]
    ) -> Iterable[StatementTransaction]:
        pass

    @classmethod
    def parse(
        cls, data: BytesIO, account: Account, settings: AccountSettings, tz: ZoneInfo
    ) -> list[StatementTransaction]:
        errors = []
        for parser_class in cls.__subclasses__():
            data.seek(0)
            try:
                return list(
                    t
                    for t in parser_class(data, account, tz)._parse()
                    if not t.notes
                    or not any(b.lower() in t.notes.lower() for b in settings.blacklist)
                )
            except Exception as e:
                errors.append(e)
        raise ExceptionGroup("Failed to parse statement", errors)


class AvalStatementParser(StatementParser):
    HEADER = [
        "Дата операції",
        "Дата обробки операції",
        "Номер картки",
        "Тип операції",
        "Деталі операції",
        "Сума у валюті рахунку",
        "Сума у валюті операції",
        "Валюта операції",
        "Вихідний залишок (у валюті рахунку)",
    ]

    @staticmethod
    def _money(s: str) -> Money:
        return Money(s.replace(" ", "").replace(",", "."))

    def _create_reader(self) -> BaseStatementReader:
        return PDFStatementReader(self.data)

    def _parse_rows(
        self, rows: Iterable[Sequence[ValueType]]
    ) -> Iterable[StatementTransaction]:
        for row in rows:
            row = cast(Sequence[str], row)
            yield StatementTransaction(
                name=row[4],
                date=datetime.strptime(row[0], "%d.%m.%Y %H:%M").replace(
                    tzinfo=self.tz
                ),
                amount=self._money(row[5]),
                foreign_amount=None if row[5] == row[6] else self._money(row[6]),
                foreign_currency_code=None if row[5] == row[6] else row[7],
                notes=make_notes({"Op Type": row[3], "Description": row[4]}),
            )


class _ABRecord(NamedTuple):
    account: str
    currency: str
    date: datetime
    doc_number: str
    amount: Optional[Money]
    purpose: str


class AvalBusinessStatementParser(StatementParser):
    HEADER = [
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
    ]

    def _create_reader(self) -> BaseStatementReader:
        return CSVStatementReader(self.data, delimiter=";", encoding="cp1251")

    def _parse_rows(
        self, rows: Iterable[Sequence[ValueType]]
    ) -> Iterable[StatementTransaction]:
        own_records = []
        other_records_map = {}
        for row in rows:
            row = cast(Sequence[str], row)
            if row[13] and row[14]:
                raise ValueError("Both debit and credit are present")
            record = _ABRecord(
                account=row[2],
                currency=row[3],
                date=datetime.strptime(row[4], "%d.%m.%Y %H:%M").replace(
                    tzinfo=self.tz
                ),
                doc_number=row[11],
                amount=-Money(row[13]) if row[13] else Money(row[14]),
                purpose=row[15],
            )
            if not record.amount:
                continue
            if record.account == self.account.iban:
                own_records.append(record)
            else:
                other_records_map[record.doc_number] = record
        own_records.sort(key=lambda x: x.date)
        for record in own_records:
            if other_record := other_records_map.get(record.doc_number):
                assert record.amount is not None
                assert other_record.amount is not None
                if record.amount * other_record.amount >= 0:
                    raise ValueError("Same direction")
                yield StatementTransaction(
                    name=record.purpose,
                    date=min(record.date, other_record.date),
                    amount=record.amount,
                    foreign_amount=other_record.amount,
                    foreign_currency_code=other_record.currency,
                    notes=make_notes(
                        {
                            "Desciption 1": record.purpose,
                            "Description 2": other_record.purpose,
                            "Account": other_record.account,
                        }
                    ),
                )
            else:
                yield StatementTransaction(
                    name=record.purpose,
                    date=record.date,
                    amount=record.amount,
                    notes=make_notes({"Description": record.purpose}),
                    foreign_amount=None,
                    foreign_currency_code=None,
                )


class PrivatStatementParser(StatementParser):
    HEADER = [
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
    ]

    @staticmethod
    def _money(s: float | int) -> Money:
        return Money(Decimal(s).quantize(Decimal("0.01")))

    def _create_reader(self) -> BaseStatementReader:
        return XSLXStatementReader(self.data)

    def _parse_rows(
        self, rows: Iterable[Sequence[ValueType]]
    ) -> Iterable[StatementTransaction]:
        for row in rows:
            assert isinstance(row[4], (float, int))
            assert isinstance(row[6], (float, int))
            yield StatementTransaction(
                name=str(row[3]),
                date=datetime.strptime(str(row[0]), "%d.%m.%Y %H:%M:%S").replace(
                    tzinfo=self.tz
                ),
                amount=self._money(row[4]),
                foreign_amount=self._money(row[6]) if row[4] == row[6] else None,
                foreign_currency_code=str(row[5]) if row[4] == row[6] else None,
                notes=make_notes({"Category": str(row[1]), "Description": str(row[3])}),
            )
