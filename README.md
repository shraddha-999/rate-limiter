# RateGuard — Distributed Rate Limiter

A production-ready distributed rate limiter with a full-stack SaaS dashboard. Backend built with **FastAPI**, **Redis**, and **Python 3.12**. Frontend is a **React 19** dashboard with real-time charts, algorithm visualizations, and a request simulator.

**Live Demo → [rate-limiter-silk.vercel.app](https://rate-limiter-silk.vercel.app/simulator)**

---

## What's Inside

| Layer | Stack |
|---|---|
| **API** | FastAPI, Python 3.12, Uvicorn, asyncio |
| **Rate Limiting** | 3 algorithms via atomic Lua scripts in Redis |
| **Metrics** | Prometheus + Grafana dashboards |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Recharts |
| **State** | TanStack Query (server), Zustand (client) |
| **Animations** | Framer Motion, shadcn/ui components |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    RateGuard Dashboard                       │
│         React 19 + TanStack Query + Zustand                 │
│  Dashboard │ Simulator │ Config CRUD │ Algorithm Visualizer │
└──────────────────────────┬───────────────────────────────────┘
                           │ REST (Axios, /api proxy)
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                     FastAPI Application                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │  Auth       │  │  Logging     │  │  CORS              │  │
│  │  Middleware │  │  Middleware  │  │  Middleware         │  │
│  └──────┬──────┘  └──────────────┘  └────────────────────┘  │
│         │                                                    │
│  ┌──────▼─────────────────────────────────────────────────┐  │
│  │                     Controllers                        │  │
│  │  POST /rate-limit/check  │  /config CRUD  │  /health   │  │
│  └──────┬──────────────────────────────────────────────────┘  │
│         │                                                    │
│  ┌──────▼────────────────────────────────────────────────┐  │
│  │                      Services                         │  │
│  │  RateLimitService  │  ConfigService                   │  │
│  └──────┬───────────────────┬────────────────────────────┘  │
│         │                   │                               │
│  ┌──────▼──────┐   ┌────────▼─────────────────────────┐   │
│  │  Algorithm  │   │        Repositories               │   │
│  │  Factory    │   │  ConfigRepo │ BaseRepository       │   │
│  │  (Strategy) │   └──────────┬──────────────────────┘   │
│  │  ┌────────┐ │              │                           │
│  │  │Fixed W.│ │   ┌──────────▼──────────────────────┐  │
│  │  │Sliding │ │   │  Storage Backend (DI swappable) │  │
│  │  │Token B.│ │   │  RedisRepository │ MemoryRepo   │  │
│  │  └────────┘ │   └──────────┬──────────────────────┘  │
│  └─────────────┘              │                           │
└─────────────────────────────-─┼───────────────────────────┘
                                │
                    ┌───────────▼──────────┐
                    │        Redis         │
                    │  (Lua scripts for    │
                    │   atomic ops)        │
                    └──────────────────────┘
```

---

## Dashboard Pages

| Page | Description |
|---|---|
| **Dashboard** | Live metrics cards, requests over time, allowed/blocked ratio |
| **Request Simulator** | Fire 1–1000 requests, watch results in real-time, export CSV |
| **Configurations** | Full CRUD for rate limit rules, tag management |
| **Algorithm Visualizer** | Animated step-by-step view of all 4 algorithms |
| **Redis Inspector** | Key pattern reference for all algorithm storage layouts |
| **Metrics** | Parsed Prometheus metrics with bar chart distribution |
| **Logs** | Persisted simulator history, searchable, filterable, exportable |
| **API Docs** | Built-in curl examples with copy button, links to Swagger/ReDoc |
| **Settings** | Theme (dark/light), refresh intervals, backend URL switcher |

---

## Folder Structure

```
rate-limiter/
├── app/                              # FastAPI backend
│   ├── main.py                       # App factory & lifespan
│   ├── controllers/
│   │   ├── rate_limit_controller.py  # POST /rate-limit/check
│   │   ├── config_controller.py      # CRUD /config
│   │   └── health_controller.py      # GET /health, /metrics
│   ├── services/
│   │   ├── rate_limit_service.py
│   │   └── config_service.py
│   ├── repositories/
│   │   ├── redis_repository.py       # Production (Lua + evalsha)
│   │   ├── memory_repository.py      # Dev / tests (Lua emulator)
│   │   └── config_repository.py
│   ├── algorithms/
│   │   ├── fixed_window.py           # Redis HASH counter
│   │   ├── sliding_window.py         # Redis ZSET log
│   │   ├── token_bucket.py           # Redis HASH (tokens + ts)
│   │   └── factory.py                # Strategy pattern
│   ├── middleware/
│   │   ├── auth_middleware.py        # X-Admin-Key / X-API-Key
│   │   └── logging_middleware.py
│   ├── models/                       # Domain dataclasses
│   ├── schemas/                      # Pydantic request/response
│   └── config/settings.py            # Pydantic-settings + hot reload
│
├── frontend/                         # React dashboard
│   ├── src/
│   │   ├── pages/                    # 9 pages (lazy-loaded)
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn-style Radix components
│   │   │   ├── charts/               # Recharts wrappers
│   │   │   ├── algorithms/           # Animated visualizations
│   │   │   └── shared/               # Sidebar, Header, MetricCard
│   │   ├── services/                 # Axios API clients
│   │   ├── store/                    # Zustand slices (auth, logs, settings)
│   │   ├── types/                    # Shared TypeScript interfaces
│   │   └── lib/utils.ts              # cn(), parsePrometheusMetrics(), downloadCSV()
│   ├── crypto-polyfill.cjs           # Patches node:crypto for Vite 5 on Node < 19
│   └── package.json
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── concurrency/
│   └── stress/
├── prometheus/prometheus.yml
├── grafana/
├── Dockerfile
├── docker-compose.yml
└── requirements.txt
```

---

## Algorithms

| Algorithm | Storage | Best For |
|---|---|---|
| **Fixed Window** | Redis `HASH` key + TTL | Simple, low-overhead APIs |
| **Sliding Window Log** | Redis `ZSET` of timestamps | Strict per-second limits, no boundary bursts |
| **Token Bucket** | Redis `HASH` (tokens + last_refill) | APIs that tolerate short bursts |

All three use **atomic Lua scripts** executed via `EVALSHA` — no race conditions, no WATCH/MULTI/EXEC overhead.

---

## Running Locally

### Backend (no Docker)

```bash
cd rate-limiter

# Option A: in-memory (no Redis needed)
pip install -r requirements.txt
STORAGE_BACKEND=memory uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Option B: with Redis
brew install redis && brew services start redis
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev        # → http://localhost:3000
```

On the Login page set **Backend URL** to `http://localhost:8000` and **Admin Key** to `change-me-in-production`.

### Full stack with Docker

```bash
cp .env.example .env   # set ADMIN_API_KEY at minimum
docker compose up --build
```

| Service | URL |
|---|---|
| Dashboard | http://localhost:3000 |
| API | http://localhost:8000 |
| Swagger | http://localhost:8000/docs |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 (admin/admin) |

---

## API Reference

### `POST /rate-limit/check`

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

**200 Allowed:**
```json
{
  "allowed": true,
  "identifier": "user_42",
  "remaining": 74,
  "limit": 100,
  "reset_after": 42,
  "algorithm": "sliding_window"
}
```

**429 Rate Limited:**
```json
{ "message": "Rate limit exceeded", "retry_after": 25 }
```
Response headers: `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`

### Config CRUD (requires `X-Admin-Key`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/config` | Create a rule |
| `GET` | `/config` | List all rules |
| `GET` | `/config/{id}` | Get single rule |
| `PUT` | `/config/{id}` | Update (hot-reload, no restart) |
| `DELETE` | `/config/{id}` | Delete rule |
| `GET` | `/health` | Health + uptime + Redis status |
| `GET` | `/metrics` | Prometheus metrics (text/plain) |

Full interactive docs: `http://localhost:8000/docs`

---

## User Tiers

| Tier | Default Limit | Env Override |
|---|---|---|
| `free` | 100 req/min | `FREE_TIER_LIMIT` |
| `premium` | 1000 req/min | `PREMIUM_TIER_LIMIT` |
| `enterprise` | Unlimited | `ENTERPRISE_TIER_LIMIT` |

---

## Running Tests

```bash
pytest                          # all tests
pytest -m "not stress"          # skip stress tests (fast CI)
pytest tests/unit/              # unit only
pytest --cov=app --cov-report=html && open htmlcov/index.html
```

---

## Deploying (Free Tier)

| Service | Platform | Notes |
|---|---|---|
| Frontend | [Vercel](https://vercel.com) | Root dir: `frontend/`, auto-detects Vite |
| Backend | [Render](https://render.com) | Start cmd: `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Redis | [Upstash](https://upstash.com) | Free 10k req/day, copy `REDIS_URL` to Render env vars |

Set `VITE_API_URL=https://your-backend.onrender.com` in Vercel environment variables.

---

## Design Decisions

**Why Lua scripts for Redis?**
All algorithms do read-modify-write. Without atomicity, concurrent requests race and exceed the limit. Lua scripts run atomically in Redis — no WATCH/MULTI/EXEC, no extra round trips.

**Why the Repository Pattern?**
Decouples algorithms from Redis. The in-memory backend lets tests run at full speed without a Redis instance and lets you swap storage with a single env var.

**Why Sliding Window over Fixed Window as default?**
Fixed Window has the "boundary burst" problem — clients can send 2× the limit by timing requests around window resets. Sliding Window eliminates this at the cost of O(n) memory per key (bounded by the limit).

**Why asyncio throughout?**
FastAPI is async-native. Async Redis calls never block the event loop — a single worker handles thousands of concurrent rate limit checks.

**Hot-reload configuration**
`PUT /config/{id}` writes to Redis immediately. The next request to `RateLimitService._resolve_config` picks up the new rule with no restart needed.
