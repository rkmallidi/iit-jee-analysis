"""rename_correct_answer_to_bkc

Revision ID: m3h4i5j6k7l
Revises: l2g3h4i5j6k
Create Date: 2026-05-12 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "m3h4i5j6k7l"
down_revision: Union[str, None] = "l2g3h4i5j6k"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "exam_questions",
        "correct_answer",
        new_column_name="bkc",
    )


def downgrade() -> None:
    op.alter_column(
        "exam_questions",
        "bkc",
        new_column_name="correct_answer",
    )
