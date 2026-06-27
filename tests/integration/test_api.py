"""Integration tests — full HTTP round trips through the FastAPI app."""

import pytest
import pytest_asyncio


class TestRateLimitCheckEndpoint:
    @pytest.mark.asyncio
    async def test_check_returns_200_when_allowed(self, async_client):
        response = await async_client.post(
            "/rate-limit/check",
            json={"identifier": "int_user1", "identifier_type": "user_id"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["allowed"] is True
        assert "remaining" in data

    @pytest.mark.asyncio
    async def test_check_returns_rate_limit_headers(self, async_client):
        response = await async_client.post(
            "/rate-limit/check",
            json={"identifier": "int_user2", "identifier_type": "user_id"},
        )
        assert "X-RateLimit-Limit" in response.headers
        assert "X-RateLimit-Remaining" in response.headers

    @pytest.mark.asyncio
    async def test_check_exhausts_and_returns_429(self, async_client):
        # Hit the default free-tier limit (5 in test settings)
        identifier = "exhaust_user"
        for _ in range(5):
            await async_client.post(
                "/rate-limit/check",
                json={"identifier": identifier, "identifier_type": "user_id"},
            )
        response = await async_client.post(
            "/rate-limit/check",
            json={"identifier": identifier, "identifier_type": "user_id"},
        )
        assert response.status_code == 429
        data = response.json()
        assert "retry_after" in data
        assert "Retry-After" in response.headers

    @pytest.mark.asyncio
    async def test_check_429_response_body(self, async_client):
        identifier = "exhaust_user_body"
        for _ in range(5):
            await async_client.post(
                "/rate-limit/check",
                json={"identifier": identifier, "identifier_type": "user_id"},
            )
        response = await async_client.post(
            "/rate-limit/check",
            json={"identifier": identifier, "identifier_type": "user_id"},
        )
        assert response.json()["message"] == "Rate limit exceeded"

    @pytest.mark.asyncio
    async def test_different_identifier_types_are_independent(self, async_client):
        r1 = await async_client.post(
            "/rate-limit/check",
            json={"identifier": "shared_id", "identifier_type": "user_id"},
        )
        r2 = await async_client.post(
            "/rate-limit/check",
            json={"identifier": "shared_id", "identifier_type": "ip_address"},
        )
        assert r1.status_code == 200
        assert r2.status_code == 200

    @pytest.mark.asyncio
    async def test_invalid_request_returns_422(self, async_client):
        response = await async_client.post(
            "/rate-limit/check",
            json={"identifier": "", "identifier_type": "user_id"},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_premium_tier_gets_higher_limit(self, async_client):
        # Premium gets 100 in test settings — should not be blocked after 10
        for _ in range(10):
            r = await async_client.post(
                "/rate-limit/check",
                json={"identifier": "premium_user", "identifier_type": "user_id", "user_tier": "premium"},
            )
        assert r.status_code == 200


class TestHealthEndpoint:
    @pytest.mark.asyncio
    async def test_health_returns_200(self, async_client):
        response = await async_client.get("/health")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_health_response_schema(self, async_client):
        response = await async_client.get("/health")
        data = response.json()
        assert "status" in data
        assert "storage_backend" in data
        assert "storage_healthy" in data
        assert "version" in data


class TestConfigEndpoints:
    @pytest.mark.asyncio
    async def test_list_configs_empty(self, async_client):
        response = await async_client.get("/config")
        assert response.status_code == 200
        assert response.json()["total"] >= 0

    @pytest.mark.asyncio
    async def test_create_config_requires_admin_key(self, async_client):
        response = await async_client.post(
            "/config",
            json={
                "identifier_type": "user_id",
                "identifier": "*",
                "algorithm": "fixed_window",
                "limit": 50,
                "window_seconds": 60,
            },
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_config_with_admin_key(self, async_client):
        response = await async_client.post(
            "/config",
            headers={"X-Admin-Key": "test-admin-key"},
            json={
                "identifier_type": "user_id",
                "identifier": "*",
                "algorithm": "fixed_window",
                "limit": 50,
                "window_seconds": 60,
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["limit"] == 50
        assert "id" in data

    @pytest.mark.asyncio
    async def test_get_nonexistent_config_returns_404(self, async_client):
        response = await async_client.get("/config/does-not-exist")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_config(self, async_client):
        # Create first
        create_r = await async_client.post(
            "/config",
            headers={"X-Admin-Key": "test-admin-key"},
            json={
                "identifier_type": "api_key",
                "identifier": "*",
                "algorithm": "token_bucket",
                "limit": 100,
                "window_seconds": 60,
                "refill_rate": 1.5,
            },
        )
        config_id = create_r.json()["id"]
        delete_r = await async_client.delete(
            f"/config/{config_id}",
            headers={"X-Admin-Key": "test-admin-key"},
        )
        assert delete_r.status_code == 204
