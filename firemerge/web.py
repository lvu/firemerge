import os
import os.path
from datetime import timedelta

from aiohttp import web
from thefuzz.process import extract

from firemerge.firefly_client import FireflyClient
from firemerge.merge import merge_transactions
from firemerge.model import Account, Category, Currency, StatementTransaction, Transaction
from firemerge.statement import read_statement


PROJECT_ROOT = os.path.realpath(os.path.join(os.path.dirname(__file__), ".."))
FRONTEND_ROOT = os.path.join(PROJECT_ROOT, "frontend")
FIREFLY_CLIENT = web.AppKey("ff_client", FireflyClient)
STATEMENT = web.AppKey("statement", list[StatementTransaction])
ACCOUNTS = web.AppKey("accounts", list[Account])
CATEGORIES = web.AppKey("categories", list[Category])
CURRENCIES = web.AppKey("currencies", list[Currency])
TRANSACTIONS = web.AppKey("transactions", dict[int, list[Transaction]])


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
    account_id = int(request.query["account_id"])
    account = next(acc for acc in request.app[ACCOUNTS] if acc.id == account_id)
    account_currency = next(curr for curr in request.app[CURRENCIES] if curr.id == account.currency_id)
    return web.json_response([
        tr.model_dump(mode="json") for tr in merge_transactions(
            (await _get_transactions(request.app, account_id)), request.app[STATEMENT], request.app[CURRENCIES], account_currency
        )
    ])


async def store_transaction(request: web.Request) -> web.Response:
    data = await request.json()
    account_id = data["account_id"]
    transaction = Transaction.model_validate(data["transaction"])
    new_transaction = await request.app[FIREFLY_CLIENT].store_transaction(transaction)

    app_transactions = await _get_transactions(request.app, account_id)
    if transaction.id is None:
        app_transactions.append(new_transaction)
    else:
        idx = next(idx for (idx, tr) in enumerate(app_transactions) if tr.id == transaction.id)
        app_transactions[idx] = new_transaction
    app_transactions.sort(key=lambda tr: tr.date, reverse=True)

    new_acc_id = None
    if transaction.source_id is None:
        new_acc_id = new_transaction.source_id
    if transaction.destination_id is None:
        new_acc_id = new_transaction.destination_id
    if new_acc_id is not None:
        request.app[ACCOUNTS].append(await request.app[FIREFLY_CLIENT].get_account(new_acc_id))

    return web.json_response(new_transaction.model_dump(mode="json"))


async def search_descritions(request: web.Request) -> web.Response:
    account_id = int(request.query["account_id"])
    query = request.query["query"]
    app_transactions = await _get_transactions(request.app, account_id)
    descriptions = {tr.description for tr in app_transactions}
    result = extract(query, descriptions)
    return web.json_response([choice for (choice, score) in result])



async def _get_transactions(app: web.Application, account_id: int) -> list[Transaction]:
    start_date = min(tr.date for tr in app[STATEMENT]) - timedelta(days=3)
    if account_id not in app[TRANSACTIONS]:
        app[TRANSACTIONS][account_id] = [
            tr async for tr in
            app[FIREFLY_CLIENT].get_transactions(account_id, start_date)
        ]
    return app[TRANSACTIONS][account_id]


async def load_refs(app: web.Application) -> None:
    ff_client = app[FIREFLY_CLIENT]
    app[ACCOUNTS] = [x async for x in ff_client.get_accounts()]
    app[CATEGORIES] = [x async for x in ff_client.get_categories()]
    app[CURRENCIES] = [x async for x in ff_client.get_currencies()]


def serve(statement_file, client: FireflyClient):
    async def client_ctx(app):
        async with client:
            app[FIREFLY_CLIENT] = client
            yield

    app = web.Application()
    app[STATEMENT] = list(read_statement(statement_file))
    app[TRANSACTIONS] = {}
    app.router.add_static('/static/', path=FRONTEND_ROOT, name='static')
    app.add_routes([
        web.get('/', root),
        web.get('/transactions', transactions),
        web.post('/transaction', store_transaction),
        web.get('/statement', statement),
        web.get('/accounts', accounts),
        web.get('/categories', categories),
        web.get('/currencies', currencies),
        web.get('/descriptions', search_descritions),
    ])
    app.cleanup_ctx.append(client_ctx)
    app.on_startup.append(load_refs)
    web.run_app(app)