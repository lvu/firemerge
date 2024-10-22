from datetime import date
from itertools import count
from typing import NamedTuple, Optional, AsyncIterable
from uuid import uuid4

from aiohttp import ClientResponseError, ClientSession

from firemerge.model import Account, Category, Currency, Transaction, TransactionState


class FireflyClient:

    def __init__(self, base_url: str, token: str):
        self.base_url = base_url.rstrip("/")
        self.token = token
        self._session: Optional[ClientSession] = None

    @property
    def session(self) -> ClientSession:
        if self._session is None:
            self._session = ClientSession()
        return self._session

    async def _request(self, path: str, params: Optional[dict] = None) -> dict:
        headers = {
            "accept": "application/json",
            "Authorization":  "Bearer " + self.token,
            "Content-Type": "application/json",
            "X-Trace-Id": str(uuid4()),

        }
        url = f"{self.base_url}/api/{path}"
        async with self.session.request("GET", url, headers=headers, params=params) as resp:
            if not resp.ok:
                data = await resp.text()
                raise ClientResponseError(
                    resp.request_info,
                    resp.history,
                    status=resp.status,
                    message=f"{resp.reason}\n{data}",
                    headers=resp.headers,
                )
            return await resp.json()

    async def _paging_get(self, path: str, params: Optional[dict] = None) -> AsyncIterable[dict]:
        params = params or {}
        page = 1
        for page in count(1):
            resp = await self._request(path, {**params, "page": page})
            for row in resp["data"]:
                yield row
            if resp["meta"]["pagination"]["total_pages"] <= page:
                break

    async def get_transactions(self, account_id: int, start: date) -> AsyncIterable[Transaction]:
        async for row in self._paging_get(
            f"v1/accounts/{account_id}/transactions",
            {"start": start.strftime("%Y-%m-%d"), "limit": 2000}
        ):
            for trans in row["attributes"]["transactions"]:
                yield Transaction.model_validate({**trans, "id": row["id"], "state": TransactionState.Unmatched.value})

    async def get_accounts(self) -> AsyncIterable[Account]:
        async for row in self._paging_get("v1/accounts", {"limit": 1000}):
            yield Account.model_validate({**row["attributes"], "id": row["id"]})

    async def get_categories(self) -> AsyncIterable[Category]:
        async for row in self._paging_get("v1/categories"):
            yield Category(id=row["id"], name=row["attributes"]["name"])

    async def get_currencies(self) -> AsyncIterable[Currency]:
        async for row in self._paging_get("v1/currencies"):
            yield Currency.model_validate({**row["attributes"], "id": row["id"]})