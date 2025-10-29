import logging
from collections.abc import Iterable, Sequence
from datetime import date, datetime, time
from decimal import Decimal, InvalidOperation
from io import BytesIO
from itertools import chain, pairwise
from math import copysign
from string import digits
from zoneinfo import ZoneInfo

from hidateinfer import infer as infer_date

from firemerge.model.account_settings import (
    AccountSettings,
    ColumnInfo,
    ColumnRole,
    GuessedStatementParserSettings,
    StatementFormatSettings,
    StatementParserSettings,
)
from firemerge.model.api import StatementTransaction
from firemerge.model.common import Account, Currency, Money
from firemerge.statement.reader import (
    BaseStatementReader,
    ValueType,
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

    def _iter_rows(self) -> Iterable[Sequence[ValueType]]:
        found = False
        assert self.settings.parser_settings is not None
        for page in BaseStatementReader.create(
            self.data, self.settings.parser_settings.format
        ).iter_pages():
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
        result = _parse_date(value, self.parser_settings.date_format)
        if result.tzinfo is None:
            result = result.replace(tzinfo=self.tz)
        return result

    def _parse_amount(self, value: ValueType) -> Money:
        return _parse_amount(value, self.parser_settings.decimal_separator)

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

        for row, next_row in pairwise(chain(rows, [None])):
            assert row is not None  # only next_row can be None
            if iban_col and row[iban_col.index] != self.account.iban:
                continue

            if (
                join_col
                and join_rows is not None
                and (doc_number := row[join_col.index])
                and (join_row := join_rows.get(doc_number))
            ):
                transaction = self._parse_row(row, join_row)
            else:
                transaction = self._parse_row(row)

            if next_row and (
                remaining_balance_col := self.role_cols.get(
                    ColumnRole.REMAINING_BALANCE
                )
            ):
                # we assume that the rows are in reverse chronological order
                next_remaining_balance = self._parse_amount(
                    next_row[remaining_balance_col.index]
                )
                remaining_balance = self._parse_amount(row[remaining_balance_col.index])
                transaction.amount = transaction.amount.copy_sign(
                    remaining_balance - next_remaining_balance
                )

            yield transaction

    def _get_amount(self, row: Sequence[ValueType]) -> Money:
        if amount_col := self.role_cols.get(ColumnRole.AMOUNT):
            result = self._parse_amount(row[amount_col.index])
        else:
            debit = row[self.role_cols[ColumnRole.AMOUNT_DEBIT].index]
            credit = row[self.role_cols[ColumnRole.AMOUNT_CREDIT].index]
            if debit and credit:
                raise ValueError("Both debit and credit are present")
            result = -self._parse_amount(debit) if debit else self._parse_amount(credit)
        if commission_col := self.role_cols.get(ColumnRole.COMMISION):
            # Probably not correct for debit/credit rows
            try:
                commission = self._parse_amount(row[commission_col.index])
            except ValueError:
                pass
            else:
                result += commission * (1 if result > 0 else -1)
        return result

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
            fc_code = row[foreign_currency_col.index]
            if fc_code and fc_code != self.primary_currency.code:
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


def guess_parser_settings(
    data: BytesIO, format_settings: StatementFormatSettings
) -> GuessedStatementParserSettings:
    def date_info(idx: int) -> tuple[str | None, float]:
        """Return the date format and the percentage of valid dates in the column."""
        values = [row[idx] for row in rows if row is not None]
        if not values:
            return None, 0
        str_values = [val for val in values if isinstance(val, str)]
        fmt = None if not str_values else infer_date(str_values)
        num_dates = 0
        for value in values:
            try:
                _parse_date(value, fmt or "%Y-%m-%d %H:%M:%S")
            except ValueError:
                pass
            else:
                num_dates += 1
        return fmt, num_dates / len(values)

    def decimal_info() -> tuple[int | None, str | None]:
        for col_idx in range(len(header)):
            values = [row[col_idx] for row in rows]
            chars = set()
            for value in values:
                if isinstance(value, str):
                    chars |= set(value)
            chars = chars - set(digits)
            decimal_separator = chars.pop() if chars else None
            for value in values:
                try:
                    _parse_amount(value, decimal_separator)
                except ValueError:
                    break
            else:
                return col_idx, decimal_separator
        return None, None

    reader = BaseStatementReader.create(data, format_settings)
    header, *rows = reader.guess_header()

    columns = [ColumnInfo(name=s, role=None, index=i) for i, s in enumerate(header)]

    # guess date column and format
    date_format = None
    (date_col_fmt, date_col_pct), date_col_idx = max(
        ((date_info(i), i) for i in range(len(header))), key=lambda x: x[0][1]
    )
    if date_col_pct > 0.5:
        date_format = date_col_fmt
        columns[date_col_idx].role = ColumnRole.DATE

    # guess amount column and decimal separator
    amount_col_idx, decimal_separator = decimal_info()
    if amount_col_idx is not None:
        columns[amount_col_idx].role = ColumnRole.AMOUNT

    return GuessedStatementParserSettings(
        date_format=date_format or "%Y-%m-%d %H:%M:%S",
        decimal_separator=decimal_separator,
        columns=columns,
        format=format_settings,
    )


def _parse_date(value: ValueType, date_format: str) -> datetime:
    if isinstance(value, datetime):
        result = value
    elif isinstance(value, date):
        result = datetime.combine(value, time.min)
    elif isinstance(value, str):
        result = datetime.strptime(value, date_format)
    else:
        raise ValueError(f"Invalid date: {value}")
    return result


def _parse_amount(value: ValueType, decimal_separator: str | None) -> Money:
    try:
        if isinstance(value, int | float | Decimal):
            return Money(Decimal(value).quantize(Decimal("0.01")))
        if isinstance(value, str):
            if decimal_separator:
                value = value.replace(decimal_separator, ".")
            return Money(value.replace(" ", ""))
    except InvalidOperation as e:
        raise ValueError(f"Invalid amount: {value}") from e

    raise ValueError(f"Invalid amount: {value}")
