"""Exam model — one exam per academic-year / program / class / paper."""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.academic_year import AcademicYear
    from app.models.program import Program
    from app.models.class_ import Class
    from app.models.exam_question import ExamQuestion

# exam_type values
EXAM_TYPE_MAINS    = "Mains"
EXAM_TYPE_ADVANCED = "Advanced"

# paper values
PAPER_P1 = "P1"
PAPER_P2 = "P2"


class Exam(Base):
    __tablename__ = "exams"
    __table_args__ = (
        UniqueConstraint("academic_year_id", "exam_code", "program_id", "class_id", "paper", name="uq_exam_per_year_prog_class_paper"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    academic_year_id: Mapped[int] = mapped_column(Integer, ForeignKey("academic_years.id"), nullable=False, index=True)
    program_id: Mapped[int] = mapped_column(Integer, ForeignKey("programs.id"), nullable=False, index=True)
    class_id: Mapped[int] = mapped_column(Integer, ForeignKey("classes.id"), nullable=False, index=True)
    exam_code: Mapped[str] = mapped_column(String(50), nullable=False)
    exam_type: Mapped[str] = mapped_column(String(20), nullable=False)   # Mains | Advanced
    paper: Mapped[str] = mapped_column(String(10), nullable=False)        # Single | P1 | P2
    exam_date: Mapped[date] = mapped_column(Date, nullable=False)

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

    academic_year: Mapped["AcademicYear"] = relationship("AcademicYear", backref="exams")
    program: Mapped["Program"] = relationship("Program", backref="exams")
    class_: Mapped["Class"] = relationship("Class", foreign_keys=[class_id], backref="exams")
    questions: Mapped[list["ExamQuestion"]] = relationship(
        "ExamQuestion", back_populates="exam", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Exam {self.exam_code}/{self.paper} year={self.academic_year_id}>"
