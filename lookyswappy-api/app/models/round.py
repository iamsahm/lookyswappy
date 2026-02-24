from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import SyncableBase


class Round(SyncableBase):
    """A round within a game."""

    __tablename__ = "rounds"

    game_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("games.id"), nullable=False
    )
    round_number: Mapped[int] = mapped_column(Integer, nullable=False)

    # Relationships
    game: Mapped["Game"] = relationship("Game", back_populates="rounds")  # noqa: F821
    scores: Mapped[list["Score"]] = relationship(  # noqa: F821
        "Score", back_populates="round", cascade="all, delete-orphan"
    )
