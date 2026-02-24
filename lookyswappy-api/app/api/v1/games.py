from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_games() -> dict[str, list]:
    """List all games for the current device."""
    # Optional REST endpoint
    return {"games": []}


@router.get("/{game_id}")
async def get_game(game_id: str) -> dict[str, str]:
    """Get a specific game by ID."""
    # Optional REST endpoint
    return {"message": "Not implemented", "game_id": game_id}
