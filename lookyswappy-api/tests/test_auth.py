import pytest
from httpx import AsyncClient


@pytest.mark.anyio
async def test_register_device_validation_requires_uuid(client: AsyncClient) -> None:
    """Test that register-device validates device_id format."""
    response = await client.post(
        "/api/v1/auth/register-device",
        json={"device_id": "invalid-uuid"},
    )
    assert response.status_code == 422  # Validation error


@pytest.mark.anyio
async def test_register_device_validation_requires_body(client: AsyncClient) -> None:
    """Test that register-device requires request body."""
    response = await client.post("/api/v1/auth/register-device")
    assert response.status_code == 422  # Validation error


@pytest.mark.anyio
async def test_refresh_token_requires_auth(client: AsyncClient) -> None:
    """Test that refresh endpoint requires authentication."""
    response = await client.post("/api/v1/auth/refresh")
    assert response.status_code == 401  # Unauthorized (no bearer token)


@pytest.mark.anyio
async def test_me_requires_auth(client: AsyncClient) -> None:
    """Test that /me endpoint requires authentication."""
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401  # Unauthorized (no bearer token)


@pytest.mark.anyio
async def test_me_with_invalid_token(client: AsyncClient) -> None:
    """Test /me endpoint with invalid token."""
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid-token"},
    )
    assert response.status_code == 401  # Unauthorized
