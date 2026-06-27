from __future__ import annotations
"""API key authentication middleware.

Admin endpoints require the X-Admin-Key header.
Regular rate-limit endpoints require X-API-Key (if ALLOWED_API_KEYS is set).
Whitelisted IPs bypass authentication entirely.
"""

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config.settings import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

_ADMIN_PATHS = {"/config", "/config/"}
_OPEN_PATHS = {"/health", "/metrics", "/docs", "/openapi.json", "/redoc"}


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        settings = get_settings()
        client_ip = self._get_client_ip(request)

        # Whitelisted IPs skip all auth
        if client_ip in settings.get_whitelist_ips():
            return await call_next(request)

        path = request.url.path
        method = request.method

        # Public paths
        if any(path.startswith(p) for p in _OPEN_PATHS):
            return await call_next(request)

        # Admin endpoints (POST/PUT/DELETE to /config*)
        if path.startswith("/config") and method in {"POST", "PUT", "DELETE"}:
            admin_key = request.headers.get("X-Admin-Key", "")
            if not admin_key or admin_key != settings.admin_api_key:
                logger.warning("Unauthorized admin access attempt", extra={"ip": client_ip, "path": path})
                return JSONResponse(status_code=401, content={"detail": "Invalid or missing admin key"})

        # Regular endpoints: validate API key only if an allowlist is configured
        allowed_keys = settings.get_allowed_api_keys()
        if allowed_keys and path.startswith("/rate-limit"):
            api_key = request.headers.get("X-API-Key", "")
            if not api_key or api_key not in allowed_keys:
                return JSONResponse(status_code=401, content={"detail": "Invalid or missing API key"})

        return await call_next(request)

    @staticmethod
    def _get_client_ip(request: Request) -> str:
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        if request.client:
            return request.client.host
        return "unknown"
