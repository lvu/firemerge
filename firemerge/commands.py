import csv
import sys
from datetime import datetime

from firemerge.firefly_client import FireflyClient
from firemerge.model import AccountType, TransactionType

async def get_accounts(client: FireflyClient):
    async for acc in client.get_accounts():
        if acc.type is AccountType.Asset:
            print(f"{acc.id}\t{acc.name}")


async def taxer_statement(
    client: FireflyClient,
    start_date: datetime,
    account_ids: tuple[int, ...],
    tax_code: str,
):
    account_map = {
        acc.id: acc.name
        async for acc in client.get_accounts()
    }

    currency_map = {
        curr.id: curr.code
        async for curr in client.get_currencies()
    }

    writer = csv.writer(sys.stdout)

    seen_transactions = set()
    for acc_id in account_ids:
        async for tr in client.get_transactions(acc_id, start_date.date()):
            if tr.id in seen_transactions:
                continue
            seen_transactions.add(tr.id)
            if tr.type is TransactionType.Deposit:
                writer.writerow([
                    tax_code,
                    tr.date.date().isoformat(),
                    f"{tr.amount:.02f}",
                    "", "", "",
                    account_map[tr.destination_id],
                    currency_map[tr.currency_id],
                ])
            elif tr.type is TransactionType.Transfer and tr.foreign_amount is not None:
                writer.writerow([
                    tax_code,
                    tr.date.date().isoformat(),
                    f"{tr.amount:.02f}",
                    "", "Обмін валюти", "",
                    account_map[tr.source_id],
                    currency_map[tr.currency_id],
                    account_map[tr.destination_id],
                    currency_map[tr.foreign_currency_id],
                    f"{tr.foreign_amount / tr.amount:.05f}",
                ])