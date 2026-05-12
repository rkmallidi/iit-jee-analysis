"""add_students_table

Revision ID: a3f9c2d81b04
Revises: 211e76612194
Create Date: 2026-05-11 14:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a3f9c2d81b04"
down_revision: Union[str, None] = "211e76612194"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "students",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("admission_no", sa.String(50), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column(
            "branch_id",
            sa.Integer(),
            sa.ForeignKey("branches.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "program_id",
            sa.Integer(),
            sa.ForeignKey("programs.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "class_id",
            sa.Integer(),
            sa.ForeignKey("classes.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "section_id",
            sa.Integer(),
            sa.ForeignKey("sections.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("admission_no", name="uq_students_admission_no"),
    )
    op.create_index("ix_students_admission_no", "students", ["admission_no"])


def downgrade() -> None:
    op.drop_index("ix_students_admission_no", table_name="students")
    op.drop_table("students")
