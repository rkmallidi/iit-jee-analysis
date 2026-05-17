"""Exam result model — stores student OMR answers per exam."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.exam import Exam
    from app.models.student import Student


class ExamResult(Base):
    """Stores OMR scan results — one record per student per exam paper."""
    __tablename__ = "exam_results"
    __table_args__ = (
        UniqueConstraint("exam_id", "student_id", name="uq_exam_result_student"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exam_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    answers: Mapped[str] = mapped_column(String, nullable=False)  # CSV of answers (0-4, -1000000 for unanswered)
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

    exam: Mapped["Exam"] = relationship("Exam", backref="results", passive_deletes=True)
    student: Mapped["Student"] = relationship("Student", backref="exam_results")

    def __repr__(self) -> str:
        return f"<ExamResult exam={self.exam_id} student={self.student_id}>"
