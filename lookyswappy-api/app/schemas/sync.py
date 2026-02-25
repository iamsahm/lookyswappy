from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


# --- Individual Record Schemas ---


class GameSync(BaseModel):
    """Game record for sync."""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="WatermelonDB ID")
    name: str | None = None
    target_score: int = 100
    status: str = "active"
    winner_id: str | None = None
    started_at: datetime
    ended_at: datetime | None = None


class GamePlayerSync(BaseModel):
    """Player record for sync."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    game_id: str
    name: str
    position: int
    current_total: int = 0


class RoundSync(BaseModel):
    """Round record for sync."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    game_id: str
    round_number: int
    caller_id: str | None = None
    created_at: datetime


class ScoreSync(BaseModel):
    """Score record for sync."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    round_id: str
    player_id: str
    raw_score: int
    bonus_applied: int = 0
    final_score: int
    total_after: int


# --- Table Changes ---


class TableChanges(BaseModel, Generic[T]):
    """Changes for a single table."""

    created: list[T] = Field(default_factory=list)
    updated: list[T] = Field(default_factory=list)
    deleted: list[str] = Field(
        default_factory=list,
        description="List of deleted record IDs",
    )


# Using concrete types since Pydantic generics can be tricky
class GameTableChanges(BaseModel):
    """Changes for games table."""

    created: list[GameSync] = Field(default_factory=list)
    updated: list[GameSync] = Field(default_factory=list)
    deleted: list[str] = Field(default_factory=list)


class PlayerTableChanges(BaseModel):
    """Changes for game_players table."""

    created: list[GamePlayerSync] = Field(default_factory=list)
    updated: list[GamePlayerSync] = Field(default_factory=list)
    deleted: list[str] = Field(default_factory=list)


class RoundTableChanges(BaseModel):
    """Changes for rounds table."""

    created: list[RoundSync] = Field(default_factory=list)
    updated: list[RoundSync] = Field(default_factory=list)
    deleted: list[str] = Field(default_factory=list)


class ScoreTableChanges(BaseModel):
    """Changes for scores table."""

    created: list[ScoreSync] = Field(default_factory=list)
    updated: list[ScoreSync] = Field(default_factory=list)
    deleted: list[str] = Field(default_factory=list)


# --- Request/Response ---


class SyncChanges(BaseModel):
    """All changes across tables."""

    games: GameTableChanges = Field(default_factory=GameTableChanges)
    game_players: PlayerTableChanges = Field(default_factory=PlayerTableChanges)
    rounds: RoundTableChanges = Field(default_factory=RoundTableChanges)
    scores: ScoreTableChanges = Field(default_factory=ScoreTableChanges)


class PullResponse(BaseModel):
    """Response from pull endpoint."""

    changes: SyncChanges
    timestamp: float = Field(
        ...,
        description="Server timestamp to use for next pull",
    )


class PushRequest(BaseModel):
    """Request body for push endpoint."""

    changes: SyncChanges
    last_pulled_at: float = Field(
        ...,
        description="Timestamp from last pull (for conflict detection)",
    )


class PushResponse(BaseModel):
    """Response from push endpoint."""

    ok: bool = True
    errors: list[str] = Field(default_factory=list)
