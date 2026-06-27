"""Concurrency tests — verifies thread-safety under concurrent load."""

import asyncio
from collections import Counter

import pytest

from app.algorithms.sliding_window import SlidingWindowLimiter
from app.algorithms.token_bucket import TokenBucketLimiter
from app.algorithms.fixed_window import FixedWindowLimiter
from app.models.rate_limit import Algorithm, IdentifierType, RateLimitConfig


def make_config(algo: Algorithm, limit: int, burst: int = 0, refill: float = 0.0) -> RateLimitConfig:
    return RateLimitConfig(
        id=f"conc-{algo.value}",
        identifier_type=IdentifierType.USER_ID,
        identifier="*",
        algorithm=algo,
        limit=limit,
        window_seconds=60,
        burst_capacity=burst,
        refill_rate=refill,
    )


@pytest.mark.asyncio
async def test_sliding_window_exact_limit_under_concurrent_load(memory_storage):
    """Exactly `limit` requests should be allowed, even with concurrent callers."""
    limit = 10
    concurrency = 50
    config = make_config(Algorithm.SLIDING_WINDOW, limit=limit)
    limiter = SlidingWindowLimiter(memory_storage)

    results = await asyncio.gather(
        *[limiter.is_allowed(config, "concurrent_user") for _ in range(concurrency)]
    )

    allowed = sum(1 for r in results if r.allowed)
    blocked = sum(1 for r in results if not r.allowed)

    assert allowed == limit, f"Expected {limit} allowed, got {allowed}"
    assert blocked == concurrency - limit


@pytest.mark.asyncio
async def test_token_bucket_does_not_exceed_burst_under_concurrent_load(memory_storage):
    burst = 5
    concurrency = 30
    config = make_config(Algorithm.TOKEN_BUCKET, limit=20, burst=burst, refill=0.1)
    limiter = TokenBucketLimiter(memory_storage)

    results = await asyncio.gather(
        *[limiter.is_allowed(config, "tb_concurrent_user") for _ in range(concurrency)]
    )

    allowed = sum(1 for r in results if r.allowed)
    assert allowed <= burst, f"Allowed {allowed} but burst is only {burst}"


@pytest.mark.asyncio
async def test_fixed_window_concurrent_same_identifier(memory_storage):
    limit = 5
    concurrency = 20
    config = make_config(Algorithm.FIXED_WINDOW, limit=limit)
    limiter = FixedWindowLimiter(memory_storage)

    results = await asyncio.gather(
        *[limiter.is_allowed(config, "fw_concurrent_user") for _ in range(concurrency)]
    )

    allowed = sum(1 for r in results if r.allowed)
    assert allowed <= limit + 1  # +1 tolerance for window boundary edge


@pytest.mark.asyncio
async def test_independent_users_do_not_interfere(memory_storage):
    limit = 3
    config = make_config(Algorithm.SLIDING_WINDOW, limit=limit)
    limiter = SlidingWindowLimiter(memory_storage)

    async def hit_n_times(user_id: str, n: int) -> list:
        return [await limiter.is_allowed(config, user_id) for _ in range(n)]

    groups = await asyncio.gather(
        hit_n_times("user_alpha", 5),
        hit_n_times("user_beta", 5),
        hit_n_times("user_gamma", 5),
    )

    for user_results in groups:
        allowed = [r for r in user_results if r.allowed]
        assert len(allowed) == limit


@pytest.mark.asyncio
async def test_high_concurrency_no_exception(memory_storage):
    """Under heavy concurrent load, no exceptions should be raised."""
    config = make_config(Algorithm.SLIDING_WINDOW, limit=100)
    limiter = SlidingWindowLimiter(memory_storage)

    results = await asyncio.gather(
        *[limiter.is_allowed(config, f"user_{i % 10}") for i in range(500)],
        return_exceptions=True,
    )

    exceptions = [r for r in results if isinstance(r, Exception)]
    assert not exceptions, f"Got unexpected exceptions: {exceptions}"
