from __future__ import annotations
"""FastAPI dependency injection container.

All application-level singletons are created once at startup and injected
via FastAPI's Depends() mechanism.  This makes every layer independently
testable — pass a mock storage in tests, a real Redis in production.
"""

from functools import lru_cache
from typing import AsyncGenerator

from fastapi import Depends

from app.algorithms.factory import AlgorithmFactory
from app.config.settings import Settings, get_settings
from app.repositories.base_repository import BaseRepository
from app.repositories.config_repository import ConfigRepository
from app.repositories.memory_repository import MemoryRepository
from app.repositories.redis_repository import RedisRepository
from app.services.config_service import ConfigService
from app.services.rate_limit_service import RateLimitService

# Module-level singletons (created at startup via lifespan)
_storage: BaseRepository | None = None
_config_repo: ConfigRepository | None = None
_algorithm_factory: AlgorithmFactory | None = None


def set_storage(storage: BaseRepository) -> None:
    global _storage, _config_repo, _algorithm_factory
    _storage = storage
    _config_repo = ConfigRepository(storage)
    _algorithm_factory = AlgorithmFactory(storage)


def get_storage_backend() -> BaseRepository:
    assert _storage is not None, "Storage not initialized"
    return _storage


def get_config_repo() -> ConfigRepository:
    assert _config_repo is not None, "ConfigRepository not initialized"
    return _config_repo


def get_algorithm_factory() -> AlgorithmFactory:
    assert _algorithm_factory is not None, "AlgorithmFactory not initialized"
    return _algorithm_factory


def get_rate_limit_service(
    config_repo: ConfigRepository = Depends(get_config_repo),
    factory: AlgorithmFactory = Depends(get_algorithm_factory),
    settings: Settings = Depends(get_settings),
) -> RateLimitService:
    return RateLimitService(config_repo, factory, settings)


def get_config_service(
    config_repo: ConfigRepository = Depends(get_config_repo),
    settings: Settings = Depends(get_settings),
) -> ConfigService:
    return ConfigService(config_repo, settings)
