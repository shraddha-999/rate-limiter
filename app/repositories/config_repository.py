from __future__ import annotations
"""Repository for persisting RateLimitConfig objects.

Configs are stored in the same storage backend (Redis or memory) under
a dedicated key prefix so they are durable and reloadable.
"""

import json
import time
import uuid
from typing import Optional

from app.models.rate_limit import Algorithm, IdentifierType, RateLimitConfig, UserTier
from app.repositories.base_repository import BaseRepository
from app.utils.logger import get_logger

logger = get_logger(__name__)

_CONFIG_PREFIX = "rl:config:"
_CONFIG_INDEX = "rl:config:__index__"


class ConfigRepository:
    """CRUD operations for RateLimitConfig, backed by BaseRepository."""

    def __init__(self, storage: BaseRepository) -> None:
        self._storage = storage

    def _config_key(self, config_id: str) -> str:
        return f"{_CONFIG_PREFIX}{config_id}"

    def _serialize(self, config: RateLimitConfig) -> dict:
        return {
            "id": config.id,
            "identifier_type": config.identifier_type.value,
            "identifier": config.identifier,
            "algorithm": config.algorithm.value,
            "limit": config.limit,
            "window_seconds": config.window_seconds,
            "burst_capacity": config.burst_capacity,
            "refill_rate": config.refill_rate,
            "user_tier": config.user_tier.value if config.user_tier else None,
            "endpoint": config.endpoint,
            "enabled": config.enabled,
            "expires_at": config.expires_at,
            "tags": config.tags,
        }

    def _deserialize(self, data: dict) -> RateLimitConfig:
        return RateLimitConfig(
            id=data["id"],
            identifier_type=IdentifierType(data["identifier_type"]),
            identifier=data["identifier"],
            algorithm=Algorithm(data["algorithm"]),
            limit=int(data["limit"]),
            window_seconds=int(data["window_seconds"]),
            burst_capacity=int(data.get("burst_capacity", 0)),
            refill_rate=float(data.get("refill_rate", 0.0)),
            user_tier=UserTier(data["user_tier"]) if data.get("user_tier") else None,
            endpoint=data.get("endpoint"),
            enabled=bool(data.get("enabled", True)),
            expires_at=data.get("expires_at"),
            tags=data.get("tags", []),
        )

    async def create(self, config: RateLimitConfig) -> RateLimitConfig:
        if not config.id:
            config.id = str(uuid.uuid4())
        key = self._config_key(config.id)
        ttl = 86400 * 365  # Store for 1 year; expiry enforced in application layer
        await self._storage.set(key, self._serialize(config), ttl)
        # Track ID in index
        await self._add_to_index(config.id)
        logger.info("Config created", extra={"config_id": config.id})
        return config

    async def get(self, config_id: str) -> Optional[RateLimitConfig]:
        data = await self._storage.get(self._config_key(config_id))
        if data is None:
            return None
        return self._deserialize(data)

    async def update(self, config: RateLimitConfig) -> RateLimitConfig:
        key = self._config_key(config.id)
        ttl = 86400 * 365
        await self._storage.set(key, self._serialize(config), ttl)
        logger.info("Config updated", extra={"config_id": config.id})
        return config

    async def delete(self, config_id: str) -> bool:
        key = self._config_key(config_id)
        existing = await self._storage.get(key)
        if existing is None:
            return False
        await self._storage.delete(key)
        await self._remove_from_index(config_id)
        logger.info("Config deleted", extra={"config_id": config_id})
        return True

    async def list_all(self) -> list[RateLimitConfig]:
        index = await self._storage.get(_CONFIG_INDEX) or {"ids": []}
        configs: list[RateLimitConfig] = []
        for config_id in index.get("ids", []):
            config = await self.get(config_id)
            if config is not None:
                configs.append(config)
        return configs

    async def _add_to_index(self, config_id: str) -> None:
        index = await self._storage.get(_CONFIG_INDEX) or {"ids": []}
        if config_id not in index["ids"]:
            index["ids"].append(config_id)
        await self._storage.set(_CONFIG_INDEX, index, 86400 * 365)

    async def _remove_from_index(self, config_id: str) -> None:
        index = await self._storage.get(_CONFIG_INDEX) or {"ids": []}
        index["ids"] = [i for i in index["ids"] if i != config_id]
        await self._storage.set(_CONFIG_INDEX, index, 86400 * 365)
