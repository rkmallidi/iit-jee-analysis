"""add exam_upload_logs table

Revision ID: s9n0o1p2q3r
Revises: n4i5j6k7l8m
Create Date: 2026-05-15
"""
from alembic import op
import sqlalchemy as sa

revision = "s9n0o1p2q3r"
down_revision = "r8m9n0o1p2q"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "exam_upload_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("exam_id", sa.Integer(), sa.ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, unique=True, index=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("valid_count", sa.Integer(), nullable=False, default=0),
        sa.Column("absent_count", sa.Integer(), nullable=False, default=0),
        sa.Column("duplicate_count", sa.Integer(), nullable=False, default=0),
        sa.Column("invalid_count", sa.Integer(), nullable=False, default=0),
        sa.Column("absent_list", sa.Text(), nullable=False, default=""),
        sa.Column("file_name", sa.String(255), nullable=False, default=""),
    )


def downgrade() -> None:
    op.drop_table("exam_upload_logs")
