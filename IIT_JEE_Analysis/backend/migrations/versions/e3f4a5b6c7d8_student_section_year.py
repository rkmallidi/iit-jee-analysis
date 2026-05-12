"""student_section_year — add academic_year_id, per-year unique constraint

Revision ID: e3f4a5b6c7d8
Revises: d2e3f4a5b6c7
Create Date: 2026-05-11 20:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e3f4a5b6c7d8"
down_revision: Union[str, None] = "d2e3f4a5b6c7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add academic_year_id (nullable for backfill)
    op.add_column(
        "student_sections",
        sa.Column("academic_year_id", sa.Integer(), nullable=True),
    )

    # 2. Backfill from the branch_section's academic_year_id
    op.execute("""
        UPDATE student_sections ss
        SET academic_year_id = bs.academic_year_id
        FROM branch_sections bs
        WHERE ss.branch_section_id = bs.id
    """)

    # 3. Make NOT NULL
    op.alter_column("student_sections", "academic_year_id", nullable=False)

    # 4. Add FK
    op.create_foreign_key(
        "student_sections_academic_year_id_fkey",
        "student_sections", "academic_years",
        ["academic_year_id"], ["id"],
        ondelete="CASCADE",
    )

    # 5. Drop old UNIQUE(student_id) constraint, add UNIQUE(student_id, academic_year_id)
    op.drop_constraint("uq_student_sections_student_id", "student_sections", type_="unique")
    op.create_unique_constraint(
        "uq_student_section_year",
        "student_sections",
        ["student_id", "academic_year_id"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_student_section_year", "student_sections", type_="unique")
    op.create_unique_constraint("uq_student_sections_student_id", "student_sections", ["student_id"])
    op.drop_constraint("student_sections_academic_year_id_fkey", "student_sections", type_="foreignkey")
    op.drop_column("student_sections", "academic_year_id")
