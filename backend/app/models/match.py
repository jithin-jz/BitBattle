import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Match(Base):
    __tablename__ = "matches"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    player1_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    player2_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    winner_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    problem_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("problems.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), default="WAITING", index=True
    )  # WAITING, STARTED, FINISHED
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    ended_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    player1 = relationship("User", foreign_keys=[player1_id])
    player2 = relationship("User", foreign_keys=[player2_id])
    problem = relationship("Problem")

    @property
    def player1_username(self) -> Optional[str]:
        return self.player1.username if self.player1 else None

    @property
    def player2_username(self) -> Optional[str]:
        return self.player2.username if self.player2 else None

    @property
    def player1_avatar(self) -> Optional[str]:
        return self.player1.avatar_url if self.player1 else None

    @property
    def player2_avatar(self) -> Optional[str]:
        return self.player2.avatar_url if self.player2 else None
