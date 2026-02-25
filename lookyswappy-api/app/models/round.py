import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import SyncableBase

if TYPE_CHECKING:
    from app.models.game import Game
    from app.models.score import Score


class Round(SyncableBase):
    """A single round in a game."""

    __tablename__ = "rounds"

    game_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("games.id"),
        index=True,
    )
    round_number: Mapped[int] = mapped_column(Integer)
    caller_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("game_players.id"),
        nullable=True,
        comment="Player who called lookyswappy",
    )

    # Relationships
    game: Mapped["Game"] = relationship(back_populates="rounds")
    scores: Mapped[list["Score"]] = relationship(
        back_populates="round",
        cascade="all, delete-orphan",
    )
