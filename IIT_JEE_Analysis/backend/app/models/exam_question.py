"""Questions configured for a specific exam paper."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.exam import Exam


class ExamQuestion(Base):
    __tablename__ = "exam_questions"
    __table_args__ = (
        UniqueConstraint("exam_id", "qno", name="uq_exam_question_qno"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exam_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    qno: Mapped[int] = mapped_column(Integer, nullable=False)
    subject: Mapped[str] = mapped_column(String(50), nullable=False)
    topic: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    sub_topic: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    difficulty: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    question_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    marks: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    negative_marks: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    bkc: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    partial_marks: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_bonus: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    akc: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    exam: Mapped["Exam"] = relationship("Exam", back_populates="questions")
