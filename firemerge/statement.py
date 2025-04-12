from datetime import datetime
from typing import Iterable

import pdfplumber

from .model import Money, StatementTransaction

HEADER = [
    'Дата операції', 'Дата обробки операції', 'Номер картки', 'Тип операції',
    'Деталі операції', 'Сума у валюті рахунку', 'Сума у валюті операції',
    'Валюта операції', 'Вихідний залишок (у валюті рахунку)',
]

def translate(s: str) -> str:
    return s.replace("\n", " ")

def money(s: str) -> Money:
    return Money(s.replace(" ", "").replace(",", "."))

def read_statement(fname: str) -> Iterable[StatementTransaction]:
    with pdfplumber.open(fname) as pdf:
        for page in pdf.pages:
            for table in page.find_tables():
                data = [[translate(c) for c in row] for row in table.extract()]
                if data[0] == HEADER:
                    for row in data[1:]:
                        yield StatementTransaction(
                            name=row[4],
                            date=datetime.strptime(row[0], "%d.%m.%Y %H:%M"),
                            amount=money(row[5]),
                            foreign_amount=money(row[6]) if row[5] == row[6] else None,
                            foreign_currency_code=row[7] if row[5] == row[6] else None,
                            meta={"Op Type": row[3], "Description": row[4]}
                        )