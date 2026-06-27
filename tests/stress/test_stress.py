"""Stress tests — high volume, measures throughput and latency."""

import asyncio
import statistics
import time

import pytest

from app.algorithms.sliding_window import SlidingWindowLimiter
from app.models.rate_limit import Algorithm, IdentifierType, RateLimitConfig


def make_config(limit: int = 10000) -> RateLimitConfig:
    return RateLimitConfig(
        id="stress-config",
        identifier_type=IdentifierType.USER_ID,
        identifier="*",
        algorithm=Algorithm.SLIDING_WINDOW,
        limit=limit,
        window_seconds=3600,
    )


@pytest.mark.asyncio
@pytest.mark.stress
async def test_throughput_1000_requests(memory_storage):
    """1000 sequential requests should complete in under 2 seconds."""
    config = make_config(limit=10000)
    limiter = SlidingWindowLimiter(memory_storage)

    start = time.perf_counter()
    for i in range(1000):
        await limiter.is_allowed(config, f"stress_user_{i % 50}")
    elapsed = time.perf_counter() - start

    assert elapsed < 2.0, f"1000 requests took {elapsed:.2f}s — too slow"


@pytest.mark.asyncio
@pytest.mark.stress
async def test_concurrent_throughput(memory_storage):
    """500 concurrent requests should complete in under 1 second."""
    config = make_config(limit=10000)
    limiter = SlidingWindowLimiter(memory_storage)

    start = time.perf_counter()
    await asyncio.gather(
        *[limiter.is_allowed(config, f"stress_concurrent_{i % 20}") for i in range(500)]
    )
    elapsed = time.perf_counter() - start

    assert elapsed < 1.0, f"500 concurrent requests took {elapsed:.2f}s"


@pytest.mark.asyncio
@pytest.mark.stress
async def test_latency_p99_under_threshold(memory_storage):
    """P99 latency per request should be under 5ms for in-memory backend."""
    config = make_config(limit=100000)
    limiter = SlidingWindowLimiter(memory_storage)

    latencies: list[float] = []
    for i in range(200):
        t = time.perf_counter()
        await limiter.is_allowed(config, f"lat_user_{i % 10}")
        latencies.append((time.perf_counter() - t) * 1000)

    p99 = statistics.quantiles(latencies, n=100)[98]
    assert p99 < 5.0, f"P99 latency is {p99:.2f}ms — above 5ms threshold"


@pytest.mark.asyncio
@pytest.mark.stress
async def test_multiple_algorithms_under_load(memory_storage):
    """All three algorithms should handle 200 requests without errors."""
    from app.algorithms.fixed_window import FixedWindowLimiter
    from app.algorithms.token_bucket import TokenBucketLimiter

    configs = {
        "fw": (FixedWindowLimiter(memory_storage), RateLimitConfig(
            id="stress-fw", identifier_type=IdentifierType.USER_ID, identifier="*",
            algorithm=Algorithm.FIXED_WINDOW, limit=10000, window_seconds=3600,
        )),
        "sw": (SlidingWindowLimiter(memory_storage), RateLimitConfig(
            id="stress-sw", identifier_type=IdentifierType.USER_ID, identifier="*",
            algorithm=Algorithm.SLIDING_WINDOW, limit=10000, window_seconds=3600,
        )),
        "tb": (TokenBucketLimiter(memory_storage), RateLimitConfig(
            id="stress-tb", identifier_type=IdentifierType.USER_ID, identifier="*",
            algorithm=Algorithm.TOKEN_BUCKET, limit=10000, window_seconds=3600,
            burst_capacity=10000, refill_rate=1000.0,
        )),
    }

    async def run_algo(limiter, config, n):
        return await asyncio.gather(*[limiter.is_allowed(config, f"user_{i}") for i in range(n)])

    results = await asyncio.gather(*[
        run_algo(limiter, config, 200) for limiter, config in configs.values()
    ], return_exceptions=True)

    for r in results:
        assert not isinstance(r, Exception), f"Stress test raised: {r}"
