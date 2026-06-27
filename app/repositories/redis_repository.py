from __future__ import annotations
"""Redis-backed repository using redis-py async client.

All writes go through Lua scripts for atomicity.
Connection pooling is configured at construction time.
"""

import json
import time
from typing import Any, Optional

import redis.asyncio as aioredis
from redis.asyncio import ConnectionPool
from redis.exceptions import ConnectionError, RedisError, TimeoutError

from app.repositories.base_repository import BaseRepository
from app.exceptions.exceptions import RedisUnavailableException, StorageException
from app.utils.logger import get_logger
from app.utils.metrics import REDIS_ERRORS, REDIS_LATENCY

logger = get_logger(__name__)


class RedisRepository(BaseRepository):
    """Async Redis repository with connection pooling and error handling."""

    def __init__(
        self,
        url: str,
        max_connections: int = 50,
        socket_timeout: float = 1.0,
        retry_on_timeout: bool = True,
    ) -> None:
        self._pool = ConnectionPool.from_url(
            url,
            max_connections=max_connections,
            socket_timeout=socket_timeout,
            socket_connect_timeout=socket_timeout,
            retry_on_timeout=retry_on_timeout,
            decode_responses=True,
        )
        self._client = aioredis.Redis(connection_pool=self._pool)
        self._script_cache: dict[str, Any] = {}

    async def get(self, key: str) -> Optional[dict]:
        try:
            with REDIS_LATENCY.labels(operation="get").time():
                raw = await self._client.get(key)
            return json.loads(raw) if raw else None
        except (ConnectionError, TimeoutError) as exc:
            REDIS_ERRORS.labels(operation="get").inc()
            raise RedisUnavailableException(str(exc)) from exc
        except RedisError as exc:
            REDIS_ERRORS.labels(operation="get").inc()
            raise StorageException(str(exc)) from exc

    async def set(self, key: str, value: dict, ttl_seconds: int) -> None:
        try:
            with REDIS_LATENCY.labels(operation="set").time():
                await self._client.set(key, json.dumps(value), ex=ttl_seconds)
        except (ConnectionError, TimeoutError) as exc:
            REDIS_ERRORS.labels(operation="set").inc()
            raise RedisUnavailableException(str(exc)) from exc

    async def delete(self, key: str) -> None:
        try:
            await self._client.delete(key)
        except (ConnectionError, TimeoutError) as exc:
            REDIS_ERRORS.labels(operation="delete").inc()
            raise RedisUnavailableException(str(exc)) from exc

    async def execute_script(
        self, script: str, keys: list[str], args: list[Any]
    ) -> list[Any]:
        try:
            with REDIS_LATENCY.labels(operation="eval").time():
                # Cache compiled scripts by their source hash
                sha = await self._get_or_load_script(script)
                result = await self._client.evalsha(sha, len(keys), *keys, *args)
            return result
        except aioredis.exceptions.NoScriptError:
            # Script was evicted from Redis script cache; reload
            self._script_cache.pop(script, None)
            sha = await self._get_or_load_script(script)
            return await self._client.evalsha(sha, len(keys), *keys, *args)
        except (ConnectionError, TimeoutError) as exc:
            REDIS_ERRORS.labels(operation="eval").inc()
            raise RedisUnavailableException(str(exc)) from exc

    async def _get_or_load_script(self, script: str) -> str:
        if script not in self._script_cache:
            sha = await self._client.script_load(script)
            self._script_cache[script] = sha
        return self._script_cache[script]

    async def increment(self, key: str, ttl_seconds: int) -> int:
        try:
            pipe = self._client.pipeline()
            await pipe.incr(key)
            await pipe.expire(key, ttl_seconds)
            results = await pipe.execute()
            return int(results[0])
        except (ConnectionError, TimeoutError) as exc:
            REDIS_ERRORS.labels(operation="increment").inc()
            raise RedisUnavailableException(str(exc)) from exc

    async def ping(self) -> bool:
        try:
            return await self._client.ping()
        except Exception:
            return False

    async def keys(self, pattern: str) -> list[str]:
        try:
            # Use SCAN instead of KEYS to avoid blocking Redis
            result: list[str] = []
            async for key in self._client.scan_iter(match=pattern, count=100):
                result.append(key)
            return result
        except (ConnectionError, TimeoutError) as exc:
            REDIS_ERRORS.labels(operation="keys").inc()
            raise RedisUnavailableException(str(exc)) from exc

    async def close(self) -> None:
        await self._client.aclose()
        await self._pool.aclose()
