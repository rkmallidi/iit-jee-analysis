"""add mas columns to exams

Revision ID: r8m9n0o1p2q
Revises: q7l8m9n0o1p
Create Date: 2026-05-15
"""
from alembic import op
import sqlalchemy as sa

revision = "r8m9n0o1p2q"
down_revision = "q7l8m9n0o1p"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("exams", sa.Column("mas_mathematics", sa.Float(), nullable=True))
    op.add_column("exams", sa.Column("mas_physics", sa.Float(), nullable=True))
    op.add_column("exams", sa.Column("mas_chemistry", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("exams", "mas_chemistry")
    op.drop_column("exams", "mas_physics")
    op.drop_column("exams", "mas_mathematics")
