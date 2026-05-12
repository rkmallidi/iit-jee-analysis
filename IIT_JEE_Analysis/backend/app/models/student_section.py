"""StudentSection — maps a student to one BranchSection slot per academic year."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.academic_year import AcademicYear
    from app.models.mapping import BranchSection
    from app.models.student import Student


class StudentSection(Base):
    __tablename__ = "student_sections"
    __table_args__ = (
        UniqueConstraint("student_id", "academic_year_id", name="uq_student_section_year"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
    )
    academic_year_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("academic_years.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    branch_section_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("branch_sections.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    student: Mapped["Student"] = relationship("Student", back_populates="section_mappings")
    academic_year: Mapped["AcademicYear"] = relationship("AcademicYear")  # type: ignore[name-defined]
    branch_section: Mapped["BranchSection"] = relationship("BranchSection")  # type: ignore[name-defined]
