import logging
from io import BytesIO
from typing import Annotated
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Form, HTTPException, UploadFile
from fastapi.param_functions import Query
from pydantic import TypeAdapter, ValidationError

from firemerge.api.deps import FireflyClientDep
from firemerge.model.account_settings import (
    GuessedStatementParserSettings,
    RepoStatementParserSettings,
    StatementFormatSettings,
)
from firemerge.model.api import StatementTransaction
from firemerge.statement.config_repo import load_configs
from firemerge.statement.parser import StatementParser, guess_parser_settings

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

        if settings is None or settings.parser_settings is None:
            raise HTTPException(status_code=400, detail="Account settings not found")

        # Validate timezone
        try:
            tz = ZoneInfo(timezone)
        except Exception:
            logger.warning("Invalid timezone %s, using UTC", timezone, exc_info=True)
            tz = ZoneInfo("UTC")

        # Parse the statement
        try:
            parser = StatementParser(content, account, tz, settings, primary_currency)
            return list(parser.parse())
        except Exception as e:
            logger.exception("Parse failed")
            raise HTTPException(status_code=400, detail=str(e)) from e

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Parse failed")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/guess-parser-settings")
async def guess_parser_settings_endpoint(
    file: Annotated[UploadFile, Form(...)],
    format_settings_str: Annotated[
        str, Form(description="JSON format settings", alias="format_settings")
    ],
) -> GuessedStatementParserSettings:
    content = BytesIO(await file.read())
    try:
        format_settings: StatementFormatSettings = TypeAdapter(
            StatementFormatSettings
        ).validate_json(format_settings_str)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.errors()) from e
    try:
        return guess_parser_settings(content, format_settings)
    except Exception as e:
        logger.exception("Guess config failed", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/configs")
async def get_configs() -> list[RepoStatementParserSettings]:
    return load_configs()
