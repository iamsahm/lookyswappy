from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import SyncableBase


class GameStatus(str, Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class Game(SyncableBase):
    """Game model representing a Lookyswappy game session."""

    __tablename__ = "games"

    name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    target_score: Mapped[int] = mapped_column(Integer, default=100)
    status: Mapped[str] = mapped_column(String(20), default=GameStatus.IN_PROGRESS)
    winner_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    players: Mapped[list["GamePlayer"]] = relationship(  # noqa: F821
        "GamePlayer", back_populates="game", cascade="all, delete-orphan"
    )
    rounds: Mapped[list["Round"]] = relationship(  # noqa: F821
        "Round", back_populates="game", cascade="all, delete-orphan"
    )
