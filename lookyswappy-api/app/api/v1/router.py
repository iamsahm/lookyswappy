from fastapi import APIRouter

from app.api.v1 import auth, sync, games, stats

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(sync.router, prefix="/sync", tags=["sync"])
api_router.include_router(games.router, prefix="/games", tags=["games"])
api_router.include_router(stats.router, prefix="/stats", tags=["stats"])
