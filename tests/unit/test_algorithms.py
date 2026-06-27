"""Unit tests for all three rate limiting algorithms."""

import asyncio
import time

import pytest
import pytest_asyncio

from app.algorithms.fixed_window import FixedWindowLimiter
from app.algorithms.sliding_window import SlidingWindowLimiter
from app.algorithms.token_bucket import TokenBucketLimiter
from app.models.rate_limit import Algorithm, IdentifierType, RateLimitConfig


def make_config(algo: Algorithm, limit: int = 5, window: int = 60, burst: int = 5, refill: float = 1.0) -> RateLimitConfig:
    return RateLimitConfig(
        id=f"test-{algo.value}",
        identifier_type=IdentifierType.USER_ID,
        identifier="*",
        algorithm=algo,
        limit=limit,
        window_seconds=window,
        burst_capacity=burst,
        refill_rate=refill,
    )


class TestFixedWindowLimiter:
    @pytest_asyncio.fixture(autouse=True)
    async def setup(self, memory_storage):
        self.limiter = FixedWindowLimiter(memory_storage)
        self.config = make_config(Algorithm.FIXED_WINDOW, limit=3)

    @pytest.mark.asyncio
    async def test_allows_requests_under_limit(self):
        for _ in range(3):
            result = await self.limiter.is_allowed(self.config, "user1")
            assert result.allowed

    @pytest.mark.asyncio
    async def test_blocks_request_over_limit(self):
        for _ in range(3):
            await self.limiter.is_allowed(self.config, "user2")
        result = await self.limiter.is_allowed(self.config, "user2")
        assert not result.allowed
        assert result.retry_after > 0

    @pytest.mark.asyncio
    async def test_remaining_decrements(self):
        r1 = await self.limiter.is_allowed(self.config, "user3")
        r2 = await self.limiter.is_allowed(self.config, "user3")
        assert r2.remaining < r1.remaining

    @pytest.mark.asyncio
    async def test_different_identifiers_are_independent(self):
        for _ in range(3):
            await self.limiter.is_allowed(self.config, "userA")
        result = await self.limiter.is_allowed(self.config, "userB")
        assert result.allowed

    @pytest.mark.asyncio
    async def test_algorithm_label_in_result(self):
        result = await self.limiter.is_allowed(self.config, "user4")
        assert result.algorithm == "fixed_window"


class TestSlidingWindowLimiter:
    @pytest_asyncio.fixture(autouse=True)
    async def setup(self, memory_storage):
        self.limiter = SlidingWindowLimiter(memory_storage)
        self.config = make_config(Algorithm.SLIDING_WINDOW, limit=3)

    @pytest.mark.asyncio
    async def test_allows_up_to_limit(self):
        for _ in range(3):
            result = await self.limiter.is_allowed(self.config, "sw_user1")
            assert result.allowed

    @pytest.mark.asyncio
    async def test_blocks_at_limit(self):
        for _ in range(3):
            await self.limiter.is_allowed(self.config, "sw_user2")
        result = await self.limiter.is_allowed(self.config, "sw_user2")
        assert not result.allowed

    @pytest.mark.asyncio
    async def test_remaining_is_zero_when_blocked(self):
        for _ in range(3):
            await self.limiter.is_allowed(self.config, "sw_user3")
        result = await self.limiter.is_allowed(self.config, "sw_user3")
        assert result.remaining == 0

    @pytest.mark.asyncio
    async def test_retry_after_positive_when_blocked(self):
        for _ in range(3):
            await self.limiter.is_allowed(self.config, "sw_user4")
        result = await self.limiter.is_allowed(self.config, "sw_user4")
        assert result.retry_after > 0

    @pytest.mark.asyncio
    async def test_algorithm_label(self):
        result = await self.limiter.is_allowed(self.config, "sw_user5")
        assert result.algorithm == "sliding_window"


class TestTokenBucketLimiter:
    @pytest_asyncio.fixture(autouse=True)
    async def setup(self, memory_storage):
        self.limiter = TokenBucketLimiter(memory_storage)
        self.config = make_config(Algorithm.TOKEN_BUCKET, limit=10, burst=3, refill=10.0)

    @pytest.mark.asyncio
    async def test_allows_up_to_burst(self):
        for i in range(3):
            result = await self.limiter.is_allowed(self.config, "tb_user1")
            assert result.allowed, f"Request {i+1} should be allowed"

    @pytest.mark.asyncio
    async def test_blocks_when_empty(self):
        for _ in range(3):
            await self.limiter.is_allowed(self.config, "tb_user2")
        result = await self.limiter.is_allowed(self.config, "tb_user2")
        assert not result.allowed

    @pytest.mark.asyncio
    async def test_algorithm_label(self):
        result = await self.limiter.is_allowed(self.config, "tb_user3")
        assert result.algorithm == "token_bucket"

    @pytest.mark.asyncio
    async def test_result_has_correct_limit(self):
        result = await self.limiter.is_allowed(self.config, "tb_user4")
        assert result.limit == self.config.burst_capacity


class TestAlgorithmFactory:
    @pytest.mark.asyncio
    async def test_returns_correct_instances(self, algorithm_factory):
        from app.algorithms.fixed_window import FixedWindowLimiter
        from app.algorithms.sliding_window import SlidingWindowLimiter
        from app.algorithms.token_bucket import TokenBucketLimiter

        assert isinstance(algorithm_factory.get(Algorithm.FIXED_WINDOW), FixedWindowLimiter)
        assert isinstance(algorithm_factory.get(Algorithm.SLIDING_WINDOW), SlidingWindowLimiter)
        assert isinstance(algorithm_factory.get(Algorithm.TOKEN_BUCKET), TokenBucketLimiter)

    @pytest.mark.asyncio
    async def test_raises_for_unknown_algorithm(self, algorithm_factory):
        from app.exceptions.exceptions import AlgorithmNotFoundException
        with pytest.raises(AlgorithmNotFoundException):
            algorithm_factory.get("nonexistent")
