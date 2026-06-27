from __future__ import annotations
"""Core rate limiting business logic.

Responsibilities:
- Resolve which RateLimitConfig applies to a request (user tier, endpoint, wildcard)
- Apply whitelist / blacklist checks
- Delegate to the correct algorithm via AlgorithmFactory
- Record Prometheus metrics and structured logs
"""

import time
from typing import Optional

from app.algorithms.factory import AlgorithmFactory
from app.config.settings import Settings
from app.exceptions.exceptions import (
    BlacklistedException,
    ConfigNotFoundException,
    RateLimitExceededException,
)
from app.models.rate_limit import (
    Algorithm,
    IdentifierType,
    RateLimitConfig,
    RateLimitResult,
    UserTier,
)
from app.repositories.config_repository import ConfigRepository
from app.utils.logger import RequestLogger, get_logger
from app.utils.metrics import (
    ACTIVE_IDENTIFIERS,
    REQUESTS_ALLOWED,
    REQUESTS_BLOCKED,
    REQUESTS_TOTAL,
    REQUEST_LATENCY,
)

logger = get_logger(__name__)
request_logger = RequestLogger()


class RateLimitService:
    """Orchestrates rate limit checks using Dependency Injection."""

    def __init__(
        self,
        config_repo: ConfigRepository,
        algorithm_factory: AlgorithmFactory,
        settings: Settings,
    ) -> None:
        self._config_repo = config_repo
        self._factory = algorithm_factory
        self._settings = settings

    async def check(
        self,
        identifier: str,
        identifier_type: IdentifierType,
        endpoint: str = "/",
        algorithm_override: Optional[Algorithm] = None,
        user_tier: Optional[UserTier] = None,
    ) -> RateLimitResult:
        start = time.perf_counter()

        # ── Security checks ───────────────────────────────────────────────────
        if identifier in self._settings.get_blacklist_ips():
            raise BlacklistedException(identifier)

        # ── Resolve config ────────────────────────────────────────────────────
        config = await self._resolve_config(
            identifier, identifier_type, endpoint, user_tier
        )

        # Apply algorithm override if requested
        if algorithm_override and algorithm_override != config.algorithm:
            config = self._override_algorithm(config, algorithm_override)

        # ── Execute algorithm ─────────────────────────────────────────────────
        limiter = self._factory.get(config.algorithm)
        result = await limiter.is_allowed(config, identifier)

        # ── Metrics & logging ─────────────────────────────────────────────────
        elapsed_ms = (time.perf_counter() - start) * 1000
        labels = {
            "identifier_type": identifier_type.value,
            "algorithm": config.algorithm.value,
            "endpoint": endpoint,
        }
        REQUESTS_TOTAL.labels(**labels).inc()
        REQUEST_LATENCY.labels(
            identifier_type=identifier_type.value,
            algorithm=config.algorithm.value,
        ).observe((time.perf_counter() - start))

        if result.allowed:
            REQUESTS_ALLOWED.labels(**labels).inc()
            request_logger.log_allowed(
                identifier, identifier_type.value, endpoint,
                result.remaining, config.algorithm.value, elapsed_ms,
            )
        else:
            REQUESTS_BLOCKED.labels(**labels).inc()
            request_logger.log_blocked(
                identifier, identifier_type.value, endpoint,
                result.retry_after, config.algorithm.value, elapsed_ms,
            )
            raise RateLimitExceededException(
                message="Rate limit exceeded",
                retry_after=result.retry_after,
            )

        return result

    async def _resolve_config(
        self,
        identifier: str,
        identifier_type: IdentifierType,
        endpoint: str,
        user_tier: Optional[UserTier],
    ) -> RateLimitConfig:
        """
        Priority order:
        1. Exact match: identifier + identifier_type + endpoint
        2. Wildcard identifier + identifier_type + endpoint
        3. Wildcard endpoint: identifier + identifier_type + "*"
        4. Wildcard everything: "*" + identifier_type
        5. Fall back to settings defaults
        """
        configs = await self._config_repo.list_all()
        now = time.time()

        candidates: list[RateLimitConfig] = [
            c for c in configs
            if c.enabled
            and not c.is_expired(now)
            and c.identifier_type == identifier_type
        ]

        # Apply user tier limits if provided
        if user_tier:
            tier_configs = [c for c in candidates if c.user_tier == user_tier]
            if tier_configs:
                candidates = tier_configs

        # Score candidates — more specific = higher score
        def specificity(c: RateLimitConfig) -> int:
            score = 0
            if c.identifier == identifier:
                score += 2
            if c.endpoint and c.endpoint == endpoint:
                score += 2
            return score

        if candidates:
            candidates.sort(key=specificity, reverse=True)
            return candidates[0]

        # Fall back to defaults from settings
        return self._default_config(identifier_type, user_tier)

    def _default_config(
        self,
        identifier_type: IdentifierType,
        user_tier: Optional[UserTier],
    ) -> RateLimitConfig:
        limit = self._tier_limit(user_tier)
        return RateLimitConfig(
            id="__default__",
            identifier_type=identifier_type,
            identifier="*",
            algorithm=Algorithm(self._settings.default_algorithm),
            limit=limit,
            window_seconds=self._settings.default_window_seconds,
            burst_capacity=self._settings.default_burst_capacity,
            refill_rate=self._settings.default_refill_rate,
            user_tier=user_tier,
        )

    def _tier_limit(self, user_tier: Optional[UserTier]) -> int:
        if user_tier == UserTier.ENTERPRISE:
            return self._settings.enterprise_tier_limit
        if user_tier == UserTier.PREMIUM:
            return self._settings.premium_tier_limit
        return self._settings.free_tier_limit

    @staticmethod
    def _override_algorithm(
        config: RateLimitConfig, algorithm: Algorithm
    ) -> RateLimitConfig:
        """Return a shallow copy of config with a different algorithm."""
        from dataclasses import replace
        return replace(config, algorithm=algorithm)
