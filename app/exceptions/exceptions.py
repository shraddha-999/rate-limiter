"""Custom exceptions for the rate limiter application."""

from typing import Optional


class RateLimiterBaseException(Exception):
    """Base exception for all rate limiter errors."""

    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class RateLimitExceededException(RateLimiterBaseException):
    """Raised when a client exceeds the configured rate limit."""

    def __init__(self, message: str = "Rate limit exceeded", retry_after: int = 0):
        self.retry_after = retry_after
        super().__init__(message, status_code=429)


class RedisUnavailableException(RateLimiterBaseException):
    """Raised when Redis connection is unavailable."""

    def __init__(self, message: str = "Redis is unavailable"):
        super().__init__(message, status_code=503)


class ConfigurationException(RateLimiterBaseException):
    """Raised when configuration is invalid or missing."""

    def __init__(self, message: str = "Invalid configuration"):
        super().__init__(message, status_code=400)


class ValidationException(RateLimiterBaseException):
    """Raised when request validation fails."""

    def __init__(self, message: str = "Validation error"):
        super().__init__(message, status_code=422)


class StorageException(RateLimiterBaseException):
    """Raised on generic storage layer errors."""

    def __init__(self, message: str = "Storage error"):
        super().__init__(message, status_code=500)


class AlgorithmNotFoundException(RateLimiterBaseException):
    """Raised when the requested algorithm is not found."""

    def __init__(self, algorithm: str):
        super().__init__(f"Algorithm '{algorithm}' not found", status_code=400)


class ConfigNotFoundException(RateLimiterBaseException):
    """Raised when a config ID is not found."""

    def __init__(self, config_id: str):
        super().__init__(f"Configuration '{config_id}' not found", status_code=404)


class UnauthorizedException(RateLimiterBaseException):
    """Raised when an API key is invalid or missing."""

    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, status_code=401)


class BlacklistedException(RateLimiterBaseException):
    """Raised when a client is blacklisted."""

    def __init__(self, identifier: str):
        super().__init__(f"'{identifier}' is blacklisted", status_code=403)
