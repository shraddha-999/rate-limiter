from __future__ import annotations
"""Business logic for managing rate limit configurations.

Supports CRUD with hot-reload — no application restart required.
"""

import time
import uuid
from typing import Optional

from app.config.settings import Settings
from app.exceptions.exceptions import ConfigNotFoundException, ConfigurationException
from app.models.rate_limit import RateLimitConfig
from app.repositories.config_repository import ConfigRepository
from app.schemas.config_schema import ConfigCreateRequest, ConfigUpdateRequest
from app.utils.logger import get_logger
from app.utils.metrics import CONFIG_RELOADS

logger = get_logger(__name__)


class ConfigService:
    """Manages lifecycle of RateLimitConfig objects."""

    def __init__(self, config_repo: ConfigRepository, settings: Settings) -> None:
        self._repo = config_repo
        self._settings = settings

    async def create(self, request: ConfigCreateRequest) -> RateLimitConfig:
        expires_at: Optional[float] = None
        if request.expires_in_seconds:
            expires_at = time.time() + request.expires_in_seconds

        config = RateLimitConfig(
            id=str(uuid.uuid4()),
            identifier_type=request.identifier_type,
            identifier=request.identifier,
            algorithm=request.algorithm,
            limit=request.limit,
            window_seconds=request.window_seconds,
            burst_capacity=request.burst_capacity,
            refill_rate=request.refill_rate,
            user_tier=request.user_tier,
            endpoint=request.endpoint,
            enabled=request.enabled,
            expires_at=expires_at,
            tags=request.tags,
        )
        created = await self._repo.create(config)
        CONFIG_RELOADS.inc()
        return created

    async def get(self, config_id: str) -> RateLimitConfig:
        config = await self._repo.get(config_id)
        if config is None:
            raise ConfigNotFoundException(config_id)
        return config

    async def update(self, config_id: str, request: ConfigUpdateRequest) -> RateLimitConfig:
        config = await self._repo.get(config_id)
        if config is None:
            raise ConfigNotFoundException(config_id)

        if request.algorithm is not None:
            config.algorithm = request.algorithm
        if request.limit is not None:
            config.limit = request.limit
        if request.window_seconds is not None:
            config.window_seconds = request.window_seconds
        if request.burst_capacity is not None:
            config.burst_capacity = request.burst_capacity
        if request.refill_rate is not None:
            config.refill_rate = request.refill_rate
        if request.user_tier is not None:
            config.user_tier = request.user_tier
        if request.endpoint is not None:
            config.endpoint = request.endpoint
        if request.enabled is not None:
            config.enabled = request.enabled
        if request.expires_in_seconds is not None:
            config.expires_at = time.time() + request.expires_in_seconds
        if request.tags is not None:
            config.tags = request.tags

        updated = await self._repo.update(config)
        CONFIG_RELOADS.inc()
        return updated

    async def delete(self, config_id: str) -> None:
        deleted = await self._repo.delete(config_id)
        if not deleted:
            raise ConfigNotFoundException(config_id)

    async def list_all(self) -> list[RateLimitConfig]:
        configs = await self._repo.list_all()
        now = time.time()
        # Filter out expired configs at the service layer
        return [c for c in configs if not c.is_expired(now)]

    async def reload(self) -> int:
        """Force reload all configs from storage (hot-reload support)."""
        configs = await self._repo.list_all()
        CONFIG_RELOADS.inc()
        logger.info("Hot reload triggered", extra={"config_count": len(configs)})
        return len(configs)
