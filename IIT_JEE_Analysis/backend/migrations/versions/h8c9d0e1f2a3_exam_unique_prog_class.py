"""exam_unique_prog_class — unique key now includes program_id and class_id

Revision ID: h8c9d0e1f2a3
Revises: g7b8c9d0e1f2
Create Date: 2026-05-11 00:04:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "h8c9d0e1f2a3"
down_revision: Union[str, None] = "g7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("uq_exam_code_paper_per_year", "exams", type_="unique")
    op.create_unique_constraint(
        "uq_exam_per_year_prog_class_paper",
        "exams",
        ["academic_year_id", "exam_code", "program_id", "class_id", "paper"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_exam_per_year_prog_class_paper", "exams", type_="unique")
    op.create_unique_constraint(
        "uq_exam_code_paper_per_year",
        "exams",
        ["academic_year_id", "exam_code", "paper"],
    )
