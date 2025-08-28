from datetime import datetime
from typing import Annotated, List, Optional

from fastapi import APIRouter, Body, HTTPException, Query, Response

from firemerge.api.deps import FireflyClientDep
from firemerge.model.account_settings import AccountSettings
from firemerge.model.common import Account
from firemerge.statement.export import export_statement

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

    account_map = {acc.id: acc.name for acc in await firefly_client.get_accounts()}
    currency_map = {
        curr.id: curr.code for curr in await firefly_client.get_currencies()
    }

    transactions = await firefly_client.get_transactions(
        account_id, start_date_dt.date()
    )
    account_settings = await firefly_client.get_account_settings(account_id)
    if account_settings is None:
        raise HTTPException(
            status_code=404,
            detail="Account settings not found",
        )
    export_settings = account_settings.export_settings
    if export_settings is None:
        raise HTTPException(
            status_code=404,
            detail="Export settings not found",
        )

    csv_content = export_statement(
        transactions, account_map, currency_map, export_settings
    )

    fname = f"firemerge_statement_{account_id}_{start_date_dt.date()}.csv"
    headers = {"Content-Disposition": f'attachment; filename="{fname}"'}
    return Response(content=csv_content, media_type="text/csv", headers=headers)
