import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Problem(Base):
    __tablename__ = "problems"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # easy, medium, hard
    time_limit: Mapped[int] = mapped_column(Integer, default=900)  # seconds (default 15 min)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
