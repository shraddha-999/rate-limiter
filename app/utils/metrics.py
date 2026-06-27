from __future__ import annotations
"""Prometheus metrics definitions and helpers."""

from prometheus_client import Counter, Gauge, Histogram, Info, CollectorRegistry, REGISTRY

# ── Counters ──────────────────────────────────────────────────────────────────

REQUESTS_TOTAL = Counter(
    "rate_limiter_requests_total",
    "Total number of rate limit check requests",
    ["identifier_type", "algorithm", "endpoint"],
)

REQUESTS_ALLOWED = Counter(
    "rate_limiter_requests_allowed_total",
    "Total number of allowed requests",
    ["identifier_type", "algorithm", "endpoint"],
)

REQUESTS_BLOCKED = Counter(
    "rate_limiter_requests_blocked_total",
    "Total number of blocked (rate limited) requests",
    ["identifier_type", "algorithm", "endpoint"],
)

REDIS_ERRORS = Counter(
    "rate_limiter_redis_errors_total",
    "Total Redis operation errors",
    ["operation"],
)

CONFIG_RELOADS = Counter(
    "rate_limiter_config_reloads_total",
    "Total number of configuration reloads",
)

# ── Gauges ────────────────────────────────────────────────────────────────────

ACTIVE_IDENTIFIERS = Gauge(
    "rate_limiter_active_identifiers",
    "Number of unique identifiers currently tracked",
    ["identifier_type"],
)

BLACKLISTED_COUNT = Gauge(
    "rate_limiter_blacklisted_total",
    "Number of currently blacklisted identifiers",
)

WHITELISTED_COUNT = Gauge(
    "rate_limiter_whitelisted_total",
    "Number of currently whitelisted identifiers",
)

# ── Histograms ────────────────────────────────────────────────────────────────

REQUEST_LATENCY = Histogram(
    "rate_limiter_request_duration_seconds",
    "Time spent processing a rate limit check",
    ["identifier_type", "algorithm"],
    buckets=(0.0005, 0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0),
)

REDIS_LATENCY = Histogram(
    "rate_limiter_redis_operation_duration_seconds",
    "Time spent on Redis operations",
    ["operation"],
    buckets=(0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1),
)

# ── Info ──────────────────────────────────────────────────────────────────────

APP_INFO = Info("rate_limiter_app", "Application metadata")


def initialize_metrics(app_name: str, version: str, environment: str) -> None:
    """Populate static info metrics at startup."""
    APP_INFO.info({
        "name": app_name,
        "version": version,
        "environment": environment,
    })
