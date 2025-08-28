from io import StringIO
from contextlib import closing
import csv

from firemerge.model.firefly import Transaction, TransactionType
from firemerge.model.account_settings import ExportSettings, ExportField, DateExportField, ExportFieldType, ConstantExportField, OtherExportField


def export_field(
    transaction: Transaction,
    account_map: dict[int, str],
    currency_map: dict[int, str],
    field: ExportField,
) -> str:
    if isinstance(field, DateExportField):
        return transaction.date.strftime(field.format)
    if isinstance(field, ConstantExportField):
        return field.value

    if field.type == ExportFieldType.AMOUNT:
        return f"{transaction.amount:.02f}"
    if field.type == ExportFieldType.CURRENCY_CODE:
        return currency_map[transaction.currency_id]
    if field.type == ExportFieldType.FOREIGN_AMOUNT:
        return f"{transaction.foreign_amount:.02f}"
    if field.type == ExportFieldType.FOREIGN_CURRENCY_CODE:
        return currency_map[transaction.foreign_currency_id]
    if field.type == ExportFieldType.SOURCE_ACCOUNT_NAME:
        return account_map[transaction.source_id]
    if field.type == ExportFieldType.DESTINATION_ACCOUNT_NAME:
        return account_map[transaction.destination_id]
    if field.type == ExportFieldType.EMPTY:
        return ""
    if field.type == ExportFieldType.EXCHANGE_RATE:
        exchange_rate = transaction.foreign_amount / transaction.amount
        return f"{exchange_rate:.05f}"
    raise ValueError(f"Unknown field type: {field.type}")


def export_transaction(
    transaction: Transaction,
    account_map: dict[int, str],
    currency_map: dict[int, str],
    fields: list[ExportField],
) -> list[str]:
    return [export_field(transaction, account_map, currency_map, field) for field in fields]


def export_statement(
    transactions: list[Transaction],
    account_map: dict[int, str],
    currency_map: dict[int, str],
    export_settings: ExportSettings,
) -> str:
    # Generate CSV content
    fields_map = {
        TransactionType.Deposit: export_settings.deposit,
        TransactionType.Withdrawal: export_settings.withdrawal,
        TransactionType.Transfer: export_settings.transfer,
    }

    output = StringIO()
    with closing(output) as output:
        writer = csv.writer(output)

        for tr in transactions:
            if (fields := fields_map.get(tr.type)) is not None:
                writer.writerow(export_transaction(tr, account_map, currency_map, fields))

        return output.getvalue()