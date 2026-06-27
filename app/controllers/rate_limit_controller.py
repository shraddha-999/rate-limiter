from __future__ import annotations
"""Rate limit check endpoint — POST /rate-limit/check."""

from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.responses import JSONResponse

from app.dependencies import get_rate_limit_service
from app.exceptions.exceptions import (
    BlacklistedException,
    RateLimitExceededException,
    RedisUnavailableException,
)
from app.models.rate_limit import IdentifierType
from app.schemas.rate_limit_schema import (
    RateLimitCheckRequest,
    RateLimitCheckResponse,
    RateLimitExceededResponse,
)
from app.services.rate_limit_service import RateLimitService

router = APIRouter(prefix="/rate-limit", tags=["Rate Limiting"])


@router.post(
    "/check",
    response_model=RateLimitCheckResponse,
    status_code=status.HTTP_200_OK,
    summary="Check rate limit for an identifier",
    description=(
        "Performs an atomic rate limit check. Returns 200 if the request is allowed "
        "with remaining quota, or 429 with Retry-After if the limit is exceeded."
    ),
    responses={
        200: {"model": RateLimitCheckResponse, "description": "Request allowed"},
        429: {"model": RateLimitExceededResponse, "description": "Rate limit exceeded"},
        401: {"description": "Unauthorized"},
        403: {"description": "Identifier is blacklisted"},
        503: {"description": "Storage backend unavailable"},
    },
)
async def check_rate_limit(
    body: RateLimitCheckRequest,
    response: Response,
    service: RateLimitService = Depends(get_rate_limit_service),
):
    """
    Check whether *identifier* has remaining quota.

    - **identifier**: user ID, API key, IP address, or endpoint string
    - **identifier_type**: how to categorise the identifier
    - **endpoint**: the API path being accessed (used for per-endpoint limits)
    - **algorithm**: optional override (uses configured default otherwise)
    - **user_tier**: `free` | `premium` | `enterprise`
    """
    try:
        result = await service.check(
            identifier=body.identifier,
            identifier_type=body.identifier_type,
            endpoint=body.endpoint,
            algorithm_override=body.algorithm,
            user_tier=body.user_tier,
        )
        # Attach rate limit headers
        for k, v in result.headers.items():
            response.headers[k] = v

        return RateLimitCheckResponse(
            allowed=result.allowed,
            identifier=result.identifier,
            identifier_type=result.identifier_type,
            remaining=result.remaining,
            limit=result.limit,
            reset_after=result.reset_after,
            algorithm=result.algorithm,
        )

    except RateLimitExceededException as exc:
        return JSONResponse(
            status_code=429,
            content={"message": exc.message, "retry_after": exc.retry_after},
            headers={"Retry-After": str(exc.retry_after)},
        )
    except BlacklistedException as exc:
        return JSONResponse(status_code=403, content={"message": exc.message})
    except RedisUnavailableException as exc:
        return JSONResponse(status_code=503, content={"message": exc.message})
