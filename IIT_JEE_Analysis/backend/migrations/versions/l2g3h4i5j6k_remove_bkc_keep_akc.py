"""remove_bkc_keep_akc

Revision ID: l2g3h4i5j6k
Revises: k1f2a3b4c5d6
Create Date: 2026-05-12 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "l2g3h4i5j6k"
down_revision: Union[str, None] = "k1f2a3b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("exam_questions", "bkc")


def downgrade() -> None:
    op.add_column(
        "exam_questions",
        sa.Column("bkc", sa.String(100), nullable=True),
    )
