import logging
import os
from uuid import uuid4
import urllib.parse

from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
import uvicorn

from firemerge.api import router
from firemerge.deps import lifespan


PROJECT_ROOT = os.path.realpath(os.path.join(os.path.dirname(__file__), ".."))
FRONTEND_ROOT = os.path.join(PROJECT_ROOT, "frontend")


app = FastAPI(title="FireMerge API", version="1.0.0", lifespan=lifespan)
app.include_router(router)
app.add_middleware(SessionMiddleware, secret_key=os.getenv("SESSION_SECRET", uuid4().hex))


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
