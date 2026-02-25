import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import SyncableBase

if TYPE_CHECKING:
    from app.models.game import Game
    from app.models.score import Score


class GamePlayer(SyncableBase):
    """A player in a specific game."""

    __tablename__ = "game_players"

    game_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("games.id"),
        index=True,
    )
    name: Mapped[str] = mapped_column(String(50))
    position: Mapped[int] = mapped_column(Integer, comment="Display order")
    current_total: Mapped[int] = mapped_column(
        Integer,
        default=0,
        comment="Cached cumulative score",
    )

    # Relationships
    game: Mapped["Game"] = relationship(
        back_populates="players",
        foreign_keys=[game_id],
    )
    scores: Mapped[list["Score"]] = relationship(
        back_populates="player",
        cascade="all, delete-orphan",
    )
