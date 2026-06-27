from __future__ import annotations
"""Abstract repository interface — Repository Pattern.

All storage backends must implement this interface.  Consumers depend only on
this abstraction, never on concrete Redis or in-memory implementations.
"""

from abc import ABC, abstractmethod
from typing import Any, Optional


class BaseRepository(ABC):
    """Abstract storage repository for rate limiter state."""

    @abstractmethod
    async def get(self, key: str) -> Optional[dict]:
        """Return the stored dict for *key*, or None if absent."""

    @abstractmethod
    async def set(self, key: str, value: dict, ttl_seconds: int) -> None:
        """Persist *value* under *key* with an expiry of *ttl_seconds*."""

    @abstractmethod
    async def delete(self, key: str) -> None:
        """Remove *key* from the store."""

    @abstractmethod
    async def execute_script(
        self, script: str, keys: list[str], args: list[Any]
    ) -> list[Any]:
        """Execute an atomic script (Lua on Redis; emulated for memory)."""

    @abstractmethod
    async def increment(self, key: str, ttl_seconds: int) -> int:
        """Atomically increment a counter under *key*, returning the new value."""

    @abstractmethod
    async def ping(self) -> bool:
        """Return True if the backend is reachable."""

    @abstractmethod
    async def keys(self, pattern: str) -> list[str]:
        """Return all keys matching *pattern* (glob-style)."""

    @abstractmethod
    async def close(self) -> None:
        """Clean up connections."""
