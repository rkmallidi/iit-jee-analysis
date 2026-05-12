"""add_academic_year — top-level umbrella; wire academic_year_id into branch_sections

Revision ID: c1d2e3f4a5b6
Revises: b7e4d9c03a21
Create Date: 2026-05-11 18:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c1d2e3f4a5b6"
down_revision: Union[str, None] = "b7e4d9c03a21"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create academic_years table
    op.create_table(
        "academic_years",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(20), unique=True, nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("is_current", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # 2. Seed the default academic year and capture its id
    op.execute(
        "INSERT INTO academic_years (name, start_date, end_date, is_current) "
        "VALUES ('2024-25', '2024-04-01', '2025-03-31', true)"
    )

    # 3. Add academic_year_id to branch_sections (nullable for backfill)
    op.add_column(
        "branch_sections",
        sa.Column("academic_year_id", sa.Integer(), nullable=True),
    )

    # 4. Backfill existing rows with the default year
    op.execute(
        "UPDATE branch_sections SET academic_year_id = "
        "(SELECT id FROM academic_years WHERE is_current = true)"
    )

    # 5. Make NOT NULL
    op.alter_column("branch_sections", "academic_year_id", nullable=False)

    # 6. Add FK
    op.create_foreign_key(
        "branch_sections_academic_year_id_fkey",
        "branch_sections", "academic_years",
        ["academic_year_id"], ["id"],
        ondelete="CASCADE",
    )

    # 7. Drop old unique constraint, add new one that includes academic_year_id
    op.drop_constraint("uq_branch_program_class_section", "branch_sections", type_="unique")
    op.create_unique_constraint(
        "uq_branch_section_year",
        "branch_sections",
        ["academic_year_id", "branch_id", "program_id", "class_id", "section_id"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_branch_section_year", "branch_sections", type_="unique")
    op.create_unique_constraint(
        "uq_branch_program_class_section",
        "branch_sections",
        ["branch_id", "program_id", "class_id", "section_id"],
    )
    op.drop_constraint("branch_sections_academic_year_id_fkey", "branch_sections", type_="foreignkey")
    op.drop_column("branch_sections", "academic_year_id")
    op.drop_table("academic_years")
