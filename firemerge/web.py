import csv
import logging
import os
import os.path
from datetime import timedelta
from io import BytesIO, StringIO
from typing import Optional
from zoneinfo import ZoneInfo

import redis.asyncio as redis
from aiohttp import web
from aiohttp.multipart import BodyPartReader
from aiohttp_session import get_session, setup
from aiohttp_session.redis_storage import RedisStorage
from thefuzz.process import extract

from firemerge.firefly_client import FireflyClient
from firemerge.merge import merge_transactions
from firemerge.model import (
    Account,
    Category,
    Currency,
    DisplayTransaction,
    DisplayTransactionType,
    StatementTransaction,
    Transaction,
    TransactionType,
    TransactionState,
    TransactionUpdateResponse,
)
from firemerge.session_storage import MemoryStorage
from firemerge.statement import StatementReader

PROJECT_ROOT = os.path.realpath(os.path.join(os.path.dirname(__file__), ".."))
FRONTEND_ROOT = os.path.join(PROJECT_ROOT, "frontend")
FIREFLY_CLIENT = web.AppKey("ff_client", FireflyClient)
ACCOUNTS = web.AppKey("accounts", list[Account])
CATEGORIES = web.AppKey("categories", list[Category])
CURRENCIES = web.AppKey("currencies", list[Currency])
TRANSACTIONS = web.AppKey("transactions", dict[int, list[Transaction]])
logger = logging.getLogger(__name__)


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
                return web.HTTPBadRequest(text="No statement file provided")
            if isinstance(field, BodyPartReader) and field.name == "file":
                break

        content = BytesIO(await field.read())
        session = await get_session(request)

        # Get timezone from request parameters
        timezone_str = request.query.get("timezone", "UTC")
        try:
            tz = ZoneInfo(timezone_str)
        except Exception:
            tz = ZoneInfo("UTC")

        # Parse the statement
        try:
            statement_transactions = list(StatementReader.read(content, tz))
        except Exception as e:
            logger.exception("Failed to read statement")
            return web.HTTPBadRequest(text=str(e))

        session["statement_transactions"] = [
            tr.model_dump(mode="json") for tr in statement_transactions
        ]

        message = (
            f"Successfully uploaded statement "
            f"with {len(statement_transactions)} transactions"
        )
        return web.json_response(
            {
                "success": True,
                "message": message,
                "transaction_count": len(statement_transactions),
            }
        )

    except web.HTTPException:
        raise
    except Exception as e:
        logger.exception("Upload failed")
        raise web.HTTPInternalServerError(text=f"Upload failed: {str(e)}")


async def accounts(request: web.Request) -> web.Response:
    return web.json_response(
        [row.model_dump(mode="json") for row in request.app[ACCOUNTS]]
    )


async def categories(request: web.Request) -> web.Response:
    return web.json_response(
        [row.model_dump(mode="json") for row in request.app[CATEGORIES]]
    )


async def currencies(request: web.Request) -> web.Response:
    return web.json_response(
        [row.model_dump(mode="json") for row in request.app[CURRENCIES]]
    )


async def transactions(request: web.Request) -> web.Response:
    logger.info("transactions start")
    session = await get_session(request)
    transactions_data = [
        StatementTransaction.model_validate(tr)
        for tr in session.get("statement_transactions", [])
    ]

    if not transactions_data:
        logger.warning(
            "No statement transactions found, %s", "statement_transactions" in session
        )
        return web.HTTPNoContent()

    account_id = int(request.query["account_id"])

    # Calculate start date from statement transactions
    start_date = max(tr.date.date() for tr in transactions_data) - timedelta(days=365)

    return web.json_response(
        [
            tr.model_dump(mode="json")
            for tr in merge_transactions(
                (await _get_transactions(request.app, account_id, start_date)),
                transactions_data,
                request.app[CURRENCIES],
                account_id,
            )
        ]
    )


