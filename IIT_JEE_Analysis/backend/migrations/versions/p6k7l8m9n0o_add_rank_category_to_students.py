"""Add rank_category column to students table.

Revision ID: p6k7l8m9n0o
Revises: o5j6k7l8m9n
Create Date: 2026-05-15 13:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "p6k7l8m9n0o"
down_revision: Union[str, None] = "o5j6k7l8m9n"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE TYPE rankcategory_enum AS ENUM ('Top 10', 'Top 100', 'Top 1000', 'Top 10000', 'Qualifier')")
    op.add_column(
        "students",
        sa.Column(
            "rank_category",
            sa.Enum("Top 10", "Top 100", "Top 1000", "Top 10000", "Qualifier", name="rankcategory_enum"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("students", "rank_category")
    op.execute("DROP TYPE rankcategory_enum")
