from __future__ import annotations
"""Token Bucket rate limiting algorithm.

A bucket holds up to `burst_capacity` tokens.
Tokens refill at `refill_rate` tokens/second.
Each request consumes one token; if the bucket is empty the request is blocked.

Pros: Naturally handles burst traffic up to burst_capacity.
Pros: Smooth average rate enforced by refill_rate.
"""

import math
import time

from app.algorithms.base_limiter import BaseRateLimiter, StorageBackend
from app.models.rate_limit import RateLimitConfig, RateLimitResult

# Atomic Lua:
#   1. Load current tokens + last_refill from hash
#   2. Compute elapsed → new tokens (cap at burst_capacity)
#   3. If tokens >= 1: consume, persist, return allowed
#   4. Else: compute retry_after = ceil((1 - tokens) / refill_rate)
_TOKEN_BUCKET_SCRIPT = """-- token_bucket
local key           = KEYS[1]
local burst         = tonumber(ARGV[1])
local refill_rate   = tonumber(ARGV[2])
local now           = tonumber(ARGV[3])
local ttl           = tonumber(ARGV[4])

local data = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens      = tonumber(data[1]) or burst
local last_refill = tonumber(data[2]) or now

local elapsed     = now - last_refill
local new_tokens  = math.min(burst, tokens + elapsed * refill_rate)

if new_tokens >= 1 then
    new_tokens = new_tokens - 1
    redis.call('HMSET', key, 'tokens', tostring(new_tokens), 'last_refill', tostring(now))
    redis.call('EXPIRE', key, ttl)
    return {1, math.floor(new_tokens), 0}
else
    -- How many seconds until the bucket has 1 token?
    local wait = math.ceil((1 - new_tokens) / refill_rate)
    redis.call('HMSET', key, 'tokens', tostring(new_tokens), 'last_refill', tostring(now))
    redis.call('EXPIRE', key, ttl)
    return {0, 0, wait}
end
"""


class TokenBucketLimiter(BaseRateLimiter):
    """Token Bucket stored as a Redis hash {tokens, last_refill}."""

    def __init__(self, storage: StorageBackend) -> None:
        super().__init__(storage)

    async def is_allowed(
        self,
        config: RateLimitConfig,
        identifier: str,
    ) -> RateLimitResult:
        key = self._build_storage_key(config, identifier)
        now = self._now()

        burst = config.burst_capacity if config.burst_capacity > 0 else config.limit
        refill_rate = config.refill_rate if config.refill_rate > 0 else config.limit / config.window_seconds
        # TTL: keep the key alive for as long as it takes to fully refill
        ttl = math.ceil(burst / refill_rate) + 10

        result = await self._storage.execute_script(
            _TOKEN_BUCKET_SCRIPT,
            keys=[key],
            args=[burst, refill_rate, now, ttl],
        )

        allowed = bool(int(result[0]))
        remaining = int(result[1])
        retry_after = int(result[2])
        reset_after = math.ceil(burst / refill_rate)

        return RateLimitResult(
            allowed=allowed,
            remaining=remaining,
            limit=burst,
            reset_after=reset_after,
            retry_after=retry_after if not allowed else 0,
            algorithm="token_bucket",
            identifier=identifier,
            identifier_type=config.identifier_type.value,
        )
