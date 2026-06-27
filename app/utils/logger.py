from __future__ import annotations
"""Structured JSON logging setup for the rate limiter application."""

import json
import logging
import sys
import time
import traceback
from typing import Any, Optional


class JSONFormatter(logging.Formatter):
    """Formats log records as single-line JSON."""

    def format(self, record: logging.LogRecord) -> str:
        log_data: dict[str, Any] = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S.%f"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Merge any extra context fields passed via `extra=`
        for key, value in record.__dict__.items():
            if key not in {
                "name", "msg", "args", "levelname", "levelno", "pathname",
                "filename", "module", "exc_info", "exc_text", "stack_info",
                "lineno", "funcName", "created", "msecs", "relativeCreated",
                "thread", "threadName", "processName", "process", "message",
                "taskName",
            } and not key.startswith("_"):
                log_data[key] = value

        return json.dumps(log_data, default=str)


def setup_logging(level: str = "INFO", log_format: str = "json") -> None:
    """Configure root logger with structured output."""
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    if log_format == "json":
        handler.setFormatter(JSONFormatter())
    else:
        handler.setFormatter(
            logging.Formatter(
                "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
                datefmt="%Y-%m-%dT%H:%M:%S",
            )
        )
    root_logger.addHandler(handler)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


class RequestLogger:
    """Helper that logs per-request rate limit decisions with structured fields."""

    def __init__(self) -> None:
        self._logger = get_logger("rate_limiter.requests")

    def log_allowed(
        self,
        identifier: str,
        identifier_type: str,
        endpoint: str,
        remaining: int,
        algorithm: str,
        latency_ms: float,
    ) -> None:
        self._logger.info(
            "Request allowed",
            extra={
                "event": "allowed",
                "identifier": identifier,
                "identifier_type": identifier_type,
                "endpoint": endpoint,
                "remaining": remaining,
                "algorithm": algorithm,
                "latency_ms": round(latency_ms, 3),
            },
        )

    def log_blocked(
        self,
        identifier: str,
        identifier_type: str,
        endpoint: str,
        retry_after: int,
        algorithm: str,
        latency_ms: float,
    ) -> None:
        self._logger.warning(
            "Request blocked",
            extra={
                "event": "blocked",
                "identifier": identifier,
                "identifier_type": identifier_type,
                "endpoint": endpoint,
                "retry_after": retry_after,
                "algorithm": algorithm,
                "latency_ms": round(latency_ms, 3),
            },
        )

    def log_error(self, error: Exception, context: Optional[dict] = None) -> None:
        self._logger.error(
            "Rate limiter error",
            extra={
                "event": "error",
                "error_type": type(error).__name__,
                "error_message": str(error),
                **(context or {}),
            },
        )
