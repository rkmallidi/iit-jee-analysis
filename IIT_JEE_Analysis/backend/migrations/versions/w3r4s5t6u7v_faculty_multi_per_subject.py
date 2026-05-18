"""Allow multiple faculty per subject per section slot.

Replaces the unique constraint (branch_section_id, subject) with
(branch_section_id, subject, user_id) so several faculty can co-teach
the same subject in a section (each covering different concepts).

Revision ID: w3r4s5t6u7v
Revises: v2q3r4s5t6u
Create Date: 2026-05-18
"""
from alembic import op

revision = "w3r4s5t6u7v"
down_revision = "v2q3r4s5t6u"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("uq_faculty_section_subject", "faculty_sections", type_="unique")
    op.create_unique_constraint(
        "uq_faculty_section_subject_user",
        "faculty_sections",
        ["branch_section_id", "subject", "user_id"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_faculty_section_subject_user", "faculty_sections", type_="unique")
    # Restore old constraint — existing duplicate rows will cause this to fail
    # if multiple faculty were already assigned to the same subject+slot.
    op.create_unique_constraint(
        "uq_faculty_section_subject",
        "faculty_sections",
        ["branch_section_id", "subject"],
    )
