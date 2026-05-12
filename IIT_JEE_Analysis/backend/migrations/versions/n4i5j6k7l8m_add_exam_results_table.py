"""Add exam_results table for OMR data storage.

Revision ID: n4i5j6k7l8m
Revises: m3h4i5j6k7l
Create Date: 2026-05-12 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "n4i5j6k7l8m"
down_revision: Union[str, None] = "m3h4i5j6k7l"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "exam_results",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("exam_id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("answers", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["exam_id"], ["exams.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["student_id"], ["students.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("exam_id", "student_id", name="uq_exam_result_student"),
    )
    op.create_index(
        op.f("ix_exam_results_exam_id"), "exam_results", ["exam_id"], unique=False
    )
    op.create_index(
        op.f("ix_exam_results_student_id"), "exam_results", ["student_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_exam_results_student_id"), table_name="exam_results")
    op.drop_index(op.f("ix_exam_results_exam_id"), table_name="exam_results")
    op.drop_table("exam_results")
