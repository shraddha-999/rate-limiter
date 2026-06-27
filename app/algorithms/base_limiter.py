from __future__ import annotations
"""Abstract base class for all rate limiting algorithms."""

import time
from abc import ABC, abstractmethod
from typing import Protocol, runtime_checkable

from app.models.rate_limit import RateLimitConfig, RateLimitResult


@runtime_checkable
class StorageBackend(Protocol):
    """Protocol that storage backends must satisfy."""

    async def get(self, key: str) -> dict | None: ...
    async def set(self, key: str, value: dict, ttl_seconds: int) -> None: ...
    async def delete(self, key: str) -> None: ...
    async def execute_script(self, script: str, keys: list[str], args: list) -> list: ...
    async def increment(self, key: str, ttl_seconds: int) -> int: ...
    async def ping(self) -> bool: ...


class BaseRateLimiter(ABC):
    """
    Abstract base for rate limiters.

    Each concrete subclass implements a single algorithm and is responsible
    for one atomic check-and-update cycle against the storage backend.
    """

    def __init__(self, storage: StorageBackend) -> None:
        self._storage = storage

    @abstractmethod
    async def is_allowed(
        self,
        config: RateLimitConfig,
        identifier: str,
    ) -> RateLimitResult:
        """
        Check whether the request is allowed under the given config.

        Returns a RateLimitResult.  Must be implemented atomically —
        the check and the state mutation happen in one Redis round-trip.
        """

    def _build_storage_key(self, config: RateLimitConfig, identifier: str) -> str:
        """Canonical key format: rl:<config_id>:<identifier>"""
        return f"rl:{config.id}:{identifier}"

    def _now(self) -> float:
        return time.time()
