from __future__ import annotations
"""Pydantic schemas for configuration CRUD endpoints."""

from typing import Annotated, Optional
from pydantic import BaseModel, Field, model_validator

from app.models.rate_limit import Algorithm, IdentifierType, UserTier


class ConfigCreateRequest(BaseModel):
    """POST /config request body."""

    identifier_type: IdentifierType
    identifier: Annotated[str, Field(default="*", max_length=256)]
    algorithm: Algorithm
    limit: Annotated[int, Field(gt=0, le=10_000_000)]
    window_seconds: Annotated[int, Field(gt=0, le=86400)]
    burst_capacity: Annotated[int, Field(default=0, ge=0)]
    refill_rate: Annotated[float, Field(default=0.0, ge=0.0)]
    user_tier: Optional[UserTier] = None
    endpoint: Optional[str] = None
    enabled: bool = True
    expires_in_seconds: Optional[int] = Field(default=None, gt=0)
    tags: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_token_bucket_fields(self) -> "ConfigCreateRequest":
        if self.algorithm == Algorithm.TOKEN_BUCKET and self.refill_rate <= 0:
            raise ValueError("refill_rate must be > 0 for token_bucket algorithm")
        return self

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "identifier_type": "user_id",
                    "identifier": "*",
                    "algorithm": "sliding_window",
                    "limit": 100,
                    "window_seconds": 60,
                    "burst_capacity": 20,
                    "refill_rate": 1.67,
                    "user_tier": "free",
                    "endpoint": "/api/v1/search",
                    "enabled": True,
                    "tags": ["default", "free-tier"],
                }
            ]
        }
    }


class ConfigUpdateRequest(BaseModel):
    """PUT /config/{id} request body — all fields optional."""

    algorithm: Optional[Algorithm] = None
    limit: Optional[Annotated[int, Field(gt=0, le=10_000_000)]] = None
    window_seconds: Optional[Annotated[int, Field(gt=0, le=86400)]] = None
    burst_capacity: Optional[Annotated[int, Field(ge=0)]] = None
    refill_rate: Optional[Annotated[float, Field(ge=0.0)]] = None
    user_tier: Optional[UserTier] = None
    endpoint: Optional[str] = None
    enabled: Optional[bool] = None
    expires_in_seconds: Optional[int] = Field(default=None, gt=0)
    tags: Optional[list[str]] = None


class ConfigResponse(BaseModel):
    """Single config entry response."""

    id: str
    identifier_type: str
    identifier: str
    algorithm: str
    limit: int
    window_seconds: int
    burst_capacity: int
    refill_rate: float
    user_tier: Optional[str]
    endpoint: Optional[str]
    enabled: bool
    expires_at: Optional[float]
    tags: list[str]


class ConfigListResponse(BaseModel):
    total: int
    configs: list[ConfigResponse]
