import logging
from collections.abc import Iterable, Sequence
from datetime import date, datetime, time
from decimal import Decimal, InvalidOperation
from io import BytesIO
from math import copysign
from zoneinfo import ZoneInfo

from firemerge.model.account_settings import (
    AccountSettings,
    ColumnRole,
    StatementFormatSettingsCSV,
    StatementFormatSettingsPDF,
    StatementFormatSettingsXLSX,
    StatementParserSettings,
)
from firemerge.model.api import StatementTransaction
from firemerge.model.common import Account, Currency, Money
from firemerge.statement.reader import (
    BaseStatementReader,
    CSVStatementReader,
    PDFStatementReader,
    ValueType,
    XSLXStatementReader,
)

logger = logging.getLogger("uvicorn.error")


class StatementParser:
    def __init__(
        self,
        data: BytesIO,
        account: Account,
        tz: ZoneInfo,
        settings: AccountSettings,
        primary_currency: Currency,
    ):
        self.data = data
        self.account = account
        self.tz = tz
        self.settings = settings
        self.primary_currency = primary_currency

        if self.settings.parser_settings is None:
            raise ValueError("Parser settings are required to parse statement")

        self.parser_settings: StatementParserSettings = self.settings.parser_settings

        self.header = [c.name for c in self.settings.parser_settings.columns]
        self.role_cols = {
            c.role: c for c in self.settings.parser_settings.columns if c.role
        }

    def _create_reader(self) -> BaseStatementReader:
        if isinstance(self.parser_settings.format, StatementFormatSettingsCSV):
            return CSVStatementReader(
                self.data,
                delimiter=self.parser_settings.format.separator,
                encoding=self.parser_settings.format.encoding,
            )
        if isinstance(self.parser_settings.format, StatementFormatSettingsXLSX):
            return XSLXStatementReader(self.data)
        if isinstance(self.parser_settings.format, StatementFormatSettingsPDF):
            return PDFStatementReader(self.data)
        raise ValueError("Invalid format")

    def _iter_rows(self) -> Iterable[Sequence[ValueType]]:
        found = False
        for page in self._create_reader().iter_pages():
            page_iter = iter(page)
            for row in page_iter:
                # Allow for header to be in the middle of the page
                if row == self.header:
                    yield from page_iter
                    found = True
                    break
        if not found:
            raise ValueError("No matching header found")

    def parse(self) -> Iterable[StatementTransaction]:
        for transaction in self._parse_rows(self._iter_rows()):
            if transaction.notes and any(
                b.lower() in transaction.notes.lower() for b in self.settings.blacklist
            ):
                continue
            if not transaction.amount:
                continue
            yield transaction

    def _parse_date(self, value: ValueType) -> datetime:
        if isinstance(value, datetime):
            result = value
        elif isinstance(value, date):
            result = datetime.combine(value, time.min)
        elif isinstance(value, str):
            result = datetime.strptime(value, self.parser_settings.date_format)
        else:
            raise ValueError(f"Invalid date: {value}")
        if result.tzinfo is None:
            result = result.replace(tzinfo=self.tz)
        return result

    def _parse_amount(self, value: ValueType) -> Money:
        try:
            if isinstance(value, int | float | Decimal):
                return Money(Decimal(value).quantize(Decimal("0.01")))
            if isinstance(value, str):
                if self.parser_settings.decimal_separator:
                    value = value.replace(self.parser_settings.decimal_separator, ".")
                return Money(value.replace(" ", ""))
        except InvalidOperation as e:
            raise ValueError(f"Invalid amount: {value}") from e

        raise ValueError(f"Invalid amount: {value}")

    def _parse_rows(
        self, rows: Iterable[Sequence[ValueType]]
    ) -> Iterable[StatementTransaction]:
        iban_col = self.role_cols.get(ColumnRole.IBAN)
        # prepare rows for join if doc number is present
        if join_col := self.role_cols.get(ColumnRole.DOC_NUMBER):
            assert iban_col is not None
            rows = list(rows)
            join_rows = {
                row[join_col.index]: row
                for row in rows
                if row[join_col.index] and row[iban_col.index] != self.account.iban
            }
        else:
            join_rows = None

        for row in rows:
            if iban_col and row[iban_col.index] != self.account.iban:
                continue

            if (
                join_col
                and join_rows is not None
                and (doc_number := row[join_col.index])
                and (join_row := join_rows.get(doc_number))
            ):
                yield self._parse_row(row, join_row)
            else:
                yield self._parse_row(row)

    def _get_amount(self, row: Sequence[ValueType]) -> Money:
        if amount_col := self.role_cols.get(ColumnRole.AMOUNT):
            return self._parse_amount(row[amount_col.index])

        debit = row[self.role_cols[ColumnRole.AMOUNT_DEBIT].index]
        credit = row[self.role_cols[ColumnRole.AMOUNT_CREDIT].index]
        if debit and credit:
            raise ValueError("Both debit and credit are present")
        if debit:
            return -self._parse_amount(debit)
        return self._parse_amount(credit)

    def _get_notes(self, row: Sequence[ValueType], suffix: str = "") -> list[str]:
        return [
            f"{col.notes_label}{suffix}: {value}"
            for col in self.parser_settings.columns
            if col.notes_label and (value := row[col.index])
        ]

    def _parse_row(
        self, row: Sequence[ValueType], join_row: Sequence[ValueType] | None = None
    ) -> StatementTransaction:
        amount = self._get_amount(row)
        foreign_amount = None
        foreign_currency_code = None
        transaction_date = self._parse_date(row[self.role_cols[ColumnRole.DATE].index])
        if join_row:
            join_amount = self._get_amount(join_row)
            if amount * join_amount >= 0:
                raise ValueError("Same direction")
            debit_row, credit_row = (row, join_row) if amount < 0 else (join_row, row)
            notes = self._get_notes(debit_row, " [D]") + self._get_notes(
                credit_row, " [C]"
            )
            transaction_date = min(
                transaction_date,
                self._parse_date(join_row[self.role_cols[ColumnRole.DATE].index]),
            )
            if currency_col := self.role_cols.get(ColumnRole.CURRENCY_CODE):
                if (
                    currency_code := join_row[currency_col.index]
                ) != self.primary_currency.code:
                    foreign_amount = join_amount * -1
                    foreign_currency_code = currency_code
        else:
            notes = self._get_notes(row)

        if foreign_amount is None and (
            foreign_currency_col := self.role_cols.get(ColumnRole.FOREIGN_CURRENCY_CODE)
        ):
            if (
                fc_code := row[foreign_currency_col.index]
            ) != self.primary_currency.code:
                foreign_amount = self._parse_amount(
                    row[self.role_cols[ColumnRole.FOREIGN_AMOUNT].index]
                )
                foreign_currency_code = fc_code

        return StatementTransaction(
            name=row[self.role_cols[ColumnRole.NAME].index],
            date=transaction_date,
            amount=amount,
            foreign_amount=foreign_amount and copysign(foreign_amount, amount),
            foreign_currency_code=foreign_currency_code,
            notes="\n".join(notes) if notes else None,
        )
