import csv
import os
from datetime import datetime
from io import StringIO
from typing import Annotated, List, Optional

from fastapi import APIRouter, Body, HTTPException, Query, Response

from firemerge.api.deps import FireflyClientDep
from firemerge.model.account_settings import AccountSettings
from firemerge.model.common import Account
from firemerge.model.firefly import TransactionType

router = APIRouter(prefix="/accounts")


@router.get("/")
async def get_accounts(firefly_client: FireflyClientDep) -> List[Account]:
    return await firefly_client.get_accounts()


@router.get("/{account_id}")
async def get_account(account_id: int, firefly_client: FireflyClientDep) -> Account:
    return await firefly_client.get_account(account_id)


@router.get("/{account_id}/settings")
async def get_account_settings(
    account_id: int,
    firefly_client: FireflyClientDep,
) -> Optional[AccountSettings]:
    return await firefly_client.get_account_settings(account_id)


@router.post("/{account_id}/settings")
async def update_account_settings(
    account_id: int,
    settings: Annotated[AccountSettings, Body(...)],
    firefly_client: FireflyClientDep,
) -> None:
    await firefly_client.update_account_settings(account_id, settings)


@router.get("/{account_id}/taxer-statement")
async def get_taxer_statement(
    account_id: int,
    start_date: Annotated[
        str, Query(..., description="Start date in ISO format (YYYY-MM-DD)")
    ],
    firefly_client: FireflyClientDep,
):
    """Generate taxer statement CSV for selected account"""
    try:
        start_date_dt = datetime.fromisoformat(start_date)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid start_date format. Use ISO format (YYYY-MM-DD)",
        )

    tax_code = os.getenv("TAX_CODE", "TAX_CODE")

    # Get account and currency mappings
    account_map = {acc.id: acc.name for acc in await firefly_client.get_accounts()}
    currency_map = {
        curr.id: curr.code for curr in await firefly_client.get_currencies()
    }

    # Generate CSV content
    output = StringIO()
    writer = csv.writer(output)

    seen_transactions = set()
    for tr in await firefly_client.get_transactions(account_id, start_date_dt.date()):
        if tr.id in seen_transactions:
            continue
        seen_transactions.add(tr.id)

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

    csv_content = output.getvalue()
    output.close()

    # Return CSV file
    fname = f"taxer_statement_{account_id}_{start_date_dt.date()}.csv"
    headers = {"Content-Disposition": f'attachment; filename="{fname}"'}
    return Response(content=csv_content, media_type="text/csv", headers=headers)
