from __future__ import annotations
"""Configuration management endpoints — /config."""

from fastapi import APIRouter, Depends, status

from app.dependencies import get_config_service
from app.exceptions.exceptions import ConfigNotFoundException
from app.schemas.config_schema import (
    ConfigCreateRequest,
    ConfigListResponse,
    ConfigResponse,
    ConfigUpdateRequest,
)
from app.services.config_service import ConfigService

router = APIRouter(prefix="/config", tags=["Configuration"])


def _to_response(config) -> ConfigResponse:
    return ConfigResponse(
        id=config.id,
        identifier_type=config.identifier_type.value,
        identifier=config.identifier,
        algorithm=config.algorithm.value,
        limit=config.limit,
        window_seconds=config.window_seconds,
        burst_capacity=config.burst_capacity,
        refill_rate=config.refill_rate,
        user_tier=config.user_tier.value if config.user_tier else None,
        endpoint=config.endpoint,
        enabled=config.enabled,
        expires_at=config.expires_at,
        tags=config.tags,
    )


@router.post(
    "",
    response_model=ConfigResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a rate limit configuration",
    description="Creates a new rate limit rule. Requires X-Admin-Key header.",
)
async def create_config(
    body: ConfigCreateRequest,
    service: ConfigService = Depends(get_config_service),
):
    config = await service.create(body)
    return _to_response(config)


@router.get(
    "",
    response_model=ConfigListResponse,
    summary="List all active configurations",
    description="Returns all non-expired, active rate limit configurations.",
)
async def list_configs(
    service: ConfigService = Depends(get_config_service),
):
    configs = await service.list_all()
    return ConfigListResponse(
        total=len(configs),
        configs=[_to_response(c) for c in configs],
    )


@router.get(
    "/{config_id}",
    response_model=ConfigResponse,
    summary="Get a single configuration by ID",
)
async def get_config(
    config_id: str,
    service: ConfigService = Depends(get_config_service),
):
    config = await service.get(config_id)
    return _to_response(config)


@router.put(
    "/{config_id}",
    response_model=ConfigResponse,
    summary="Update a configuration (hot-reload, no restart needed)",
    description="Partially updates a config. Changes take effect immediately. Requires X-Admin-Key.",
)
async def update_config(
    config_id: str,
    body: ConfigUpdateRequest,
    service: ConfigService = Depends(get_config_service),
):
    config = await service.update(config_id, body)
    return _to_response(config)


@router.delete(
    "/{config_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a configuration",
    description="Removes a rate limit rule permanently. Requires X-Admin-Key.",
)
async def delete_config(
    config_id: str,
    service: ConfigService = Depends(get_config_service),
):
    await service.delete(config_id)
