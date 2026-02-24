from datetime import datetime

from pydantic import BaseModel, ConfigDict


class GameBase(BaseModel):
    """Base game schema."""

    name: str | None = None
    target_score: int = 100


class GameCreate(GameBase):
    """Schema for creating a game."""

    pass


class GameResponse(GameBase):
    """Schema for game response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    status: str
    winner_id: str | None = None
    completed_at: datetime | None = None
    created_at: datetime
