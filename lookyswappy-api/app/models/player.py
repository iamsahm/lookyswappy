from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import SyncableBase


class GamePlayer(SyncableBase):
    """Player in a specific game."""

    __tablename__ = "game_players"

    game_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("games.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    total_score: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    game: Mapped["Game"] = relationship("Game", back_populates="players")  # noqa: F821
    scores: Mapped[list["Score"]] = relationship(  # noqa: F821
        "Score", back_populates="player", cascade="all, delete-orphan"
    )
