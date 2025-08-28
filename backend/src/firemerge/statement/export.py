from io import StringIO
from contextlib import closing
import csv

from firemerge.model.firefly import Transaction, TransactionType


def export_statement(
    transactions: list[Transaction],
    account_map: dict[int, str],
    currency_map: dict[int, str],
    tax_code: str,
) -> str:
    # Generate CSV content
    output = StringIO()
    with closing(output) as output:
        writer = csv.writer(output)

        for tr in transactions:
            if tr.type is TransactionType.Deposit and tr.destination_id is not None:
                writer.writerow(
                    [
                        tax_code,
                        tr.date.date().isoformat(),
                        f"{tr.amount:.02f}",
                        "",
                        "",
                        "",
                        account_map[tr.destination_id],
                        currency_map[tr.currency_id],
                    ]
                )
            elif (
                tr.type is TransactionType.Transfer
                and tr.foreign_amount is not None
                and tr.source_id is not None
                and tr.destination_id is not None
                and tr.foreign_currency_id is not None
            ):
                writer.writerow(
                    [
                        tax_code,
                        tr.date.date().isoformat(),
                        f"{tr.amount:.02f}",
                        "",
                        "Обмін валюти",
                        "",
                        account_map[tr.source_id],
                        currency_map[tr.currency_id],
                        account_map[tr.destination_id],
                        currency_map[tr.foreign_currency_id],
                        f"{tr.foreign_amount / tr.amount:.05f}",
                    ]
                )

        return output.getvalue()