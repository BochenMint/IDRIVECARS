"""FastAPI application entry point for idrivecars.pl leadgen service."""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from leadgen import __version__
from leadgen.config import settings
from leadgen.routers import dashboard, insurance, leads, media

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="idrivecars.pl Leadgen",
    description="Webhook leadów, routing ubezpieczeń i panel RODO",
    version=__version__,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(leads.router)
app.include_router(insurance.router)
app.include_router(media.router)
app.include_router(dashboard.router)


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "service": "idrivecars-leadgen",
        "version": __version__,
        "docs": "/docs",
    }
