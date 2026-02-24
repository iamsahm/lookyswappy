import pytest
from httpx import AsyncClient


@pytest.mark.anyio
async def test_register_device_placeholder(client: AsyncClient) -> None:
    """Test the register device endpoint exists (placeholder)."""
    response = await client.post("/api/v1/auth/register-device")
    assert response.status_code == 200


@pytest.mark.anyio
async def test_refresh_token_placeholder(client: AsyncClient) -> None:
    """Test the refresh token endpoint exists (placeholder)."""
    response = await client.post("/api/v1/auth/refresh")
    assert response.status_code == 200
