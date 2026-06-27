"""Shared pytest fixtures for all test suites."""

import asyncio
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient

from app.algorithms.factory import AlgorithmFactory
from app.config.settings import Settings
from app.dependencies import set_storage
from app.main import create_app
from app.models.rate_limit import Algorithm, IdentifierType, RateLimitConfig, UserTier
from app.repositories.memory_repository import MemoryRepository
from app.repositories.config_repository import ConfigRepository
from app.services.config_service import ConfigService
from app.services.rate_limit_service import RateLimitService


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def memory_storage() -> AsyncGenerator[MemoryRepository, None]:
    storage = MemoryRepository()
    yield storage
    await storage.close()


@pytest_asyncio.fixture
async def config_repo(memory_storage) -> ConfigRepository:
    return ConfigRepository(memory_storage)


@pytest_asyncio.fixture
async def algorithm_factory(memory_storage) -> AlgorithmFactory:
    return AlgorithmFactory(memory_storage)


@pytest.fixture
def test_settings() -> Settings:
    return Settings(
        storage_backend="memory",
        default_algorithm="sliding_window",
        default_limit=10,
        default_window_seconds=60,
        default_burst_capacity=5,
        default_refill_rate=0.17,
        free_tier_limit=10,
        premium_tier_limit=100,
        enterprise_tier_limit=999999,
        admin_api_key="test-admin-key",
        allowed_api_keys="test-api-key",
        log_level="ERROR",  # Suppress logs during tests
    )


@pytest_asyncio.fixture
async def rate_limit_service(config_repo, algorithm_factory, test_settings) -> RateLimitService:
    return RateLimitService(config_repo, algorithm_factory, test_settings)


@pytest_asyncio.fixture
async def config_service(config_repo, test_settings) -> ConfigService:
    return ConfigService(config_repo, test_settings)


@pytest.fixture
def sample_config() -> RateLimitConfig:
    return RateLimitConfig(
        id="test-config-1",
        identifier_type=IdentifierType.USER_ID,
        identifier="*",
        algorithm=Algorithm.SLIDING_WINDOW,
        limit=5,
        window_seconds=60,
        burst_capacity=2,
        refill_rate=0.08,
    )


@pytest.fixture
def token_bucket_config() -> RateLimitConfig:
    return RateLimitConfig(
        id="test-config-tb",
        identifier_type=IdentifierType.USER_ID,
        identifier="*",
        algorithm=Algorithm.TOKEN_BUCKET,
        limit=10,
        window_seconds=60,
        burst_capacity=5,
        refill_rate=1.0,
    )


@pytest.fixture
def fixed_window_config() -> RateLimitConfig:
    return RateLimitConfig(
        id="test-config-fw",
        identifier_type=IdentifierType.USER_ID,
        identifier="*",
        algorithm=Algorithm.FIXED_WINDOW,
        limit=5,
        window_seconds=60,
    )


@pytest_asyncio.fixture
async def async_client(monkeypatch) -> AsyncGenerator[AsyncClient, None]:
    # Configure test-specific environment so get_settings() returns test values
    monkeypatch.setenv("STORAGE_BACKEND", "memory")
    monkeypatch.setenv("FREE_TIER_LIMIT", "5")
    monkeypatch.setenv("PREMIUM_TIER_LIMIT", "100")
    monkeypatch.setenv("ENTERPRISE_TIER_LIMIT", "999999")
    monkeypatch.setenv("DEFAULT_LIMIT", "5")
    monkeypatch.setenv("DEFAULT_WINDOW_SECONDS", "60")
    monkeypatch.setenv("ADMIN_API_KEY", "test-admin-key")
    monkeypatch.setenv("ALLOWED_API_KEYS", "")
    monkeypatch.setenv("LOG_LEVEL", "ERROR")

    # Reset the SettingsManager singleton so it re-reads the patched env
    from app.config.settings import SettingsManager
    SettingsManager._instance = None

    storage = MemoryRepository()
    set_storage(storage)
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client
    await storage.close()
    # Restore singleton for subsequent test modules
    SettingsManager._instance = None
