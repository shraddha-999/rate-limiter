"""Pydantic request/response schemas for rate limit endpoints."""

from typing import Annotated, Optional
from pydantic import BaseModel, Field, field_validator
import re

from app.models.rate_limit import Algorithm, IdentifierType, UserTier


# ── Request schemas ───────────────────────────────────────────────────────────

class RateLimitCheckRequest(BaseModel):
    """POST /rate-limit/check request body."""

    identifier: Annotated[str, Field(min_length=1, max_length=256)]
    identifier_type: IdentifierType = IdentifierType.USER_ID
    endpoint: Annotated[str, Field(default="/", max_length=512)]
    algorithm: Optional[Algorithm] = None
    user_tier: Optional[UserTier] = None

    @field_validator("identifier")
    @classmethod
    def sanitize_identifier(cls, v: str) -> str:
        # Strip leading/trailing whitespace; reject control characters
        v = v.strip()
        if not v or any(c < " " for c in v):
            raise ValueError("identifier contains invalid characters")
        return v

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "identifier": "user_42",
                    "identifier_type": "user_id",
                    "endpoint": "/api/v1/search",
                    "algorithm": "sliding_window",
                    "user_tier": "free",
                }
            ]
        }
    }


# ── Response schemas ──────────────────────────────────────────────────────────

class RateLimitCheckResponse(BaseModel):
    """Successful (HTTP 200) rate limit check response."""

    allowed: bool
    identifier: str
    identifier_type: str
    remaining: int
    limit: int
    reset_after: int
    algorithm: str

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "allowed": True,
                    "identifier": "user_42",
                    "identifier_type": "user_id",
                    "remaining": 74,
                    "limit": 100,
                    "reset_after": 42,
                    "algorithm": "sliding_window",
                }
            ]
        }
    }


class RateLimitExceededResponse(BaseModel):
    """HTTP 429 Too Many Requests response body."""

    message: str = "Rate limit exceeded"
    retry_after: int

    model_config = {
        "json_schema_extra": {
            "examples": [{"message": "Rate limit exceeded", "retry_after": 25}]
        }
    }


class HealthResponse(BaseModel):
    status: str
    storage_backend: str
    storage_healthy: bool
    version: str
    uptime_seconds: float


class MetricsSummary(BaseModel):
    total_requests: int
    allowed_requests: int
    blocked_requests: int
    active_users: int
    active_api_keys: int
    active_ips: int
