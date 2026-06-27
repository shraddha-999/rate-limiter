from __future__ import annotations
"""Strategy Pattern: factory that returns the correct algorithm instance."""

from app.algorithms.base_limiter import BaseRateLimiter, StorageBackend
from app.algorithms.fixed_window import FixedWindowLimiter
from app.algorithms.sliding_window import SlidingWindowLimiter
from app.algorithms.token_bucket import TokenBucketLimiter
from app.exceptions.exceptions import AlgorithmNotFoundException
from app.models.rate_limit import Algorithm


class AlgorithmFactory:
    """
    Maps algorithm enum values to concrete BaseRateLimiter subclasses.

    Using the Strategy Pattern: callers get a limiter by name without knowing
    the concrete class.  All instances share the same storage backend.
    """

    _registry: dict[Algorithm, type[BaseRateLimiter]] = {
        Algorithm.FIXED_WINDOW: FixedWindowLimiter,
        Algorithm.SLIDING_WINDOW: SlidingWindowLimiter,
        Algorithm.TOKEN_BUCKET: TokenBucketLimiter,
    }

    def __init__(self, storage: StorageBackend) -> None:
        self._storage = storage
        # Cache one instance per algorithm to avoid re-allocation per request
        self._instances: dict[Algorithm, BaseRateLimiter] = {}

    def get(self, algorithm: Algorithm) -> BaseRateLimiter:
        if algorithm not in self._registry:
            raise AlgorithmNotFoundException(str(algorithm))
        if algorithm not in self._instances:
            self._instances[algorithm] = self._registry[algorithm](self._storage)
        return self._instances[algorithm]

    @classmethod
    def supported_algorithms(cls) -> list[str]:
        return [a.value for a in cls._registry]
