"""add avatar_url to users

Revision ID: y5z6a7b8c9d
Revises: x4y5z6a7b8c
Create Date: 2026-05-18
"""
from alembic import op
import sqlalchemy as sa

revision = "y5z6a7b8c9d"
down_revision = "x4y5z6a7b8c"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("avatar_url", sa.String(512), nullable=True))


def downgrade():
    op.drop_column("users", "avatar_url")
