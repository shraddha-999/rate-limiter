from __future__ import annotations
"""Sliding Window Log rate limiting algorithm.

Uses a Redis Sorted Set where each member is a unique request timestamp.
The window slides continuously — only requests within the last N seconds count.

Pros: Perfectly smooth limiting, no burst at edges.
Cons: O(n) members per key in the worst case; managed by periodic cleanup.

To bound memory: after cleanup, if the set is large we cap it.
"""

import time
import uuid

from app.algorithms.base_limiter import BaseRateLimiter, StorageBackend
from app.models.rate_limit import RateLimitConfig, RateLimitResult

# Atomic Lua:
#   1. Remove timestamps older than (now - window)
#   2. Count remaining
#   3. If under limit: add current timestamp, return allowed
#   4. If at/over limit: return blocked with retry_after
_SLIDING_WINDOW_SCRIPT = """-- sliding_window
local key    = KEYS[1]
local limit  = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now    = tonumber(ARGV[3])
local req_id = ARGV[4]

local cutoff = now - window

-- Remove expired entries
redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)

local count = redis.call('ZCARD', key)

if count < limit then
    redis.call('ZADD', key, now, req_id)
    redis.call('EXPIRE', key, window + 1)
    local remaining = limit - count - 1
    return {1, remaining, 0}
else
    -- oldest entry determines when window will free a slot
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local retry_after = 0
    if #oldest >= 2 then
        retry_after = math.ceil(tonumber(oldest[2]) + window - now)
    end
    return {0, 0, retry_after}
end
"""


class SlidingWindowLimiter(BaseRateLimiter):
    """Sliding Window Log using Redis Sorted Sets."""

    def __init__(self, storage: StorageBackend) -> None:
        super().__init__(storage)

    async def is_allowed(
        self,
        config: RateLimitConfig,
        identifier: str,
    ) -> RateLimitResult:
        key = self._build_storage_key(config, identifier)
        now = self._now()
        req_id = f"{now:.6f}-{uuid.uuid4().hex[:8]}"

        result = await self._storage.execute_script(
            _SLIDING_WINDOW_SCRIPT,
            keys=[key],
            args=[config.limit, config.window_seconds, now, req_id],
        )

        allowed = bool(int(result[0]))
        remaining = int(result[1])
        retry_after = int(result[2])

        return RateLimitResult(
            allowed=allowed,
            remaining=remaining,
            limit=config.limit,
            reset_after=config.window_seconds,
            retry_after=retry_after if not allowed else 0,
            algorithm="sliding_window",
            identifier=identifier,
            identifier_type=config.identifier_type.value,
        )
