import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=True, index=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=True, index=True)
    github_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=True, index=True)
    avatar_url: Mapped[str] = mapped_column(String(500), nullable=True)
    rating: Mapped[int] = mapped_column(Integer, default=1200, index=True)
    wins: Mapped[int] = mapped_column(Integer, default=0)
    losses: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
