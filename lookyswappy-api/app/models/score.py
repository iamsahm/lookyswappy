import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import SyncableBase

if TYPE_CHECKING:
    from app.models.player import GamePlayer
    from app.models.round import Round


class Score(SyncableBase):
    """A player's score for a single round."""

    __tablename__ = "scores"

    round_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("rounds.id"),
        index=True,
    )
    player_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("game_players.id"),
        index=True,
    )
    raw_score: Mapped[int] = mapped_column(
        Integer,
        comment="Score before bonus",
    )
    bonus_applied: Mapped[int] = mapped_column(
        Integer,
        default=0,
        comment="-25 or 0",
    )
    final_score: Mapped[int] = mapped_column(
        Integer,
        comment="raw_score + bonus_applied",
    )
    total_after: Mapped[int] = mapped_column(
        Integer,
        comment="Running total after this round",
    )

    # Relationships
    round: Mapped["Round"] = relationship(back_populates="scores")
    player: Mapped["GamePlayer"] = relationship(back_populates="scores")
