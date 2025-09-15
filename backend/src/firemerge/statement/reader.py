import csv
from abc import ABC, abstractmethod
from collections.abc import Iterable, Sequence
from datetime import date, datetime
from decimal import Decimal
from io import BytesIO, TextIOWrapper

import openpyxl
import pdfplumber
from openpyxl.worksheet.worksheet import Worksheet

ValueType = str | float | int | Decimal | datetime | date | bool | None


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
