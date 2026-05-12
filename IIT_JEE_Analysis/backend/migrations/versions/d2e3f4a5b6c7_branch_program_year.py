"""branch_program_year — add academic_year_id to branch_programs

Revision ID: d2e3f4a5b6c7
Revises: c1d2e3f4a5b6
Create Date: 2026-05-11 19:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d2e3f4a5b6c7"
down_revision: Union[str, None] = "c1d2e3f4a5b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add column (nullable for backfill)
    op.add_column(
        "branch_programs",
        sa.Column("academic_year_id", sa.Integer(), nullable=True),
    )

    # 2. Backfill existing rows with the current academic year
    op.execute(
        "UPDATE branch_programs SET academic_year_id = "
        "(SELECT id FROM academic_years WHERE is_current = true)"
    )

    # 3. Make NOT NULL
    op.alter_column("branch_programs", "academic_year_id", nullable=False)

    # 4. FK
    op.create_foreign_key(
        "branch_programs_academic_year_id_fkey",
        "branch_programs", "academic_years",
        ["academic_year_id"], ["id"],
        ondelete="CASCADE",
    )

    # 5. Swap unique constraint
    op.drop_constraint("uq_branch_program", "branch_programs", type_="unique")
    op.create_unique_constraint(
        "uq_branch_program_year",
        "branch_programs",
        ["academic_year_id", "branch_id", "program_id"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_branch_program_year", "branch_programs", type_="unique")
    op.create_unique_constraint("uq_branch_program", "branch_programs", ["branch_id", "program_id"])
    op.drop_constraint("branch_programs_academic_year_id_fkey", "branch_programs", type_="foreignkey")
    op.drop_column("branch_programs", "academic_year_id")
