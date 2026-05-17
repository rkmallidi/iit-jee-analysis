"""Student evaluation models — computed after exam completion."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Integer, String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.exam import Exam
    from app.models.student import Student


class StudentEvaluation(Base):
    """One row per student per exam paper. Covers both Mains (P1 only) and Advanced (P1 + P2)."""
    __tablename__ = "student_evaluations"
    __table_args__ = (
        UniqueConstraint("exam_id", "student_id", name="uq_eval_exam_student"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    # ── Identity ────────────────────────────────────────────────────────────────
    exam_id: Mapped[int] = mapped_column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    branch_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("branches.id", ondelete="SET NULL"), nullable=True, index=True)
    section_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("sections.id", ondelete="SET NULL"), nullable=True)

    # ── Denormalized for fast report slicing ────────────────────────────────────
    academic_year_id: Mapped[int] = mapped_column(Integer, ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False, index=True)
    program_id: Mapped[int] = mapped_column(Integer, ForeignKey("programs.id", ondelete="CASCADE"), nullable=False, index=True)
    class_id: Mapped[int] = mapped_column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    exam_code: Mapped[str] = mapped_column(String(50), nullable=False)
    exam_date: Mapped[str] = mapped_column(String(20), nullable=False)   # ISO date string
    exam_type: Mapped[str] = mapped_column(String(20), nullable=False)   # Mains | Advanced
    paper: Mapped[str] = mapped_column(String(10), nullable=False)        # P1 | P2

    # ── Scores ──────────────────────────────────────────────────────────────────
    total_score: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    math_score: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    physics_score: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    chemistry_score: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    max_score: Mapped[float] = mapped_column(Float, nullable=False, default=0)  # max possible marks

    # ── Attempt stats ────────────────────────────────────────────────────────────
    attempted: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    correct: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    wrong: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    unattempted: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    math_attempted: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    math_correct: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    math_wrong: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    math_unattempted: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    physics_attempted: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    physics_correct: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    physics_wrong: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    physics_unattempted: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    chemistry_attempted: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    chemistry_correct: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    chemistry_wrong: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    chemistry_unattempted: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # ── Percentages ─────────────────────────────────────────────────────────────
    average_percentage: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    math_percentage: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    physics_percentage: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    chemistry_percentage: Mapped[float] = mapped_column(Float, nullable=False, default=0)

    # ── Ranks ───────────────────────────────────────────────────────────────────
    overall_rank: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    branch_rank: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    section_rank: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    rank_change_overall: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # vs previous exam
    rank_change_branch: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    score_change: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # ── Percentiles ─────────────────────────────────────────────────────────────
    overall_percentile: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    branch_percentile: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    section_percentile: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    percentile_band: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # "Top 1%", "Top 5%", etc.

    # ── MI (Merit Index) — 80% of avg top-10 scores ─────────────────────────────
    mi_total: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    mi_math: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    mi_physics: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    mi_chemistry: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    above_mi_total: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    above_mi_math: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    above_mi_physics: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    above_mi_chemistry: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)

    # ── Faculty snapshot (at evaluation time, per student's section) ─────────────
    math_faculty_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    math_faculty_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    physics_faculty_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    physics_faculty_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    chemistry_faculty_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    chemistry_faculty_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # ── Leadership snapshot (branch-level at evaluation time) ────────────────────
    principal_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    principal_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    dean_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    dean_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    evaluated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    exam: Mapped["Exam"] = relationship("Exam", backref="evaluations")
    student: Mapped["Student"] = relationship("Student", backref="evaluations")


class StudentCumulativeEvaluation(Base):
    """Advanced exam only — cumulative P1+P2 rank/MI/percentile per student."""
    __tablename__ = "student_cumulative_evaluations"
    __table_args__ = (
        UniqueConstraint("p1_exam_id", "student_id", name="uq_cumul_eval_exam_student"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    # ── Identity ────────────────────────────────────────────────────────────────
    p1_exam_id: Mapped[int] = mapped_column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    branch_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("branches.id", ondelete="SET NULL"), nullable=True, index=True)
    section_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("sections.id", ondelete="SET NULL"), nullable=True)

    # ── Denormalized ─────────────────────────────────────────────────────────────
    academic_year_id: Mapped[int] = mapped_column(Integer, ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False, index=True)
    program_id: Mapped[int] = mapped_column(Integer, ForeignKey("programs.id", ondelete="CASCADE"), nullable=False, index=True)
    class_id: Mapped[int] = mapped_column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    exam_code: Mapped[str] = mapped_column(String(50), nullable=False)
    exam_date: Mapped[str] = mapped_column(String(20), nullable=False)
    max_score: Mapped[float] = mapped_column(Float, nullable=False, default=0)  # P1 + P2 max

    # ── Per-paper totals ─────────────────────────────────────────────────────────
    p1_total: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    p2_total: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    cumulative_total: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    cumulative_math: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    cumulative_physics: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    cumulative_chemistry: Mapped[float] = mapped_column(Float, nullable=False, default=0)

    # ── Attempt stats (combined) ─────────────────────────────────────────────────
    attempted: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    correct: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    wrong: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    unattempted: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    math_attempted: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    math_correct: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    math_wrong: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    physics_attempted: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    physics_correct: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    physics_wrong: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    chemistry_attempted: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    chemistry_correct: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    chemistry_wrong: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # ── Percentages ─────────────────────────────────────────────────────────────
    average_percentage: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    math_percentage: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    physics_percentage: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    chemistry_percentage: Mapped[float] = mapped_column(Float, nullable=False, default=0)

    # ── Ranks ───────────────────────────────────────────────────────────────────
    overall_rank: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    branch_rank: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    section_rank: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    rank_change_overall: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    rank_change_branch: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    score_change: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # ── Percentiles ─────────────────────────────────────────────────────────────
    overall_percentile: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    branch_percentile: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    section_percentile: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    percentile_band: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # ── MI ───────────────────────────────────────────────────────────────────────
    mi_total: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    mi_math: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    mi_physics: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    mi_chemistry: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    above_mi_total: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    above_mi_math: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    above_mi_physics: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    above_mi_chemistry: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)

    # ── Faculty + leadership snapshot ────────────────────────────────────────────
    math_faculty_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    math_faculty_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    physics_faculty_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    physics_faculty_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    chemistry_faculty_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    chemistry_faculty_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    principal_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    principal_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    dean_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    dean_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    evaluated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    p1_exam: Mapped["Exam"] = relationship("Exam", backref="cumulative_evaluations")
    student: Mapped["Student"] = relationship("Student", backref="cumulative_evaluations")
