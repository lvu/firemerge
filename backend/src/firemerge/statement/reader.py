import csv
from abc import ABC, abstractmethod
from collections.abc import Iterable, Sequence
from datetime import date, datetime
from decimal import Decimal
from io import BytesIO, TextIOWrapper
from logging import getLogger

import openpyxl
import pdfplumber
from openpyxl.worksheet.worksheet import Worksheet

from firemerge.model.account_settings import (
    StatementFormatSettings,
    StatementFormatSettingsCSV,
    StatementFormatSettingsPDF,
    StatementFormatSettingsXLSX,
)

ValueType = str | float | int | Decimal | datetime | date | bool | None

logger = getLogger("uvicorn.error")


class HeaderGuessError(ValueError):
    pass


class BaseStatementReader(ABC):
    def __init__(self, data: BytesIO):
        self.data = data

    @abstractmethod
    def iter_pages(self) -> Iterable[Iterable[Sequence[ValueType]]]:
        """
        Iterate over pages of the statement.

        Each page is an iterable of rows, each row is a list of strings.
        """
        pass

    def guess_header(self) -> Sequence[Sequence[ValueType]]:
        """
        Guess the header of the statement.

        Returns a list of rows, first row is the header.
        """
        for page in self.iter_pages():
            rows = list(page)
            if len(rows) >= 2:
                max_length, _, max_row_id = max(
                    (len([cell for cell in row if cell]), -i, i)
                    for i, row in enumerate(rows)
                )
                if max_length >= 3:  # There are at least 3 required columns
                    if max_row_id == len(rows) - 1:
                        raise HeaderGuessError("Possible header is the last row")
                    return rows[max_row_id:]
        raise HeaderGuessError("No possible header found")

    @classmethod
    def create(
        cls, data: BytesIO, format_settings: StatementFormatSettings
    ) -> "BaseStatementReader":
        if isinstance(format_settings, StatementFormatSettingsCSV):
            return CSVStatementReader(
                data, format_settings.separator, format_settings.encoding
            )
        elif isinstance(format_settings, StatementFormatSettingsXLSX):
            return XSLXStatementReader(data)
        elif isinstance(format_settings, StatementFormatSettingsPDF):
            return PDFStatementReader(data)
        else:
            raise ValueError("Invalid format settings")


class CSVStatementReader(BaseStatementReader):
    def __init__(self, data: BytesIO, delimiter: str = ",", encoding: str = "utf-8"):
        super().__init__(data)
        self.delimiter = delimiter
        self.encoding = encoding

    def iter_pages(self) -> Iterable[Iterable[Sequence[ValueType]]]:
        # CSV is a single page
        yield self._read_csv()

    def _read_csv(self) -> Iterable[Sequence[ValueType]]:
        reader = csv.reader(
            TextIOWrapper(self.data, encoding=self.encoding), delimiter=self.delimiter
        )
        for row in reader:
            yield row


class PDFStatementReader(BaseStatementReader):
    def iter_pages(self) -> Iterable[Iterable[Sequence[ValueType]]]:
        with pdfplumber.open(self.data) as pdf:
            for page in pdf.pages:
                for table in page.find_tables():
                    yield self._extract_table(table)

    def _extract_table(
        self, table: pdfplumber.table.Table
    ) -> Iterable[Sequence[ValueType]]:
        for row in table.extract():
            yield [cell.replace("\n", " ") if cell else None for cell in row]


class XSLXStatementReader(BaseStatementReader):
    def iter_pages(self) -> Iterable[Iterable[Sequence[ValueType]]]:
        wb = openpyxl.load_workbook(self.data, data_only=True, read_only=True)
        for sheet in wb.worksheets:
            yield self._extract_sheet(sheet)

    def _extract_sheet(self, sheet: Worksheet) -> Iterable[Sequence[ValueType]]:
        for row in sheet.iter_rows(values_only=True):
            yield [cell if isinstance(cell, ValueType) else str(cell) for cell in row]
