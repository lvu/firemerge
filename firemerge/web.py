import json
import os
import os.path
import sys
from typing import Iterable

import tomlkit
from aiohttp import web
from dotenv import load_dotenv
from pydantic import TypeAdapter

from firemerge.firefly_client import FireflyClient
from firemerge.model import Account, Category, Currency, StatementTransaction, Transaction


PROJECT_ROOT = os.path.realpath(os.path.join(os.path.dirname(__file__), ".."))
FRONTEND_ROOT = os.path.join(PROJECT_ROOT, "frontend")
FIREFLY_CLIENT = web.AppKey("ff_client", FireflyClient)
STATEMENT = web.AppKey("statement", list[StatementTransaction])
ACCOUNTS = web.AppKey("accounts", list[Account])
CATEGORIES = web.AppKey("categories", list[Category])
CURRENCIES = web.AppKey("currencies", list[Currency])


async def root(request: web.Request) -> web.Response:
    raise web.HTTPFound("/static/firemerge.html")


async def statement(request: web.Request) -> web.Response:
    return web.json_response([row.model_dump(mode="json") for row in request.app[STATEMENT]])


async def accounts(request: web.Request) -> web.Response:
    return web.json_response([
        row.model_dump(mode="json")
        for row in request.app[ACCOUNTS]
    ])


async def categories(request: web.Request) -> web.Response:
    return web.json_response([
        row.model_dump(mode="json")
        for row in request.app[CATEGORIES]
    ])


async def currencies(request: web.Request) -> web.Response:
    return web.json_response([
        row.model_dump(mode="json")
        for row in request.app[CURRENCIES]
    ])


async def transactions(request: web.Request) -> web.Response:
    return web.json_response([
        row.model_dump(mode="json")
        async for row in request.app[FIREFLY_CLIENT].get_transactions(
            int(request.query["account_id"]),
            min(tr.date for tr in request.app[STATEMENT])
        )
    ])


def read_statement() -> Iterable[StatementTransaction]:
    with open(sys.argv[1]) as f:
        for line in f:
            yield StatementTransaction.model_validate_json(line)


async def load_refs(app: web.Application) -> None:
    ff_client = app[FIREFLY_CLIENT]
    app[ACCOUNTS] = [x async for x in ff_client.get_accounts()]
    app[CATEGORIES] = [x async for x in ff_client.get_categories()]
    app[CURRENCIES] = [x async for x in ff_client.get_currencies()]


def main():
    load_dotenv()
    app = web.Application()
    app[STATEMENT] = list(read_statement())
    app[FIREFLY_CLIENT] = FireflyClient(os.getenv("FIREFLY_BASE_URL"), os.getenv("FIREFLY_TOKEN"))
    app.router.add_static('/static/', path=FRONTEND_ROOT, name='static')
    app.add_routes([
        web.get('/', root),
        web.get('/transactions', transactions),
        web.get('/statement', statement),
        web.get('/accounts', accounts),
        web.get('/categories', categories),
        web.get('/currencies', currencies),
    ])
    app.on_startup.append(load_refs)
    web.run_app(app)


if __name__ == "__main__":
    main()