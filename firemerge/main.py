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
    return FireflyClient(os.getenv("FIREFLY_BASE_URL"), os.getenv("FIREFLY_TOKEN"))


def async_run(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        return asyncio.run(func(*args, **kwargs))

    return wrapper


@click.group
def cli():
    pass


@cli.command
@click.argument("filename")
def merge(filename):
    logging.basicConfig(level=logging.DEBUG)
    logging.getLogger("pdfminer").setLevel(logging.ERROR)
    serve(filename, create_client())


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