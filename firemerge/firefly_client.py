from datetime import date
from typing import NamedTuple, Optional
from uuid import uuid4

from aiohttp import ClientResponseError, ClientSession

from firemerge.model import Account


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

    async def get_transactions(self, account_id: int, start: date) -> list:
        pass

    async def get_asset_accounts(self) -> list[Account]:
        resp = await self._request("v1/accounts", {"type": "asset"})
        if resp["meta"]["pagination"]["current_page"] < resp["meta"]["pagination"]["total_pages"]:
            raise RuntimeError("Paginantion not supported yet")
        return [
            Account(id=row["id"], name=row["attributes"]["name"])
            for row in resp["data"]
        ]