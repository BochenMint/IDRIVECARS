"""FastAPI entry point for idrivecars.pl owner CMS."""

from __future__ import annotations

import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from cms import __version__
from cms.auth import is_authenticated
from cms.config import CMS_ROOT
from cms.routers import api, pages

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="idrivecars.pl CMS",
    description="Owner content management for tests and news",
    version=__version__,
    docs_url=None,
    redoc_url=None,
)

PUBLIC_PATHS = {"/health", "/cms/login"}
PUBLIC_PREFIXES = ("/cms/static",)


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        path = request.url.path

        if path in PUBLIC_PATHS or any(path.startswith(p) for p in PUBLIC_PREFIXES):
            return await call_next(request)

        if path == "/cms/login" and request.method == "POST":
            return await call_next(request)

        if not is_authenticated(request):
            if path.startswith("/cms/api"):
                return JSONResponse(status_code=401, content={"detail": "Wymagane logowanie"})
            return RedirectResponse(url="/cms/login", status_code=303)

        return await call_next(request)


app.add_middleware(AuthMiddleware)

static_dir = CMS_ROOT / "static"
static_dir.mkdir(exist_ok=True)
app.mount("/cms/static", StaticFiles(directory=str(static_dir)), name="cms-static")

app.include_router(pages.router)
app.include_router(api.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "idrivecars-cms", "version": __version__}


@app.get("/")
async def root() -> RedirectResponse:
    return RedirectResponse(url="/cms/", status_code=302)
