import asyncio
import logging
import os
from datetime import datetime
from functools import wraps

import click
from dotenv import load_dotenv

from firemerge import commands
from firemerge.firefly_client import FireflyClient
from firemerge.model import AccountType
from firemerge.web import serve


def create_client() -> FireflyClient:
    load_dotenv()
    base_url = os.getenv("FIREFLY_BASE_URL")
    token = os.getenv("FIREFLY_TOKEN")
    if not base_url or not token:
        raise ValueError("FIREFLY_BASE_URL and FIREFLY_TOKEN must be set in environment or .env file")
    return FireflyClient(base_url, token)


def async_run(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        return asyncio.run(func(*args, **kwargs))

    return wrapper


@click.group
def cli():
    pass


@cli.command
@click.option("--host", default="0.0.0.0", help="Host to bind to")
@click.option("--port", default=8080, help="Port to bind to")
def serve_web(host: str, port: int):
    """Start the web server for hosted FireMerge"""
    logging.basicConfig(level=logging.DEBUG)
    logging.getLogger("pdfminer").setLevel(logging.ERROR)
    serve(create_client(), host=host, port=port)


@cli.command
@click.argument("filename")
def merge(filename):
    """Legacy command for local file processing (deprecated)"""
    logging.basicConfig(level=logging.DEBUG)
    logging.getLogger("pdfminer").setLevel(logging.ERROR)
    print("Warning: This command is deprecated. Use 'serve-web' instead for the new hosted interface.")
    # For backward compatibility, we'll keep this but it's not the recommended approach
    from firemerge.web import serve as serve_legacy
    serve_legacy(create_client())


@cli.command
@async_run
async def accounts():
    async with create_client() as client:
        await commands.get_accounts(client)


@cli.command
@async_run
@click.argument("start_date", type=click.DateTime())
@click.argument("account_ids", type=int, nargs=-1)
async def taxer_statement(start_date: datetime, account_ids: tuple[int, ...]):
    load_dotenv()
    async with create_client() as client:
        await commands.taxer_statement(client, start_date, account_ids, os.environ["TAX_CODE"])