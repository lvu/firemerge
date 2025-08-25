import logging
from contextlib import asynccontextmanager
from typing import Annotated, AsyncIterator, TypedDict

from fastapi import Depends, FastAPI, Request
from httpx import AsyncClient
from starlette.routing import Route

from firemerge.firefly_client import FireflyClient

logger = logging.getLogger("uvicorn.error")


class State(TypedDict):
    http_client: AsyncClient
    firefly_client: FireflyClient


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[State]:
    logger.info("Known routes:")
    for route in app.routes:
        if isinstance(route, Route) and route.methods:
            logger.info(
                f"  {'/'.join(route.methods)} {route.path} "
                f"-> {route.endpoint.__qualname__}"
            )

    async with AsyncClient() as client:
        firefly_client = FireflyClient.from_env(client)
        yield {"http_client": client, "firefly_client": firefly_client}


def state_dependency(prop_name: str):
    def wrapper(req: Request):
        return getattr(req.state, prop_name)

    return wrapper


HttpClientDep = Annotated[AsyncClient, Depends(state_dependency("http_client"))]
FireflyClientDep = Annotated[FireflyClient, Depends(state_dependency("firefly_client"))]
