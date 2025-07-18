import logging
from datetime import date
from itertools import count
from time import monotonic
from typing import AsyncIterable, Optional, Self
from uuid import uuid4

from aiohttp import ClientResponseError, ClientSession

from firemerge.model import Account, Category, Currency, Transaction, TransactionState

logger = logging.getLogger(__name__)


class FireflyClient:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url.rstrip("/")
        self.token = token
        self._session: Optional[ClientSession] = None

    async def __aenter__(self) -> Self:
        self._session = ClientSession()
        await self._session.__aenter__()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self._session.__aexit__(exc_type, exc_val, exc_tb)

    async def _request(
        self,
        path: str,
        params: Optional[dict] = None,
        method: str = "GET",
        json: Optional[dict] = None,
    ) -> dict:
        headers = {
            "accept": "application/json",
            "Authorization": "Bearer " + self.token,
            "Content-Type": "application/json",
            "X-Trace-Id": str(uuid4()),
        }
        url = f"{self.base_url}/api/{path}"
        logger.debug(f"Requesting {url}, params: {params}, data: {json}")
        started_at = monotonic()
        assert self._session is not None
        async with self._session.request(
            method, url, headers=headers, params=params, json=json
        ) as resp:
            logger.debug(f"Got response in {monotonic() - started_at:.2}s")
            if not resp.ok:
                data = await resp.text()
                raise ClientResponseError(
                    resp.request_info,
                    resp.history,
                    status=resp.status,
                    message=f"{resp.reason}\n{data}",
                    headers=resp.headers,
                )
            started_at = monotonic()
            data = await resp.json()
            logger.debug(f"Read {len(data)} response in {monotonic() - started_at:.2}s")
            return data

    async def _paging_get(
        self, path: str, params: Optional[dict] = None
    ) -> AsyncIterable[dict]:
        params = params or {}
        page = 1
        for page in count(1):
            resp = await self._request(path, {**params, "page": page})
            for row in resp["data"]:
                yield row
            if resp["meta"]["pagination"]["total_pages"] <= page:
                break

    async def get_transactions(
        self, account_id: int, start: date
    ) -> AsyncIterable[Transaction]:
        async for row in self._paging_get(
            f"v1/accounts/{account_id}/transactions",
            {"start": start.strftime("%Y-%m-%d"), "limit": 2000},
        ):
            for trans in row["attributes"]["transactions"]:
                yield Transaction.model_validate(
                    {
                        **trans,
                        "id": row["id"],
                        "state": TransactionState.Unmatched.value,
                    }
                )

    async def store_transaction(self, transaction: Transaction) -> Transaction:
        transction_data = transaction.model_dump(mode="json", exclude_none=True)
        if transaction.id is None:
            resp = await self._request(
                "v1/transactions",
                method="POST",
                json={"transactions": [transction_data]},
            )
        else:
            resp = await self._request(
                f"v1/transactions/{transaction.id}",
                method="PUT",
                json={"transactions": [transction_data]},
            )
        resp_transactions = resp["data"]["attributes"]["transactions"]
        if len(resp_transactions) != 1:
            raise RuntimeError(f"{len(resp_transactions)} transactions returned")
        return Transaction.model_validate(
            {
                **resp_transactions[0],
                "id": resp["data"]["id"],
                "state": TransactionState.Matched.value,
            }
        )

    async def get_accounts(self) -> AsyncIterable[Account]:
        async for row in self._paging_get("v1/accounts", {"limit": 1000}):
            yield Account.model_validate({**row["attributes"], "id": row["id"]})

    async def get_account(self, account_id: int) -> Account:
        resp = await self._request(f"v1/accounts/{account_id}")
        return Account.model_validate(
            {**resp["data"]["attributes"], "id": resp["data"]["id"]}
        )

    async def get_categories(self) -> AsyncIterable[Category]:
        async for row in self._paging_get("v1/categories"):
            yield Category(id=row["id"], name=row["attributes"]["name"])

    async def get_currencies(self) -> AsyncIterable[Currency]:
        async for row in self._paging_get("v1/currencies"):
            yield Currency.model_validate({**row["attributes"], "id": row["id"]})
