# Rate Limiter

Production-ready distributed Rate Limiter built with **FastAPI**, **Redis**, and **Python 3.12**. Implements three algorithms, Prometheus metrics, Grafana dashboards, hot-reload configuration, and user tiers — all deployable with a single `docker compose up`.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Request                          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FastAPI Application                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Auth        │  │  Logging     │  │  CORS                │  │
│  │  Middleware  │  │  Middleware  │  │  Middleware           │  │
│  └──────┬───────┘  └──────────────┘  └──────────────────────┘  │
│         │                                                       │
│  ┌──────▼───────────────────────────────────────────────────┐  │
│  │                      Controllers                         │  │
│  │  POST /rate-limit/check  │  /config CRUD  │  /health     │  │
│  └──────┬───────────────────────────────────────────────────┘  │
│         │                                                       │
│  ┌──────▼───────────────────────────────────────────────────┐  │
│  │                       Services                           │  │
│  │  RateLimitService  │  ConfigService                      │  │
│  └──────┬───────────────────┬───────────────────────────────┘  │
│         │                   │                                   │
│  ┌──────▼──────┐   ┌────────▼──────────────────────────────┐  │
│  │  Algorithm  │   │           Repositories                │  │
│  │  Factory    │   │  ConfigRepository  │  BaseRepository   │  │
│  │  (Strategy) │   └──────────┬───────────────────────────┘  │
│  │  ┌────────┐ │              │                               │  │
│  │  │Fixed W.│ │   ┌──────────▼──────────────────────────┐  │  │
│  │  │Sliding │ │   │     Storage Backend (DI swappable)  │  │  │
│  │  │Token B.│ │   │  RedisRepository │ MemoryRepository │  │  │
│  │  └────────┘ │   └──────────┬────────────────────────────┘  │
│  └─────────────┘              │                               │
└──────────────────────────────-┼───────────────────────────────┘
                                │
                    ┌───────────▼──────────┐
                    │        Redis         │
                    │  (Lua scripts for    │
                    │   atomic ops)        │
                    └──────────────────────┘
```

---

## Folder Structure

```
rate_limiter/
├── app/
│   ├── main.py                   # FastAPI app factory & lifespan
│   ├── dependencies.py           # DI container
│   ├── controllers/
│   │   ├── rate_limit_controller.py
│   │   ├── config_controller.py
│   │   └── health_controller.py
│   ├── services/
│   │   ├── rate_limit_service.py
│   │   └── config_service.py
│   ├── repositories/
│   │   ├── base_repository.py    # Abstract interface
│   │   ├── redis_repository.py   # Production
│   │   ├── memory_repository.py  # Dev / tests
│   │   └── config_repository.py
│   ├── algorithms/
│   │   ├── base_limiter.py       # Abstract base
│   │   ├── fixed_window.py
│   │   ├── sliding_window.py
│   │   ├── token_bucket.py
│   │   └── factory.py            # Strategy pattern
│   ├── middleware/
│   │   ├── auth_middleware.py
│   │   └── logging_middleware.py
│   ├── models/                   # Domain models
│   ├── schemas/                  # Pydantic request/response
│   ├── config/settings.py        # Pydantic-settings w/ hot reload
│   ├── utils/
│   │   ├── logger.py             # Structured JSON logging
│   │   └── metrics.py            # Prometheus definitions
│   └── exceptions/exceptions.py
├── tests/
│   ├── conftest.py
│   ├── unit/
│   ├── integration/
│   ├── concurrency/
│   └── stress/
├── prometheus/prometheus.yml
├── grafana/
│   ├── dashboards/rate_limiter.json
│   └── provisioning/
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── pytest.ini
├── .env.example
└── README.md
```

---

## Algorithms

| Algorithm | Description | Best For |
|---|---|---|
| **Fixed Window** | Counter resets at fixed intervals | Simple, low-overhead APIs |
| **Sliding Window Log** | Sorted-set of timestamps, no boundary bursts | Strict per-second limits |
| **Token Bucket** | Tokens refill at a steady rate; burst allowed | APIs that tolerate short bursts |

Select the algorithm globally via `DEFAULT_ALGORITHM` in `.env`, or per-config via the API.

---

## API Documentation

### POST `/rate-limit/check`
Check whether an identifier has quota remaining.

```bash
curl -X POST http://localhost:8000/rate-limit/check \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "user_42",
    "identifier_type": "user_id",
    "endpoint": "/api/v1/search",
    "algorithm": "sliding_window",
    "user_tier": "free"
  }'
