"""add branch_id to exam_upload_logs

Revision ID: t0o1p2q3r4s
Revises: s9n0o1p2q3r
Create Date: 2026-05-15
"""
from alembic import op
import sqlalchemy as sa

revision = "t0o1p2q3r4s"
down_revision = "s9n0o1p2q3r"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop old table (no branch_id, single unique on exam_id)
    op.drop_table("exam_upload_logs")

    # Recreate with branch_id and composite unique constraint
    op.create_table(
        "exam_upload_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "exam_id",
            sa.Integer(),
            sa.ForeignKey("exams.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "branch_id",
            sa.Integer(),
            sa.ForeignKey("branches.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("valid_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("absent_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("duplicate_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("invalid_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("absent_list", sa.Text(), nullable=False, server_default=""),
        sa.Column("file_name", sa.String(255), nullable=False, server_default=""),
        sa.UniqueConstraint("exam_id", "branch_id", name="uq_upload_log_exam_branch"),
    )


def downgrade() -> None:
    op.drop_table("exam_upload_logs")

    op.create_table(
        "exam_upload_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "exam_id",
            sa.Integer(),
            sa.ForeignKey("exams.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
            index=True,
        ),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("valid_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("absent_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("duplicate_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("invalid_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("absent_list", sa.Text(), nullable=False, server_default=""),
        sa.Column("file_name", sa.String(255), nullable=False, server_default=""),
    )
