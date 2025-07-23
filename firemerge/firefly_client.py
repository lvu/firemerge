import logging
import os
from datetime import date
from itertools import count
from time import monotonic
from typing import AsyncIterable, Optional, Self
from uuid import uuid4

from aiocache import cached
from pydantic import ValidationError
from httpx import AsyncClient, HTTPStatusError

from firemerge.model import (
    Account,
    Category,
    Currency,
    Transaction,
    TransactionState,
)
from firemerge.util import async_collect

logger = logging.getLogger("uvicorn.error")

TIMEOUT = 300
CACHE_TTL = 600
PAGE_SIZE = 1000
MAX_ACCOUNTS = 10000


class FireflyClient:
    def __init__(self, http_client: AsyncClient, base_url: str, token: str):
        self.base_url = base_url.rstrip("/")
        self.token = token
        self._client = http_client
        self.get_accounts = cached(ttl=CACHE_TTL)(self.get_accounts)  # type: ignore
        self.get_categories = cached(ttl=CACHE_TTL)(self.get_categories)  # type: ignore
        self.get_currencies = cached(ttl=CACHE_TTL)(self.get_currencies)  # type: ignore
        self.get_transactions = cached(ttl=CACHE_TTL)(  # type: ignore
            self.get_transactions
        )
        self.account_type_map: dict[str, Optional[str]] = {}

    @classmethod
    def from_env(cls, http_client: AsyncClient) -> Self:
        base_url = os.getenv("FIREFLY_BASE_URL")
        token = os.getenv("FIREFLY_TOKEN")
        if not base_url or not token:
            raise ValueError(
                "FIREFLY_BASE_URL and FIREFLY_TOKEN must be set in environment or .env file"
            )
        return cls(http_client, base_url, token)

    def clear_transactions_cache(self) -> None:
        self.get_transactions.cache.clear()  # type: ignore

    def clear_accounts_cache(self) -> None:
        self.get_accounts.cache.clear()  # type: ignore

    async def clear_cache(self) -> None:
        await self.get_accounts.cache.clear()  # type: ignore
        await self.get_categories.cache.clear()  # type: ignore
        await self.get_currencies.cache.clear()  # type: ignore
        await self.get_transactions.cache.clear()  # type: ignore

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
        logger.info(f"Requesting {url}, params: {params}, data: {json}")
        started_at = monotonic()
        assert self._client is not None
        resp = await self._client.request(
            method, url, headers=headers, params=params, json=json, timeout=TIMEOUT
        )
        if resp.status_code != 200:
            raise HTTPStatusError(
                request=resp.request, response=resp, message=resp.text
            )
        data = resp.json()
        logger.info(f"Got response for {url} in {monotonic() - started_at:0.2f}s")
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

    @async_collect
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

    @async_collect
    async def get_accounts(self) -> AsyncIterable[Account]:
        accounts = await self._request(
            "v1/autocomplete/accounts", {"limit": MAX_ACCOUNTS, "query": ""}
        )
        for account_info in accounts:
            if account_info["type"] not in self.account_type_map:
                try:
                    account = await self.get_account(account_info["id"])
                    logger.info(
                        f"Account type for {account_info['type']} is {account.type.value}; {account}"
                    )
                    self.account_type_map[account_info["type"]] = account.type.value
                except ValidationError as e:
                    # This is a workaround for the fact that some accounts are not valid
                    logger.warning(
                        f"Error getting account type for {account_info['type']}: {e}"
                    )
                    self.account_type_map[account_info["type"]] = None
            if self.account_type_map[account_info["type"]] is None:
                continue
            yield Account.model_validate(
                {**account_info, "type": self.account_type_map[account_info["type"]]}
            )

    async def get_account(self, account_id: int) -> Account:
        resp = await self._request(f"v1/accounts/{account_id}")
        return Account.model_validate(
            {**resp["data"]["attributes"], "id": resp["data"]["id"]}
        )

    @async_collect
    async def get_categories(self) -> AsyncIterable[Category]:
        async for row in self._paging_get("v1/categories"):
            yield Category(id=row["id"], name=row["attributes"]["name"])

    @async_collect
    async def get_currencies(self) -> AsyncIterable[Currency]:
        async for row in self._paging_get("v1/currencies"):
            yield Currency.model_validate({**row["attributes"], "id": row["id"]})
