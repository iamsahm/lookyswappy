import pytest
from httpx import AsyncClient


@pytest.mark.anyio
async def test_pull_placeholder(client: AsyncClient) -> None:
    """Test the pull endpoint exists (placeholder)."""
    response = await client.get("/api/v1/sync/pull")
    assert response.status_code == 200


@pytest.mark.anyio
async def test_push_placeholder(client: AsyncClient) -> None:
    """Test the push endpoint exists (placeholder)."""
    response = await client.post("/api/v1/sync/push")
    assert response.status_code == 200
