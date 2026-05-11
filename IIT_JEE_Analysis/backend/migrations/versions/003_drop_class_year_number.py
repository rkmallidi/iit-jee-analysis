"""Drop year_number from classes table.

Revision ID: 003
Revises: 002
Create Date: 2026-05-11
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("classes", "year_number")


def downgrade() -> None:
    op.add_column(
        "classes",
        sa.Column("year_number", sa.SmallInteger(), nullable=False, server_default="1"),
    )
