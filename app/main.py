from __future__ import annotations
"""FastAPI application factory and lifespan management."""

import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config.settings import get_settings
from app.controllers.config_controller import router as config_router
from app.controllers.health_controller import router as health_router
from app.controllers.rate_limit_controller import router as rate_limit_router
from app.dependencies import set_storage
from app.exceptions.exceptions import RateLimiterBaseException
from app.middleware.auth_middleware import AuthMiddleware
from app.middleware.logging_middleware import LoggingMiddleware
from app.repositories.memory_repository import MemoryRepository
from app.repositories.redis_repository import RedisRepository
from app.utils.logger import setup_logging
from app.utils.metrics import initialize_metrics


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    settings = get_settings()

    # Logging
    setup_logging(level=settings.log_level, log_format=settings.log_format)

    # Metrics
    initialize_metrics(settings.app_name, settings.app_version, settings.environment)

    # Storage
    if settings.storage_backend == "redis":
        storage = RedisRepository(
            url=settings.redis_url,
            max_connections=settings.redis_max_connections,
            socket_timeout=settings.redis_socket_timeout,
            retry_on_timeout=settings.redis_retry_on_timeout,
        )
    else:
        storage = MemoryRepository()

    set_storage(storage)

    yield

    await storage.close()


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "Production-ready distributed Rate Limiter API.\n\n"
            "Supports Fixed Window, Sliding Window, and Token Bucket algorithms "
            "backed by Redis with Prometheus metrics and hot-reload configuration."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # ── Middleware (order matters — outermost first) ───────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(AuthMiddleware)

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(rate_limit_router)
    app.include_router(config_router)
    app.include_router(health_router)

    # ── Exception handlers ────────────────────────────────────────────────────
    @app.exception_handler(RateLimiterBaseException)
    async def rate_limiter_exception_handler(
        request: Request, exc: RateLimiterBaseException
    ):
        content = {"message": exc.message}
        if hasattr(exc, "retry_after"):
            content["retry_after"] = exc.retry_after
        return JSONResponse(status_code=exc.status_code, content=content)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ):
        return JSONResponse(
            status_code=422,
            content={
                "message": "Validation error",
                "errors": exc.errors(),
            },
        )

    return app


app = create_app()
