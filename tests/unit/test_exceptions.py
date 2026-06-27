"""Unit tests for custom exception hierarchy."""

import pytest

from app.exceptions.exceptions import (
    AlgorithmNotFoundException,
    BlacklistedException,
    ConfigNotFoundException,
    RateLimitExceededException,
    RedisUnavailableException,
    UnauthorizedException,
    ValidationException,
)


class TestExceptions:
    def test_rate_limit_exceeded_defaults(self):
        exc = RateLimitExceededException()
        assert exc.status_code == 429
        assert exc.retry_after == 0
        assert "exceeded" in exc.message

    def test_rate_limit_exceeded_with_retry_after(self):
        exc = RateLimitExceededException(retry_after=30)
        assert exc.retry_after == 30

    def test_redis_unavailable(self):
        exc = RedisUnavailableException()
        assert exc.status_code == 503

    def test_config_not_found(self):
        exc = ConfigNotFoundException("abc-123")
        assert exc.status_code == 404
        assert "abc-123" in exc.message

    def test_algorithm_not_found(self):
        exc = AlgorithmNotFoundException("magic_algo")
        assert exc.status_code == 400
        assert "magic_algo" in exc.message

    def test_blacklisted(self):
        exc = BlacklistedException("192.168.1.1")
        assert exc.status_code == 403
        assert "192.168.1.1" in exc.message

    def test_unauthorized(self):
        exc = UnauthorizedException()
        assert exc.status_code == 401

    def test_validation_exception(self):
        exc = ValidationException("bad field")
        assert exc.status_code == 422
        assert "bad field" in exc.message
