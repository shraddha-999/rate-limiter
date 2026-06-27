from __future__ import annotations
"""Health and metrics endpoints."""

import time

from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from app.dependencies import get_storage_backend
from app.repositories.base_repository import BaseRepository
from app.schemas.rate_limit_schema import HealthResponse

router = APIRouter(tags=["Observability"])

_START_TIME = time.time()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Returns application health and storage connectivity status.",
)
async def health(storage: BaseRepository = Depends(get_storage_backend)):
    from app.config.settings import get_settings
    settings = get_settings()
    storage_healthy = await storage.ping()
    return HealthResponse(
        status="healthy" if storage_healthy else "degraded",
        storage_backend=settings.storage_backend,
        storage_healthy=storage_healthy,
        version=settings.app_version,
        uptime_seconds=round(time.time() - _START_TIME, 2),
    )


@router.get(
    "/metrics",
    response_class=PlainTextResponse,
    summary="Prometheus metrics",
    description="Exposes all collected Prometheus metrics in text format.",
    include_in_schema=False,
)
async def metrics():
    return PlainTextResponse(
        generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )
