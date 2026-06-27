"""Unit tests for domain models."""

import time

import pytest

from app.models.rate_limit import (
    Algorithm,
    IdentifierType,
    RateLimitConfig,
    RateLimitResult,
    UserTier,
)


class TestRateLimitResult:
    def test_headers_when_allowed(self):
        result = RateLimitResult(
            allowed=True, remaining=9, limit=10, reset_after=55, algorithm="sliding_window",
        )
        headers = result.headers
        assert "X-RateLimit-Limit" in headers
        assert "X-RateLimit-Remaining" in headers
        assert "Retry-After" not in headers

    def test_headers_when_blocked(self):
        result = RateLimitResult(
            allowed=False, remaining=0, limit=10, reset_after=55,
            retry_after=25, algorithm="sliding_window",
        )
        headers = result.headers
        assert headers["Retry-After"] == "25"
        assert headers["X-RateLimit-Remaining"] == "0"

    def test_remaining_clamped_to_zero(self):
        result = RateLimitResult(
            allowed=False, remaining=-1, limit=5, reset_after=10,
        )
        assert result.headers["X-RateLimit-Remaining"] == "0"


class TestRateLimitConfig:
    def test_is_expired_false_for_future(self):
        config = RateLimitConfig(
            id="x", identifier_type=IdentifierType.USER_ID, identifier="*",
            algorithm=Algorithm.FIXED_WINDOW, limit=10, window_seconds=60,
            expires_at=time.time() + 3600,
        )
        assert not config.is_expired(time.time())

    def test_is_expired_true_for_past(self):
        config = RateLimitConfig(
            id="x", identifier_type=IdentifierType.USER_ID, identifier="*",
            algorithm=Algorithm.FIXED_WINDOW, limit=10, window_seconds=60,
            expires_at=time.time() - 1,
        )
        assert config.is_expired(time.time())

    def test_is_expired_false_when_none(self):
        config = RateLimitConfig(
            id="x", identifier_type=IdentifierType.USER_ID, identifier="*",
            algorithm=Algorithm.FIXED_WINDOW, limit=10, window_seconds=60,
        )
        assert not config.is_expired(time.time())
