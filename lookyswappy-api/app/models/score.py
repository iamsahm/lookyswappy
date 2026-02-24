from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import SyncableBase


class Score(SyncableBase):
    """Score for a player in a specific round."""

    __tablename__ = "scores"

    round_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("rounds.id"), nullable=False
    )
    player_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("game_players.id"), nullable=False
    )
    raw_score: Mapped[int] = mapped_column(Integer, nullable=False)
    bonus_applied: Mapped[bool] = mapped_column(Boolean, default=False)
    final_score: Mapped[int] = mapped_column(Integer, nullable=False)

    # Relationships
    round: Mapped["Round"] = relationship("Round", back_populates="scores")  # noqa: F821
    player: Mapped["GamePlayer"] = relationship(  # noqa: F821
        "GamePlayer", back_populates="scores"
    )
