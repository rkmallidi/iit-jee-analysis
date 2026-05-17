"""Rename rank_category to target_rank on students table.

Revision ID: v2q3r4s5t6u
Revises: u1p2q3r4s5t
Create Date: 2026-05-17
"""
from alembic import op

revision = "v2q3r4s5t6u"
down_revision = "u1p2q3r4s5t"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("students", "rank_category", new_column_name="target_rank")


def downgrade() -> None:
    op.alter_column("students", "target_rank", new_column_name="rank_category")
