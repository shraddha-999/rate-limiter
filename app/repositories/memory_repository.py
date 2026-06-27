from __future__ import annotations
"""In-memory repository for local development and testing.

Thread-safe via asyncio.Lock.  Lua scripts are emulated using Python with
a minimal interpreter so the same Lua logic paths are tested locally.

NOT suitable for production (no persistence, no distribution).
"""

import asyncio
import fnmatch
import math
import time
from typing import Any, Optional

from app.repositories.base_repository import BaseRepository
from app.utils.logger import get_logger

logger = get_logger(__name__)


class _LuaEmulator:
    """
    Minimal Lua emulator that covers the subset of Lua used by our scripts.

    Rather than a full interpreter, each of our three scripts is hard-coded
    as a Python function keyed by its first-line comment.
    """

    @staticmethod
    def fixed_window(store: dict, keys: list[str], args: list[Any]) -> list:
        key = keys[0]
        limit = int(args[0])
        window = int(args[1])
        now = float(args[2])

        window_start = math.floor(now / window) * window
        field = str(int(window_start))

        bucket = store.setdefault(key, {"_type": "hash", "_exp": now + window * 2, "data": {}})
        bucket["data"].setdefault(field, 0)
        bucket["data"][field] += 1
        bucket["_exp"] = now + window * 2

        # Remove stale fields
        for f in list(bucket["data"].keys()):
            if int(f) < window_start:
                del bucket["data"][f]

        count = bucket["data"][field]
        remaining = max(0, limit - count)
        reset_in = math.ceil(window_start + window - now)
        return [count, remaining, reset_in, window_start]

    @staticmethod
    def sliding_window(store: dict, keys: list[str], args: list[Any]) -> list:
        key = keys[0]
        limit = int(args[0])
        window = int(args[1])
        now = float(args[2])
        req_id = args[3]

        cutoff = now - window
        zset = store.setdefault(key, {"_type": "zset", "_exp": now + window + 1, "data": {}})
        # Remove expired
        zset["data"] = {k: v for k, v in zset["data"].items() if v > cutoff}
        count = len(zset["data"])

        if count < limit:
            zset["data"][req_id] = now
            zset["_exp"] = now + window + 1
            return [1, limit - count - 1, 0]
        else:
            oldest_score = min(zset["data"].values()) if zset["data"] else now
            retry_after = math.ceil(oldest_score + window - now)
            return [0, 0, max(0, retry_after)]

    @staticmethod
    def token_bucket(store: dict, keys: list[str], args: list[Any]) -> list:
        key = keys[0]
        burst = float(args[0])
        refill_rate = float(args[1])
        now = float(args[2])
        ttl = float(args[3])

        entry = store.get(key, {"_type": "hash", "_exp": now + ttl, "data": {"tokens": burst, "last_refill": now}})
        tokens = float(entry["data"].get("tokens", burst))
        last_refill = float(entry["data"].get("last_refill", now))

        elapsed = now - last_refill
        new_tokens = min(burst, tokens + elapsed * refill_rate)

        if new_tokens >= 1:
            new_tokens -= 1
            entry["data"]["tokens"] = new_tokens
            entry["data"]["last_refill"] = now
            entry["_exp"] = now + ttl
            store[key] = entry
            return [1, math.floor(new_tokens), 0]
        else:
            wait = math.ceil((1 - new_tokens) / refill_rate)
            entry["data"]["tokens"] = new_tokens
            entry["data"]["last_refill"] = now
            entry["_exp"] = now + ttl
            store[key] = entry
            return [0, 0, wait]


class MemoryRepository(BaseRepository):
    """Thread-safe in-memory repository for development/testing."""

    def __init__(self) -> None:
        self._store: dict[str, Any] = {}
        self._lock = asyncio.Lock()
        self._emulator = _LuaEmulator()

    async def _evict_expired(self) -> None:
        now = time.time()
        expired = [k for k, v in self._store.items() if isinstance(v, dict) and v.get("_exp", float("inf")) < now]
        for k in expired:
            del self._store[k]

    async def get(self, key: str) -> Optional[dict]:
        async with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            if entry.get("_exp", float("inf")) < time.time():
                del self._store[key]
                return None
            return entry.get("data")

    async def set(self, key: str, value: dict, ttl_seconds: int) -> None:
        async with self._lock:
            self._store[key] = {
                "_type": "string",
                "_exp": time.time() + ttl_seconds,
                "data": value,
            }

    async def delete(self, key: str) -> None:
        async with self._lock:
            self._store.pop(key, None)

    async def execute_script(
        self, script: str, keys: list[str], args: list[Any]
    ) -> list[Any]:
        async with self._lock:
            # Identify which script to emulate by its first comment line
            first_line = script.strip().split("\n")[0].lower()
            if "fixed_window" in first_line:
                return self._emulator.fixed_window(self._store, keys, args)
            elif "sliding_window" in first_line:
                return self._emulator.sliding_window(self._store, keys, args)
            elif "token_bucket" in first_line:
                return self._emulator.token_bucket(self._store, keys, args)
            else:
                raise NotImplementedError(f"No emulator for script: {first_line!r}")

    async def increment(self, key: str, ttl_seconds: int) -> int:
        async with self._lock:
            entry = self._store.get(key)
            now = time.time()
            if entry is None or entry.get("_exp", 0) < now:
                self._store[key] = {"_type": "counter", "_exp": now + ttl_seconds, "data": 1}
                return 1
            entry["data"] = int(entry["data"]) + 1
            return entry["data"]

    async def ping(self) -> bool:
        return True

    async def keys(self, pattern: str) -> list[str]:
        async with self._lock:
            await self._evict_expired()
            return [k for k in self._store if fnmatch.fnmatch(k, pattern)]

    async def close(self) -> None:
        async with self._lock:
            self._store.clear()
