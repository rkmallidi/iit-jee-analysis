"""exam_paper_no_single — replace 'Single' paper value with 'P1'

Revision ID: g7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-05-11 00:03:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "g7b8c9d0e1f2"
down_revision: Union[str, None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE exams SET paper = 'P1' WHERE paper = 'Single'")


def downgrade() -> None:
    op.execute("UPDATE exams SET paper = 'Single' WHERE paper = 'P1' AND exam_type = 'Mains'")
