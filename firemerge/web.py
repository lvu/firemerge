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
from firemerge.model import StatementTransaction, Transaction


PROJECT_ROOT = os.path.realpath(os.path.join(os.path.dirname(__file__), ".."))
FRONTEND_ROOT = os.path.join(PROJECT_ROOT, "frontend")
CONFIG_PATH = os.path.join(PROJECT_ROOT, "config.toml")
FIREFLY_CLIENT = web.AppKey("ff_client", FireflyClient)
STATEMENT = web.AppKey("statement", list[StatementTransaction])
CONFIG = web.AppKey("config", tomlkit.TOMLDocument)


async def root(request: web.Request) -> web.Response:
    raise web.HTTPFound("/static/firemerge.html")


async def statement(request: web.Request) -> web.Response:
    return web.json_response([row.model_dump(mode="json") for row in request.app[STATEMENT]])


async def accounts(request: web.Request) -> web.Response:
    return web.json_response([
        row.model_dump(mode="json")
        async for row in request.app[FIREFLY_CLIENT].get_accounts()
    ])


async def categories(request: web.Request) -> web.Response:
    return web.json_response([
        row.model_dump(mode="json")
        async for row in request.app[FIREFLY_CLIENT].get_categories()
    ])


async def currencies(request: web.Request) -> web.Response:
    return web.json_response([
        row.model_dump(mode="json")
        async for row in request.app[FIREFLY_CLIENT].get_currencies()
    ])


async def transactions(request: web.Request) -> web.Response:
    return web.json_response([
        row.model_dump(mode="json")
        async for row in request.app[FIREFLY_CLIENT].get_transactions(
            int(request.query["account_id"]),
            min(tr.date for tr in request.app[STATEMENT])
        )
    ])


async def config(request: web.Request) -> web.Response:
    return web.json_response({
        "assetAccount": request.app[CONFIG].get("asset_account"),
    })


async def save_config(request: web.Request) -> web.Response:
    data = await request.json()
    request.app[CONFIG]["asset_account"] = data["assetAccount"]
    with open(CONFIG_PATH, "w") as f:
        tomlkit.dump(request.app[CONFIG], f)
    return web.Response()


def read_statement() -> Iterable[StatementTransaction]:
    with open(sys.argv[1]) as f:
        for line in f:
            yield StatementTransaction.model_validate_json(line)


def read_config() -> tomlkit.TOMLDocument:
    try:
        with open(CONFIG_PATH, "r") as f:
            return tomlkit.load(f)
    except FileNotFoundError:
        return tomlkit.TOMLDocument()


def main():
    load_dotenv()
    app = web.Application()
    app[STATEMENT] = list(read_statement())
    app[FIREFLY_CLIENT] = FireflyClient(os.getenv("FIREFLY_BASE_URL"), os.getenv("FIREFLY_TOKEN"))
    app[CONFIG] = read_config()
    app.router.add_static('/static/', path=FRONTEND_ROOT, name='static')
    app.add_routes([
        web.get('/', root),
        web.get('/transactions', transactions),
        web.get('/statement', statement),
        web.get('/accounts', accounts),
        web.get('/categories', categories),
        web.get('/currencies', currencies),
        web.get('/config', config),
        web.post('/config', save_config),
    ])
    web.run_app(app)


if __name__ == "__main__":
    main()