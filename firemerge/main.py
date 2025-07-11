import logging
import os
import urllib.parse

from firemerge.firefly_client import FireflyClient
from firemerge.web import serve


def create_client() -> FireflyClient:
    base_url = os.getenv("FIREFLY_BASE_URL")
    token = os.getenv("FIREFLY_TOKEN")
    if not base_url or not token:
        raise ValueError(
            "FIREFLY_BASE_URL and FIREFLY_TOKEN must be set in environment or .env file"
        )
    return FireflyClient(base_url, token)


def serve_web():
    """Start the web server for hosted FireMerge"""
    logging.basicConfig(level=logging.DEBUG)
    logging.getLogger("pdfminer").setLevel(logging.ERROR)
    listen_url = urllib.parse.urlparse("//" + os.getenv("LISTEN_URL", "0.0.0.0:8080"))
    assert listen_url.hostname and listen_url.port
    serve(create_client(), host=listen_url.hostname, port=int(listen_url.port))
