"""exam_type_and_paper — add exam_type and paper columns to exams

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-05-11 00:02:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop old unique constraint
    op.drop_constraint("uq_exam_code_per_year", "exams", type_="unique")

    # Add new columns (with server defaults so existing rows aren't rejected)
    op.add_column("exams", sa.Column("exam_type", sa.String(20), nullable=False, server_default="Mains"))
    op.add_column("exams", sa.Column("paper",     sa.String(10), nullable=False, server_default="Single"))

    # Remove server defaults now that existing rows are covered
    op.alter_column("exams", "exam_type", server_default=None)
    op.alter_column("exams", "paper",     server_default=None)

    # Add new unique constraint
    op.create_unique_constraint("uq_exam_code_paper_per_year", "exams", ["academic_year_id", "exam_code", "paper"])


def downgrade() -> None:
    op.drop_constraint("uq_exam_code_paper_per_year", "exams", type_="unique")
    op.drop_column("exams", "paper")
    op.drop_column("exams", "exam_type")
    op.create_unique_constraint("uq_exam_code_per_year", "exams", ["academic_year_id", "exam_code"])
