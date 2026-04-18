import uuid

from sqlalchemy import String, Text, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TestCase(Base):
    __tablename__ = "test_cases"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    problem_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("problems.id", ondelete="CASCADE"), nullable=False, index=True
    )
    input: Mapped[str] = mapped_column(Text, nullable=False)
    expected_output: Mapped[str] = mapped_column(Text, nullable=False)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False)
