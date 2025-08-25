import logging
from io import BytesIO
from typing import Annotated
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.param_functions import Query

from firemerge.api.deps import FireflyClientDep
from firemerge.model.account_settings import (
    AccountSettings,
    RepoStatementParserSettings,
)
from firemerge.model.api import StatementTransaction
from firemerge.statement.config_repo import load_configs
from firemerge.statement.parser import StatementParser

logger = logging.getLogger("uvicorn.error")
router = APIRouter(prefix="/statement")


@router.post("/parse")
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


@router.get("/configs")
async def get_configs() -> list[RepoStatementParserSettings]:
    return load_configs()
