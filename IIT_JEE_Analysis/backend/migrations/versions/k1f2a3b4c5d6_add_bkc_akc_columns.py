"""add_bkc_akc_columns

Revision ID: k1f2a3b4c5d6
Revises: j0e1f2a3b4c5
Create Date: 2026-05-12 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "k1f2a3b4c5d6"
down_revision: Union[str, None] = "j0e1f2a3b4c5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "exam_questions",
        sa.Column("bkc", sa.String(100), nullable=True),
    )
    op.add_column(
        "exam_questions",
        sa.Column("akc", sa.String(100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("exam_questions", "akc")
    op.drop_column("exam_questions", "bkc")
