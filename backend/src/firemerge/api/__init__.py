import logging
from io import BytesIO
from typing import Annotated, List
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Query, UploadFile

from firemerge.deps import FireflyClientDep
from firemerge.model.account_settings import AccountSettings
from firemerge.model.api import StatementTransaction
from firemerge.model.common import Category, Currency
from firemerge.statement.parser import StatementParser

from .accounts import api_router as accounts_api_router
from .transactions import api_router as transactions_api_router

api_router = APIRouter(prefix="/api")
api_router.include_router(accounts_api_router)
api_router.include_router(transactions_api_router)


logger = logging.getLogger("uvicorn.error")


@api_router.post("/parse_statement")
async def parse_statement(
    file: UploadFile,
    account_id: Annotated[int, Query(...)],
    timezone: Annotated[str, Query(description="Client timezone")],
    firefly_client: FireflyClientDep,
) -> list[StatementTransaction]:
    """Handle file upload for bank statement"""
    try:
        content = BytesIO(await file.read())
        account = await firefly_client.get_account(account_id)
        settings = await firefly_client.get_account_settings(account_id)
        primary_currency = next(
            c
            for c in await firefly_client.get_currencies()
            if c.id == account.currency_id
        )
        if settings is None:
            settings = AccountSettings()

        # Validate timezone
        try:
            tz = ZoneInfo(timezone)
        except Exception:
            tz = ZoneInfo("UTC")

        # Parse the statement
        try:
            return StatementParser.parse(
                content, account, settings, tz, primary_currency
            )
        except Exception as e:
            logger.exception("Parse failed")
            raise HTTPException(status_code=400, detail=str(e)) from e

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Parse failed")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@api_router.get("/categories")
async def get_categories(firefly_client: FireflyClientDep) -> List[Category]:
    return await firefly_client.get_categories()


@api_router.get("/currencies")
async def get_currencies(firefly_client: FireflyClientDep) -> List[Currency]:
    return await firefly_client.get_currencies()
