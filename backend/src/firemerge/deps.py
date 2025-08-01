from contextlib import asynccontextmanager
from typing import Annotated, AsyncIterator, TypedDict

from fastapi import Depends, FastAPI, Request
from aiocache import BaseCache, SimpleMemoryCache
from httpx import AsyncClient

from firemerge.firefly_client import FireflyClient


class State(TypedDict):
    http_client: AsyncClient
    firefly_client: FireflyClient
    cache: BaseCache


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[State]:
    async with AsyncClient() as client:
        firefly_client = FireflyClient.from_env(client)
        cache = SimpleMemoryCache()
        yield {"http_client": client, "firefly_client": firefly_client, "cache": cache}


def state_dependency(prop_name: str):
    def wrapper(req: Request):
        return getattr(req.state, prop_name)

    return wrapper


HttpClientDep = Annotated[AsyncClient, Depends(state_dependency("http_client"))]
FireflyClientDep = Annotated[FireflyClient, Depends(state_dependency("firefly_client"))]
