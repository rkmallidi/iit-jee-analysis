"""Drop duration_years from programs table.

Revision ID: 002
Revises: 001
Create Date: 2026-05-11
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("programs", "duration_years")


def downgrade() -> None:
    op.add_column(
        "programs",
        sa.Column("duration_years", sa.SmallInteger(), nullable=False, server_default="2"),
    )
