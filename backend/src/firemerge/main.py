import logging
import os
import urllib.parse

import uvicorn
from fastapi import APIRouter, FastAPI
from fastapi.staticfiles import StaticFiles

from firemerge.api.accounts import router as accounts_router
from firemerge.api.common import router as common_router
from firemerge.api.deps import lifespan
from firemerge.api.statement import router as statement_router
from firemerge.api.transactions import router as transactions_router

PROJECT_ROOT = os.path.realpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..")
)
FRONTEND_ROOT = os.path.join(PROJECT_ROOT, "frontend", "dist")


api_router = APIRouter(prefix="/api")
api_router.include_router(accounts_router)
api_router.include_router(transactions_router)
api_router.include_router(common_router)
api_router.include_router(statement_router)


app = FastAPI(title="FireMerge API", version="1.0.0", lifespan=lifespan)
app.include_router(api_router)
app.mount("/", StaticFiles(directory=FRONTEND_ROOT, html=True), name="frontend")


def serve_web():
    """Start the web server for hosted FireMerge"""
    logging.basicConfig()
    logging.getLogger("firemerge").setLevel(logging.DEBUG)
    logging.getLogger("pdfminer").setLevel(logging.ERROR)
    listen_url = urllib.parse.urlparse("//" + os.getenv("LISTEN_URL", "0.0.0.0:8080"))
    assert listen_url.hostname and listen_url.port
    uvicorn.run(
        app, host=listen_url.hostname, port=int(listen_url.port), log_level="info"
    )