async def store_transaction(request: web.Request) -> web.Response:
    data = await request.json()
    account_id = data["account_id"]
    input_transaction = DisplayTransaction.model_validate(data["transaction"])
    account = next(a for a in request.app[ACCOUNTS] if a.id == account_id)
    source_name: Optional[str]
    destination_name: Optional[str]
    if input_transaction.type is DisplayTransactionType.Withdrawal:
        tr_type = TransactionType.Withdrawal
        source_id = account_id
        source_name = account.name
        destination_id = input_transaction.account_id
        destination_name = input_transaction.account_name
    elif input_transaction.type is DisplayTransactionType.TransferOut:
        tr_type = TransactionType.Transfer
        source_id = account_id
        source_name = account.name
        destination_id = input_transaction.account_id
        destination_name = input_transaction.account_name
    elif input_transaction.type is DisplayTransactionType.TransferIn:
        tr_type = TransactionType.Transfer
        source_id = input_transaction.account_id
        source_name = input_transaction.account_name
        destination_id = account_id
        destination_name = account.name
    elif input_transaction.type is DisplayTransactionType.Deposit:
        tr_type = TransactionType.Deposit
        source_id = input_transaction.account_id
        source_name = input_transaction.account_name
        destination_id = account_id
        destination_name = account.name
    else:
        raise web.HTTPBadRequest(text="Invalid transaction type")

    transaction = Transaction(
        id=None
        if input_transaction.state is TransactionState.New
        else int(input_transaction.id),
        type=tr_type,
        date=input_transaction.date,
        amount=input_transaction.amount,
        description=input_transaction.description,
        currency_id=account.currency_id,
        foreign_amount=input_transaction.foreign_amount,
        foreign_currency_id=input_transaction.foreign_currency_id,
        category_id=input_transaction.category_id,
        source_id=source_id,
        source_name=source_name if source_id is None else None,
        destination_id=destination_id,
        destination_name=destination_name if destination_id is None else None,
        notes=input_transaction.notes,
    )
    new_transaction = await request.app[FIREFLY_CLIENT].store_transaction(transaction)

    app_transactions = await _get_transactions(request.app, account_id)
    if input_transaction.state is TransactionState.New:
        app_transactions.append(new_transaction)
    else:
        idx = next(
            idx for (idx, tr) in enumerate(app_transactions) if tr.id == transaction.id
        )
        app_transactions[idx] = new_transaction
    app_transactions.sort(key=lambda tr: tr.date, reverse=True)
    response = TransactionUpdateResponse(
        transaction=new_transaction.as_display_transaction(account_id).model_copy(
            update={"state": TransactionState.Matched}
        ),
        account=None,
    )

    new_acc_id = None
    if transaction.source_id is None:
        new_acc_id = new_transaction.source_id
    if transaction.destination_id is None:
        new_acc_id = new_transaction.destination_id
    if new_acc_id is not None:
        request.app[ACCOUNTS].append(
            await request.app[FIREFLY_CLIENT].get_account(new_acc_id)
        )
        response.account = await request.app[FIREFLY_CLIENT].get_account(new_acc_id)

    return web.json_response(response.model_dump(mode="json"))


async def search_descritions(request: web.Request) -> web.Response:
    account_id = int(request.query["account_id"])
    query = request.query["query"]
    app_transactions = await _get_transactions(request.app, account_id)
    candidates = list(set(tr.as_candidate(account_id) for tr in app_transactions))
    data = {idx: tr.description for idx, tr in enumerate(candidates)}
    result = [candidates[idx] for _, _, idx in extract(query, data)]
    return web.json_response([tr.model_dump(mode="json") for tr in result])


async def clear_session(request: web.Request) -> web.Response:
    """Clear current session data"""
    session = await get_session(request)
    session.pop("statement_transactions", None)
    return web.json_response({"success": True, "message": "Session cleared"})


