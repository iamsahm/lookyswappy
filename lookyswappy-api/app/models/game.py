import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import SyncableBase

if TYPE_CHECKING:
    from app.models.device import Device
    from app.models.player import GamePlayer
    from app.models.round import Round


class GameStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"


class Game(SyncableBase):
    """A Lookyswappy game session."""

    __tablename__ = "games"

    device_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("devices.id"),
        index=True,
    )
    name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    target_score: Mapped[int] = mapped_column(Integer, default=100)
    status: Mapped[GameStatus] = mapped_column(
        Enum(GameStatus),
        default=GameStatus.ACTIVE,
    )
    winner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("game_players.id", use_alter=True),
        nullable=True,
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    ended_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    device: Mapped["Device"] = relationship(back_populates="games")
    players: Mapped[list["GamePlayer"]] = relationship(
        back_populates="game",
        cascade="all, delete-orphan",
        foreign_keys="GamePlayer.game_id",
    )
    rounds: Mapped[list["Round"]] = relationship(
        back_populates="game",
        cascade="all, delete-orphan",
    )
