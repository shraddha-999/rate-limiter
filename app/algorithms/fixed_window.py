from __future__ import annotations
"""Fixed Window rate limiting algorithm.

All requests within a fixed time window share a single counter.
The counter resets atomically at window boundaries.

Pros: O(1) space and time, minimal Redis round-trips.
Cons: Allows 2× burst at window edges (double-spend problem).
"""

import math
import time

from app.algorithms.base_limiter import BaseRateLimiter, StorageBackend
from app.models.rate_limit import RateLimitConfig, RateLimitResult

# Atomic Lua: increment counter for the current window, set TTL on first hit.
_FIXED_WINDOW_SCRIPT = """-- fixed_window
local key        = KEYS[1]
local limit      = tonumber(ARGV[1])
local window     = tonumber(ARGV[2])
local now        = tonumber(ARGV[3])

local window_start = math.floor(now / window) * window
local field        = tostring(window_start)

local count = redis.call('HINCRBY', key, field, 1)
redis.call('EXPIRE', key, window * 2)

-- Remove stale windows to cap memory
local fields = redis.call('HKEYS', key)
for _, f in ipairs(fields) do
    if tonumber(f) < window_start then
        redis.call('HDEL', key, f)
    end
end

local remaining = math.max(0, limit - count)
local reset_in  = math.ceil(window_start + window - now)
return {count, remaining, reset_in, window_start}
"""


class FixedWindowLimiter(BaseRateLimiter):
    """Fixed Window counter stored as a hash in Redis."""

    def __init__(self, storage: StorageBackend) -> None:
        super().__init__(storage)

    async def is_allowed(
        self,
        config: RateLimitConfig,
        identifier: str,
    ) -> RateLimitResult:
        key = self._build_storage_key(config, identifier)
        now = self._now()

        result = await self._storage.execute_script(
            _FIXED_WINDOW_SCRIPT,
            keys=[key],
            args=[config.limit, config.window_seconds, now],
        )

        count: int = int(result[0])
        remaining: int = int(result[1])
        reset_in: int = int(result[2])

        allowed = count <= config.limit
        return RateLimitResult(
            allowed=allowed,
            remaining=remaining,
            limit=config.limit,
            reset_after=reset_in,
            retry_after=reset_in if not allowed else 0,
            algorithm="fixed_window",
            identifier=identifier,
            identifier_type=config.identifier_type.value,
        )
