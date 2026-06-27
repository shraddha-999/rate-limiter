from __future__ import annotations
"""Application settings loaded from environment variables with hot-reload support."""

import os
import threading
from functools import lru_cache
from typing import Literal, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Application
    app_name: str = Field(default="Rate Limiter API", env="APP_NAME")
    app_version: str = Field(default="1.0.0", env="APP_VERSION")
    debug: bool = Field(default=False, env="DEBUG")
    environment: str = Field(default="production", env="ENVIRONMENT")

    # Server
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8000, env="PORT")
    workers: int = Field(default=4, env="WORKERS")

    # Redis
    redis_url: str = Field(default="redis://localhost:6379/0", env="REDIS_URL")
    redis_max_connections: int = Field(default=50, env="REDIS_MAX_CONNECTIONS")
    redis_socket_timeout: float = Field(default=1.0, env="REDIS_SOCKET_TIMEOUT")
    redis_retry_on_timeout: bool = Field(default=True, env="REDIS_RETRY_ON_TIMEOUT")

    # Storage backend: "redis" or "memory"
    storage_backend: Literal["redis", "memory"] = Field(
        default="redis", env="STORAGE_BACKEND"
    )

    # Default rate limiting
    default_algorithm: Literal["fixed_window", "sliding_window", "token_bucket"] = Field(
        default="sliding_window", env="DEFAULT_ALGORITHM"
    )
    default_limit: int = Field(default=100, env="DEFAULT_LIMIT")
    default_window_seconds: int = Field(default=60, env="DEFAULT_WINDOW_SECONDS")
    default_burst_capacity: int = Field(default=20, env="DEFAULT_BURST_CAPACITY")
    default_refill_rate: float = Field(default=1.67, env="DEFAULT_REFILL_RATE")

    # User tiers
    free_tier_limit: int = Field(default=100, env="FREE_TIER_LIMIT")
    premium_tier_limit: int = Field(default=1000, env="PREMIUM_TIER_LIMIT")
    enterprise_tier_limit: int = Field(default=999999, env="ENTERPRISE_TIER_LIMIT")

    # Admin
    admin_api_key: str = Field(default="change-me-in-production", env="ADMIN_API_KEY")
    allowed_api_keys: str = Field(default="", env="ALLOWED_API_KEYS")

    # Monitoring
    prometheus_enabled: bool = Field(default=True, env="PROMETHEUS_ENABLED")
    metrics_path: str = Field(default="/metrics", env="METRICS_PATH")

    # Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    log_format: Literal["json", "text"] = Field(default="json", env="LOG_FORMAT")

    # Security
    whitelist_ips: str = Field(default="", env="WHITELIST_IPS")
    blacklist_ips: str = Field(default="", env="BLACKLIST_IPS")

    # Config hot-reload
    config_reload_interval: int = Field(default=30, env="CONFIG_RELOAD_INTERVAL")

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        valid = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        upper = v.upper()
        if upper not in valid:
            raise ValueError(f"log_level must be one of {valid}")
        return upper

    def get_allowed_api_keys(self) -> list[str]:
        if not self.allowed_api_keys:
            return []
        return [k.strip() for k in self.allowed_api_keys.split(",") if k.strip()]

    def get_whitelist_ips(self) -> list[str]:
        if not self.whitelist_ips:
            return []
        return [ip.strip() for ip in self.whitelist_ips.split(",") if ip.strip()]

    def get_blacklist_ips(self) -> list[str]:
        if not self.blacklist_ips:
            return []
        return [ip.strip() for ip in self.blacklist_ips.split(",") if ip.strip()]


class SettingsManager:
    """Thread-safe singleton settings manager supporting hot-reload."""

    _instance: Optional["SettingsManager"] = None
    _lock: threading.Lock = threading.Lock()

    def __init__(self) -> None:
        self._settings = Settings()
        self._reload_lock = threading.RLock()

    @classmethod
    def get_instance(cls) -> "SettingsManager":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    @property
    def settings(self) -> Settings:
        with self._reload_lock:
            return self._settings

    def reload(self) -> Settings:
        """Reload settings from environment without restarting."""
        with self._reload_lock:
            self._settings = Settings()
            return self._settings


def get_settings() -> Settings:
    return SettingsManager.get_instance().settings