```

**200 OK (allowed):**
```json
{
  "allowed": true,
  "identifier": "user_42",
  "identifier_type": "user_id",
  "remaining": 74,
  "limit": 100,
  "reset_after": 42,
  "algorithm": "sliding_window"
}
```

**429 Too Many Requests:**
```json
{
  "message": "Rate limit exceeded",
  "retry_after": 25
}
```
Headers: `Retry-After: 25`, `X-RateLimit-Limit: 100`, `X-RateLimit-Remaining: 0`

---

### POST `/config` — Create a rate limit rule
Requires `X-Admin-Key` header.

```bash
curl -X POST http://localhost:8000/config \
  -H "X-Admin-Key: your-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "identifier_type": "api_key",
    "identifier": "*",
    "algorithm": "token_bucket",
    "limit": 1000,
    "window_seconds": 60,
    "burst_capacity": 200,
    "refill_rate": 16.67,
    "user_tier": "premium",
    "enabled": true
  }'
```

### GET `/config` — List all configs
### GET `/config/{id}` — Get single config
### PUT `/config/{id}` — Update (hot-reload, no restart)
### DELETE `/config/{id}` — Delete config
### GET `/health` — Health check
### GET `/metrics` — Prometheus metrics (text/plain)

Full interactive docs at: `http://localhost:8000/docs`

---

## User Tiers

| Tier | Default Limit | Override |
|---|---|---|
| `free` | 100 req/min | `FREE_TIER_LIMIT` |
| `premium` | 1000 req/min | `PREMIUM_TIER_LIMIT` |
| `enterprise` | Unlimited | `ENTERPRISE_TIER_LIMIT` |

---

## Setup Instructions

### Local Development (in-memory backend)

```bash
git clone https://github.com/shraddha-999/rate-limiter.git
cd rate-limiter

python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Set STORAGE_BACKEND=memory for local dev

uvicorn app.main:app --reload
```

### Docker (full stack)

```bash
cp .env.example .env
# Edit .env — at minimum set ADMIN_API_KEY

docker compose up --build
```

| Service | URL |
|---|---|
| API | http://localhost:8000 |
| Swagger | http://localhost:8000/docs |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3000 (admin/admin) |

---

## Running Tests

```bash
# All tests
pytest

# Skip stress tests (faster CI)
pytest -m "not stress"

# Unit tests only
pytest tests/unit/

# With coverage report
pytest --cov=app --cov-report=html
open htmlcov/index.html
```

---

## Design Decisions

**Why Lua scripts for Redis?**
All three algorithms perform a read-modify-write cycle. Without atomicity, concurrent requests can race and allow more requests than the limit. Lua scripts run atomically in Redis — no WATCH/MULTI/EXEC needed, and no round-trip overhead.

**Why the Repository Pattern?**
It decouples algorithms and services from Redis. The in-memory backend lets tests run at full speed without a Redis instance, and lets you swap storage with a one-line config change.

**Why Sliding Window over Fixed Window by default?**
Fixed Window has the "double-spend" problem — a client can make 2× the limit by timing requests around window boundaries. Sliding Window eliminates this at the cost of O(n) memory per key (bounded by the request limit).

**Why asyncio throughout?**
FastAPI is async-native. Using async Redis calls means the event loop is never blocked — a single worker can handle thousands of in-flight rate limit checks concurrently.

**Hot-reload configuration**
Config updates are stored in Redis/memory. `PUT /config/{id}` writes immediately; the next request that hits `RateLimitService._resolve_config` reads the new value without any restart.

---

## Future Improvements

- **Per-region limits** — route to region-specific Redis clusters based on `X-Region` header
- **GraphQL API** — expose config management as a GraphQL schema
- **WebSocket live dashboard** — real-time blocked/allowed stream
- **gRPC interface** — for service-to-service rate limit checks with lower latency
- **Distributed counters** — Redis Cluster support with consistent hashing
- **ML-based adaptive limits** — dynamically adjust limits based on historical traffic patterns
