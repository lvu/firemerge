from contextlib import asynccontextmanager
from typing import Annotated, AsyncIterator, TypedDict
from uuid import uuid4

from fastapi import Depends, FastAPI, Request
from aiocache import BaseCache, SimpleMemoryCache
from httpx import AsyncClient

from firemerge.firefly_client import FireflyClient
from firemerge.session import Session


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


def session_id(request: Request) -> str:
    session_scope = request.scope.get("session", {})
    session_id = session_scope.get("session_id")
    if session_id is None:
        session_id = uuid4().hex
        session_scope["session_id"] = session_id
        request.scope["session"] = session_scope
    return session_id


def session(
    session_id: Annotated[str, Depends(session_id)],
    cache: Annotated[BaseCache, Depends(state_dependency("cache"))],
) -> Session:
    return Session(cache, session_id)

HttpClientDep = Annotated[AsyncClient, Depends(state_dependency("http_client"))]
FireflyClientDep = Annotated[FireflyClient, Depends(state_dependency("firefly_client"))]
SessionDep = Annotated[Session, Depends(session)]
