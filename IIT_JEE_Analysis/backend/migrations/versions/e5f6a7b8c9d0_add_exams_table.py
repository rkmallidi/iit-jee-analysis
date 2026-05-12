"""add_exams_table

Revision ID: e5f6a7b8c9d0
Revises: e3f4a5b6c7d8
Create Date: 2026-05-11 00:01:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "e3f4a5b6c7d8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "exams",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("academic_year_id", sa.Integer(), sa.ForeignKey("academic_years.id"), nullable=False),
        sa.Column("program_id", sa.Integer(), sa.ForeignKey("programs.id"), nullable=False),
        sa.Column("class_id", sa.Integer(), sa.ForeignKey("classes.id"), nullable=False),
        sa.Column("exam_code", sa.String(50), nullable=False),
        sa.Column("exam_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("academic_year_id", "exam_code", name="uq_exam_code_per_year"),
    )
    op.create_index("ix_exams_academic_year_id", "exams", ["academic_year_id"])
    op.create_index("ix_exams_program_id", "exams", ["program_id"])
    op.create_index("ix_exams_class_id", "exams", ["class_id"])


def downgrade() -> None:
    op.drop_index("ix_exams_class_id", table_name="exams")
    op.drop_index("ix_exams_program_id", table_name="exams")
    op.drop_index("ix_exams_academic_year_id", table_name="exams")
    op.drop_table("exams")