async def session_info(request: web.Request) -> web.Response:
    """Get current session information"""
    session = await get_session(request)
    return web.json_response(
        {
            "has_upload": bool(session.get("statement_transactions")),
            "transaction_count": len(session.get("statement_transactions", [])),
        }
    )


async def taxer_statement(request: web.Request) -> web.Response:
    """Generate taxer statement CSV for selected account"""
    account_id = int(request.query["account_id"])
    start_date_str = request.query.get("start_date")

    if not start_date_str:
        raise web.HTTPBadRequest(text="start_date parameter is required")

    from datetime import datetime

    try:
        start_date = datetime.fromisoformat(start_date_str)
    except ValueError:
        raise web.HTTPBadRequest(
            text="Invalid start_date format. Use ISO format (YYYY-MM-DD)"
        )

    tax_code = os.getenv("TAX_CODE")

    # Get account and currency mappings
    account_map = {acc.id: acc.name for acc in request.app[ACCOUNTS]}

    currency_map = {curr.id: curr.code for curr in request.app[CURRENCIES]}

    # Generate CSV content
    output = StringIO()
    writer = csv.writer(output)

    seen_transactions = set()
    async for tr in request.app[FIREFLY_CLIENT].get_transactions(
        account_id, start_date.date()
    ):
        if tr.id in seen_transactions:
            continue
        seen_transactions.add(tr.id)

        if tr.type is TransactionType.Deposit and tr.destination_id is not None:
            writer.writerow(
                [
                    tax_code,
                    tr.date.date().isoformat(),
                    f"{tr.amount:.02f}",
                    "",
                    "",
                    "",
                    account_map[tr.destination_id],
                    currency_map[tr.currency_id],
                ]
            )
        elif (
            tr.type is TransactionType.Transfer
            and tr.foreign_amount is not None
            and tr.source_id is not None
            and tr.destination_id is not None
            and tr.foreign_currency_id is not None
        ):
            writer.writerow(
                [
                    tax_code,
                    tr.date.date().isoformat(),
                    f"{tr.amount:.02f}",
                    "",
                    "Обмін валюти",
                    "",
                    account_map[tr.source_id],
                    currency_map[tr.currency_id],
                    account_map[tr.destination_id],
                    currency_map[tr.foreign_currency_id],
                    f"{tr.foreign_amount / tr.amount:.05f}",
                ]
            )

    csv_content = output.getvalue()
    output.close()

    # Return CSV file
    response = web.Response(text=csv_content, content_type="text/csv")
    response.headers["Content-Disposition"] = (
        f'attachment; filename="taxer_statement_{account_id}_{start_date.date()}.csv"'
    )
    return response


async def _get_transactions(
    app: web.Application, account_id: int, start_date=None
) -> list[Transaction]:
    """Get transactions from Firefly III for the given account and date range"""
    if account_id not in app[TRANSACTIONS]:
        from datetime import date

        if start_date is None:
            start_date = date.today() - timedelta(days=365)
        app[TRANSACTIONS][account_id] = [
            tr
            async for tr in app[FIREFLY_CLIENT].get_transactions(account_id, start_date)
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
        (
            RedisStorage(redis.from_url(redis_url))
            if (redis_url := os.getenv("REDIS_URL"))
            else MemoryStorage()
        ),
    )

    app.router.add_static("/static/", path=FRONTEND_ROOT, name="static")
    app.add_routes(
        [
            web.get("/", root),
            web.post("/api/upload", upload_statement),
            web.get("/api/transactions", transactions),
            web.post("/api/transaction", store_transaction),
            web.get("/api/accounts", accounts),
            web.get("/api/categories", categories),
            web.get("/api/currencies", currencies),
            web.get("/api/descriptions", search_descritions),
            web.post("/api/clear_session", clear_session),
            web.get("/api/session_info", session_info),
            web.get("/api/taxer_statement", taxer_statement),
        ]
    )
    app.cleanup_ctx.append(client_ctx)
    app.on_startup.append(load_refs)
    web.run_app(app, host=host, port=port)
