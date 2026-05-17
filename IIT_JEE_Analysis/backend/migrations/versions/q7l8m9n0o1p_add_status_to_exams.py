"""Add status column to exams table.

Revision ID: q7l8m9n0o1p
Revises: p6k7l8m9n0o
Create Date: 2026-05-15 14:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "q7l8m9n0o1p"
down_revision: Union[str, None] = "p6k7l8m9n0o"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "exams",
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
    )


def downgrade() -> None:
    op.drop_column("exams", "status")
