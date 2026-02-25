import pytest
from httpx import AsyncClient


@pytest.mark.anyio
async def test_pull_requires_auth(client: AsyncClient) -> None:
    """Test that pull endpoint requires authentication."""
    response = await client.get("/api/v1/sync/pull")
    assert response.status_code == 401


@pytest.mark.anyio
async def test_push_requires_auth(client: AsyncClient) -> None:
    """Test that push endpoint requires authentication."""
    response = await client.post(
        "/api/v1/sync/push",
        json={
            "changes": {
                "games": {"created": [], "updated": [], "deleted": []},
                "game_players": {"created": [], "updated": [], "deleted": []},
                "rounds": {"created": [], "updated": [], "deleted": []},
                "scores": {"created": [], "updated": [], "deleted": []},
            },
            "last_pulled_at": 0,
        },
    )
    assert response.status_code == 401


@pytest.mark.anyio
async def test_push_validates_body(client: AsyncClient) -> None:
    """Test that push endpoint validates request body."""
    response = await client.post(
        "/api/v1/sync/push",
        json={},
        headers={"Authorization": "Bearer invalid-token"},
    )
    # Should get 401 (unauthorized) before validation
    assert response.status_code == 401


@pytest.mark.anyio
async def test_pull_with_invalid_token(client: AsyncClient) -> None:
    """Test pull with invalid token."""
    response = await client.get(
        "/api/v1/sync/pull",
        headers={"Authorization": "Bearer invalid-token"},
    )
    assert response.status_code == 401
