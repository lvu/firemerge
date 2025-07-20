import os
from contextlib import asynccontextmanager
from typing import Annotated, AsyncIterator, TypedDict

from fastapi import Depends, FastAPI, Request
from httpx import AsyncClient

from firemerge.model import Account, Category, Currency
from firemerge.firefly_client import FireflyClient
from firemerge.session import SessionData, session_data


class State(TypedDict):
    http_client: AsyncClient


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[State]:
    async with AsyncClient() as client:
        yield {"http_client": client}


def get_http_client(request: Request) -> AsyncClient:
    return request.state.http_client


HttpClientDep = Annotated[AsyncClient, Depends(get_http_client)]


def get_firefly_client(http_client: HttpClientDep) -> FireflyClient:
    base_url = os.getenv("FIREFLY_BASE_URL")
    token = os.getenv("FIREFLY_TOKEN")
    if not base_url or not token:
        raise ValueError(
            "FIREFLY_BASE_URL and FIREFLY_TOKEN must be set in environment or .env file"
        )
    return FireflyClient(http_client, base_url, token)


def get_session_data(request: Request) -> SessionData:
    return session_data


FireflyClientDep = Annotated[FireflyClient, Depends(get_firefly_client)]
SessionDataDep = Annotated[SessionData, Depends(get_session_data)]


async def get_currencies(
    session_data: SessionDataDep, firefly_client: FireflyClientDep
) -> list[Currency]:
    if session_data.currencies is None:
        session_data.currencies = [x async for x in firefly_client.get_currencies()]
    return session_data.currencies


async def get_accounts(
    session_data: SessionDataDep, firefly_client: FireflyClientDep
) -> list[Account]:
    if session_data.accounts is None:
        session_data.accounts = [x async for x in firefly_client.get_accounts()]
    return session_data.accounts


async def get_categories(
    session_data: SessionDataDep, firefly_client: FireflyClientDep
) -> list[Category]:
    if session_data.categories is None:
        session_data.categories = [x async for x in firefly_client.get_categories()]
    return session_data.categories


AccountsDep = Annotated[list[Account], Depends(get_accounts)]
CategoriesDep = Annotated[list[Category], Depends(get_categories)]
CurrenciesDep = Annotated[list[Currency], Depends(get_currencies)]
