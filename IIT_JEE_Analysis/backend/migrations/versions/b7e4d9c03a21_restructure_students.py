"""restructure_students — master data + separate section mapping

Revision ID: b7e4d9c03a21
Revises: a3f9c2d81b04
Create Date: 2026-05-11 15:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b7e4d9c03a21"
down_revision: Union[str, None] = "a3f9c2d81b04"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add phone column to students
    op.add_column("students", sa.Column("phone", sa.String(30), nullable=True))

    # 2. Drop FK constraints then the columns from students
    op.drop_constraint("students_branch_id_fkey",   "students", type_="foreignkey")
    op.drop_constraint("students_program_id_fkey",  "students", type_="foreignkey")
    op.drop_constraint("students_class_id_fkey",    "students", type_="foreignkey")
    op.drop_constraint("students_section_id_fkey",  "students", type_="foreignkey")
    op.drop_column("students", "branch_id")
    op.drop_column("students", "program_id")
    op.drop_column("students", "class_id")
    op.drop_column("students", "section_id")

    # 3. Create student_sections mapping table
    op.create_table(
        "student_sections",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column(
            "student_id",
            sa.Integer(),
            sa.ForeignKey("students.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "branch_section_id",
            sa.Integer(),
            sa.ForeignKey("branch_sections.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "assigned_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("student_id", name="uq_student_sections_student_id"),
    )
    op.create_index("ix_student_sections_branch_section_id", "student_sections", ["branch_section_id"])


def downgrade() -> None:
    op.drop_index("ix_student_sections_branch_section_id", table_name="student_sections")
    op.drop_table("student_sections")

    op.add_column("students", sa.Column("branch_id",  sa.Integer(), nullable=True))
    op.add_column("students", sa.Column("program_id", sa.Integer(), nullable=True))
    op.add_column("students", sa.Column("class_id",   sa.Integer(), nullable=True))
    op.add_column("students", sa.Column("section_id", sa.Integer(), nullable=True))
    op.drop_column("students", "phone")
