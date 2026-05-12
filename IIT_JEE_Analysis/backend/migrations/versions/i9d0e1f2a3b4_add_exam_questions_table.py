"""add_exam_questions_table

Revision ID: i9d0e1f2a3b4
Revises: h8c9d0e1f2a3
Create Date: 2026-05-11 00:05:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "i9d0e1f2a3b4"
down_revision: Union[str, None] = "h8c9d0e1f2a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "exam_questions",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("exam_id", sa.Integer(), sa.ForeignKey("exams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("qno", sa.Integer(), nullable=False),
        sa.Column("subject", sa.String(50), nullable=False),
        sa.Column("topic", sa.String(200), nullable=True),
        sa.Column("sub_topic", sa.String(200), nullable=True),
        sa.Column("difficulty", sa.String(20), nullable=True),
        sa.Column("question_type", sa.String(50), nullable=True),
        sa.Column("marks", sa.Float(), nullable=True),
        sa.Column("negative_marks", sa.Float(), nullable=True),
        sa.Column("correct_answer", sa.String(500), nullable=True),
        sa.Column("partial_marks", sa.Float(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("exam_id", "qno", name="uq_exam_question_qno"),
    )
    op.create_index("ix_exam_questions_exam_id", "exam_questions", ["exam_id"])


def downgrade() -> None:
    op.drop_index("ix_exam_questions_exam_id", table_name="exam_questions")
    op.drop_table("exam_questions")
