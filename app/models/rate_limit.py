from __future__ import annotations
"""Domain models for rate limiting state and results."""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class IdentifierType(str, Enum):
    USER_ID = "user_id"
    API_KEY = "api_key"
    IP_ADDRESS = "ip_address"
    ENDPOINT = "endpoint"


class Algorithm(str, Enum):
    FIXED_WINDOW = "fixed_window"
    SLIDING_WINDOW = "sliding_window"
    TOKEN_BUCKET = "token_bucket"


class UserTier(str, Enum):
    FREE = "free"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"


@dataclass
class RateLimitState:
    """Current persisted state for a single rate-limited key."""

    key: str
    tokens: float = 0.0
    counter: int = 0
    window_start: float = 0.0
    last_refill: float = 0.0
    expires_at: Optional[float] = None


@dataclass
class RateLimitResult:
    """Result returned from a rate limit check."""

    allowed: bool
    remaining: int
    limit: int
    reset_after: int        # seconds until the window/bucket resets
    retry_after: int = 0   # seconds to wait before retrying (only if blocked)
    algorithm: str = ""
    identifier: str = ""
    identifier_type: str = ""

    @property
    def headers(self) -> dict[str, str]:
        h = {
            "X-RateLimit-Limit": str(self.limit),
            "X-RateLimit-Remaining": str(max(0, self.remaining)),
            "X-RateLimit-Reset": str(self.reset_after),
        }
        if not self.allowed:
            h["Retry-After"] = str(self.retry_after)
        return h


@dataclass
class RateLimitConfig:
    """Per-rule rate limit configuration."""

    id: str
    identifier_type: IdentifierType
    identifier: str                         # "*" means applies to all
    algorithm: Algorithm
    limit: int
    window_seconds: int
    burst_capacity: int = 0
    refill_rate: float = 0.0                # tokens per second (token bucket)
    user_tier: Optional[UserTier] = None
    endpoint: Optional[str] = None
    enabled: bool = True
    expires_at: Optional[float] = None      # epoch; None = never expires
    tags: list[str] = field(default_factory=list)

    def is_expired(self, now: float) -> bool:
        return self.expires_at is not None and now > self.expires_at
