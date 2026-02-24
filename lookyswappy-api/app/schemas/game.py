from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class GameBase(BaseModel):
    """Base game schema."""

    name: Optional[str] = None
    target_score: int = 100


class GameCreate(GameBase):
    """Schema for creating a game."""

    pass


class GameResponse(GameBase):
    """Schema for game response."""

    id: str
    status: str
    winner_id: Optional[str] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
