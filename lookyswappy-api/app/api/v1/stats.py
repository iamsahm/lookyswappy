from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def get_stats() -> dict:
    """Get overall statistics for the current device."""
    return {
        "total_games": 0,
        "games_won": 0,
        "games_lost": 0,
        "average_score": 0,
    }
