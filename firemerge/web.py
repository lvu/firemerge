import os
import os.path
from datetime import timedelta
from io import BytesIO

import redis.asyncio as redis
from aiohttp import web
from aiohttp.multipart import BodyPartReader
from aiohttp_session import get_session, setup
from aiohttp_session.redis_storage import RedisStorage
from thefuzz.process import extract

from firemerge.firefly_client import FireflyClient
from firemerge.merge import merge_transactions
from firemerge.model import Account, Category, Currency, StatementTransaction, Transaction
from firemerge.statement import read_statement
from firemerge.session_storage import MemoryStorage


PROJECT_ROOT = os.path.realpath(os.path.join(os.path.dirname(__file__), ".."))
FRONTEND_ROOT = os.path.join(PROJECT_ROOT, "frontend")
FIREFLY_CLIENT = web.AppKey("ff_client", FireflyClient)
ACCOUNTS = web.AppKey("accounts", list[Account])
CATEGORIES = web.AppKey("categories", list[Category])
CURRENCIES = web.AppKey("currencies", list[Currency])
TRANSACTIONS = web.AppKey("transactions", dict[int, list[Transaction]])


async def root(request: web.Request) -> web.Response:
    raise web.HTTPFound("/static/firemerge.html")


async def upload_statement(request: web.Request) -> web.Response:
    """Handle file upload for bank statement"""
    try:
        reader = await request.multipart()

        # Find the file field
        field = None
        while True:
            field = await reader.next()
            if field is None:
                raise web.HTTPBadRequest(text="No statement file provided")
            if isinstance(field, BodyPartReader) and field.name == 'statement':
                break

        # Validate file type
        if not field.filename or not field.filename.lower().endswith('.pdf'):
            raise web.HTTPBadRequest(text="Only PDF files are supported")

        content = BytesIO(await field.read())
        session = await get_session(request)

        # Parse the statement
        statement_transactions = list(read_statement(content))
        session["statement_transactions"] = statement_transactions

        return web.json_response({
            "success": True,
            "message": f"Successfully uploaded statement with {len(statement_transactions)} transactions",
            "transaction_count": len(statement_transactions),
        })

    except web.HTTPException as e:
        raise
    except Exception as e:
        raise web.HTTPInternalServerError(text=f"Upload failed: {str(e)}")


async def statement(request: web.Request) -> web.Response:
    """Get statement transactions for current session"""
    session = await get_session(request)
    if not (transactions := session.get("statement_transactions")):
        return web.HTTPNotFound()
    return web.json_response([row.model_dump(mode="json") for row in transactions])


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
    session = await get_session(request)
    transactions_data = session.get("statement_transactions")

    if not transactions_data:
        return web.HTTPNotFound()

    statement_transactions = [StatementTransaction.model_validate(tr) for tr in transactions_data]

    account_id = int(request.query["account_id"])
    account = next(acc for acc in request.app[ACCOUNTS] if acc.id == account_id)
    account_currency = next(curr for curr in request.app[CURRENCIES] if curr.id == account.currency_id)
    # Calculate start date from statement transactions
    from datetime import date
    start_date = max(tr.date.date() for tr in statement_transactions) - timedelta(days=365)

    return web.json_response([
        tr.model_dump(mode="json") for tr in merge_transactions(
            (await _get_transactions(request.app, account_id, start_date)), statement_transactions, request.app[CURRENCIES], account_currency
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


async def clear_session(request: web.Request) -> web.Response:
    """Clear current session data"""
    session = await get_session(request)
    session.pop("statement_transactions", None)
    return web.json_response({"success": True, "message": "Session cleared"})


async def session_info(request: web.Request) -> web.Response:
    """Get current session information"""
    session = await get_session(request)
    return web.json_response({
        "has_upload": bool(session.get("statement_transactions")),
        "transaction_count": len(session.get("statement_transactions", [])),
    })


async def _get_transactions(app: web.Application, account_id: int, start_date=None) -> list[Transaction]:
    """Get transactions from Firefly III for the given account and date range"""
    if account_id not in app[TRANSACTIONS]:
        from datetime import date
        if start_date is None:
            start_date = date.today() - timedelta(days=365)
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



def serve(client: FireflyClient, host: str = "0.0.0.0", port: int = 8080):
    async def client_ctx(app):
        async with client:
            app[FIREFLY_CLIENT] = client
            yield

    app = web.Application()
    app[TRANSACTIONS] = {}
    setup(
        app,
        RedisStorage(redis.from_url(redis_url)) if (redis_url := os.getenv("REDIS_URL")) else MemoryStorage()
    )

    app.router.add_static('/static/', path=FRONTEND_ROOT, name='static')
    app.add_routes([
        web.get('/', root),
        web.post('/upload', upload_statement),
        web.get('/transactions', transactions),
        web.post('/transaction', store_transaction),
        web.get('/statement', statement),
        web.get('/accounts', accounts),
        web.get('/categories', categories),
        web.get('/currencies', currencies),
        web.get('/descriptions', search_descritions),
        web.post('/clear_session', clear_session),
        web.get('/session_info', session_info),
    ])
    app.cleanup_ctx.append(client_ctx)
    app.on_startup.append(load_refs)
    web.run_app(app, host=host, port=port)