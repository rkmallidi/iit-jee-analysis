"""Add student_evaluations and student_cumulative_evaluations tables.

Revision ID: u1p2q3r4s5t
Revises: t0o1p2q3r4s
Create Date: 2026-05-17
"""
from alembic import op
import sqlalchemy as sa

revision = "u1p2q3r4s5t"
down_revision = "t0o1p2q3r4s"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "student_evaluations",
        sa.Column("id", sa.Integer, primary_key=True),

        # Identity
        sa.Column("exam_id", sa.Integer, sa.ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("student_id", sa.Integer, sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("branch_id", sa.Integer, sa.ForeignKey("branches.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("section_id", sa.Integer, sa.ForeignKey("sections.id", ondelete="SET NULL"), nullable=True),

        # Denormalized
        sa.Column("academic_year_id", sa.Integer, sa.ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("program_id", sa.Integer, sa.ForeignKey("programs.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("class_id", sa.Integer, sa.ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("exam_code", sa.String(50), nullable=False),
        sa.Column("exam_date", sa.String(20), nullable=False),
        sa.Column("exam_type", sa.String(20), nullable=False),
        sa.Column("paper", sa.String(10), nullable=False),

        # Scores
        sa.Column("total_score", sa.Float, nullable=False, server_default="0"),
        sa.Column("math_score", sa.Float, nullable=False, server_default="0"),
        sa.Column("physics_score", sa.Float, nullable=False, server_default="0"),
        sa.Column("chemistry_score", sa.Float, nullable=False, server_default="0"),
        sa.Column("max_score", sa.Float, nullable=False, server_default="0"),

        # Attempt stats
        sa.Column("attempted", sa.Integer, nullable=False, server_default="0"),
        sa.Column("correct", sa.Integer, nullable=False, server_default="0"),
        sa.Column("wrong", sa.Integer, nullable=False, server_default="0"),
        sa.Column("unattempted", sa.Integer, nullable=False, server_default="0"),

        sa.Column("math_attempted", sa.Integer, nullable=False, server_default="0"),
        sa.Column("math_correct", sa.Integer, nullable=False, server_default="0"),
        sa.Column("math_wrong", sa.Integer, nullable=False, server_default="0"),
        sa.Column("math_unattempted", sa.Integer, nullable=False, server_default="0"),

        sa.Column("physics_attempted", sa.Integer, nullable=False, server_default="0"),
        sa.Column("physics_correct", sa.Integer, nullable=False, server_default="0"),
        sa.Column("physics_wrong", sa.Integer, nullable=False, server_default="0"),
        sa.Column("physics_unattempted", sa.Integer, nullable=False, server_default="0"),

        sa.Column("chemistry_attempted", sa.Integer, nullable=False, server_default="0"),
        sa.Column("chemistry_correct", sa.Integer, nullable=False, server_default="0"),
        sa.Column("chemistry_wrong", sa.Integer, nullable=False, server_default="0"),
        sa.Column("chemistry_unattempted", sa.Integer, nullable=False, server_default="0"),

        # Percentages
        sa.Column("average_percentage", sa.Float, nullable=False, server_default="0"),
        sa.Column("math_percentage", sa.Float, nullable=False, server_default="0"),
        sa.Column("physics_percentage", sa.Float, nullable=False, server_default="0"),
        sa.Column("chemistry_percentage", sa.Float, nullable=False, server_default="0"),

        # Ranks
        sa.Column("overall_rank", sa.Integer, nullable=True),
        sa.Column("branch_rank", sa.Integer, nullable=True),
        sa.Column("section_rank", sa.Integer, nullable=True),
        sa.Column("rank_change_overall", sa.Integer, nullable=True),
        sa.Column("rank_change_branch", sa.Integer, nullable=True),
        sa.Column("score_change", sa.Float, nullable=True),

        # Percentiles
        sa.Column("overall_percentile", sa.Float, nullable=True),
        sa.Column("branch_percentile", sa.Float, nullable=True),
        sa.Column("section_percentile", sa.Float, nullable=True),
        sa.Column("percentile_band", sa.String(20), nullable=True),

        # MI
        sa.Column("mi_total", sa.Float, nullable=True),
        sa.Column("mi_math", sa.Float, nullable=True),
        sa.Column("mi_physics", sa.Float, nullable=True),
        sa.Column("mi_chemistry", sa.Float, nullable=True),
        sa.Column("above_mi_total", sa.Boolean, nullable=True),
        sa.Column("above_mi_math", sa.Boolean, nullable=True),
        sa.Column("above_mi_physics", sa.Boolean, nullable=True),
        sa.Column("above_mi_chemistry", sa.Boolean, nullable=True),

        # Faculty snapshot
        sa.Column("math_faculty_id", sa.Integer, nullable=True),
        sa.Column("math_faculty_name", sa.String(200), nullable=True),
        sa.Column("physics_faculty_id", sa.Integer, nullable=True),
        sa.Column("physics_faculty_name", sa.String(200), nullable=True),
        sa.Column("chemistry_faculty_id", sa.Integer, nullable=True),
        sa.Column("chemistry_faculty_name", sa.String(200), nullable=True),

        # Leadership snapshot
        sa.Column("principal_id", sa.Integer, nullable=True),
        sa.Column("principal_name", sa.String(200), nullable=True),
        sa.Column("dean_id", sa.Integer, nullable=True),
        sa.Column("dean_name", sa.String(200), nullable=True),

        sa.Column("evaluated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("exam_id", "student_id", name="uq_eval_exam_student"),
    )

    op.create_table(
        "student_cumulative_evaluations",
        sa.Column("id", sa.Integer, primary_key=True),

        # Identity
        sa.Column("p1_exam_id", sa.Integer, sa.ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("student_id", sa.Integer, sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("branch_id", sa.Integer, sa.ForeignKey("branches.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("section_id", sa.Integer, sa.ForeignKey("sections.id", ondelete="SET NULL"), nullable=True),

        # Denormalized
        sa.Column("academic_year_id", sa.Integer, sa.ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("program_id", sa.Integer, sa.ForeignKey("programs.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("class_id", sa.Integer, sa.ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("exam_code", sa.String(50), nullable=False),
        sa.Column("exam_date", sa.String(20), nullable=False),
        sa.Column("max_score", sa.Float, nullable=False, server_default="0"),

        # Per-paper + cumulative scores
        sa.Column("p1_total", sa.Float, nullable=False, server_default="0"),
        sa.Column("p2_total", sa.Float, nullable=False, server_default="0"),
        sa.Column("cumulative_total", sa.Float, nullable=False, server_default="0"),
        sa.Column("cumulative_math", sa.Float, nullable=False, server_default="0"),
        sa.Column("cumulative_physics", sa.Float, nullable=False, server_default="0"),
        sa.Column("cumulative_chemistry", sa.Float, nullable=False, server_default="0"),

        # Attempt stats (combined P1+P2)
        sa.Column("attempted", sa.Integer, nullable=False, server_default="0"),
        sa.Column("correct", sa.Integer, nullable=False, server_default="0"),
        sa.Column("wrong", sa.Integer, nullable=False, server_default="0"),
        sa.Column("unattempted", sa.Integer, nullable=False, server_default="0"),
        sa.Column("math_attempted", sa.Integer, nullable=False, server_default="0"),
        sa.Column("math_correct", sa.Integer, nullable=False, server_default="0"),
        sa.Column("math_wrong", sa.Integer, nullable=False, server_default="0"),
        sa.Column("physics_attempted", sa.Integer, nullable=False, server_default="0"),
        sa.Column("physics_correct", sa.Integer, nullable=False, server_default="0"),
        sa.Column("physics_wrong", sa.Integer, nullable=False, server_default="0"),
        sa.Column("chemistry_attempted", sa.Integer, nullable=False, server_default="0"),
        sa.Column("chemistry_correct", sa.Integer, nullable=False, server_default="0"),
        sa.Column("chemistry_wrong", sa.Integer, nullable=False, server_default="0"),

        # Percentages
        sa.Column("average_percentage", sa.Float, nullable=False, server_default="0"),
        sa.Column("math_percentage", sa.Float, nullable=False, server_default="0"),
        sa.Column("physics_percentage", sa.Float, nullable=False, server_default="0"),
        sa.Column("chemistry_percentage", sa.Float, nullable=False, server_default="0"),

        # Ranks
        sa.Column("overall_rank", sa.Integer, nullable=True),
        sa.Column("branch_rank", sa.Integer, nullable=True),
        sa.Column("section_rank", sa.Integer, nullable=True),
        sa.Column("rank_change_overall", sa.Integer, nullable=True),
        sa.Column("rank_change_branch", sa.Integer, nullable=True),
        sa.Column("score_change", sa.Float, nullable=True),

        # Percentiles
        sa.Column("overall_percentile", sa.Float, nullable=True),
        sa.Column("branch_percentile", sa.Float, nullable=True),
        sa.Column("section_percentile", sa.Float, nullable=True),
        sa.Column("percentile_band", sa.String(20), nullable=True),

        # MI
        sa.Column("mi_total", sa.Float, nullable=True),
        sa.Column("mi_math", sa.Float, nullable=True),
        sa.Column("mi_physics", sa.Float, nullable=True),
        sa.Column("mi_chemistry", sa.Float, nullable=True),
        sa.Column("above_mi_total", sa.Boolean, nullable=True),
        sa.Column("above_mi_math", sa.Boolean, nullable=True),
        sa.Column("above_mi_physics", sa.Boolean, nullable=True),
        sa.Column("above_mi_chemistry", sa.Boolean, nullable=True),

        # Faculty + leadership snapshot
        sa.Column("math_faculty_id", sa.Integer, nullable=True),
        sa.Column("math_faculty_name", sa.String(200), nullable=True),
        sa.Column("physics_faculty_id", sa.Integer, nullable=True),
        sa.Column("physics_faculty_name", sa.String(200), nullable=True),
        sa.Column("chemistry_faculty_id", sa.Integer, nullable=True),
        sa.Column("chemistry_faculty_name", sa.String(200), nullable=True),
        sa.Column("principal_id", sa.Integer, nullable=True),
        sa.Column("principal_name", sa.String(200), nullable=True),
        sa.Column("dean_id", sa.Integer, nullable=True),
        sa.Column("dean_name", sa.String(200), nullable=True),

        sa.Column("evaluated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("p1_exam_id", "student_id", name="uq_cumul_eval_exam_student"),
    )


def downgrade() -> None:
    op.drop_table("student_cumulative_evaluations")
    op.drop_table("student_evaluations")
