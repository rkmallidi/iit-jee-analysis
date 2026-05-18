"""Replace single faculty snapshot columns with JSON array columns.

Each subject slot can now have multiple co-teachers; store all IDs and names
as JSON arrays instead of a single integer/string per subject.

Revision ID: x4y5z6a7b8c
Revises: w3r4s5t6u7v
Create Date: 2026-05-18
"""
import sqlalchemy as sa
from alembic import op

revision = "x4y5z6a7b8c"
down_revision = "w3r4s5t6u7v"
branch_labels = None
depends_on = None

_TABLES = ["student_evaluations", "student_cumulative_evaluations"]
_SUBJECTS = ["math", "physics", "chemistry"]


def upgrade() -> None:
    for tbl in _TABLES:
        # Drop old single-value columns
        for subj in _SUBJECTS:
            op.drop_column(tbl, f"{subj}_faculty_id")
            op.drop_column(tbl, f"{subj}_faculty_name")
        # Add new JSON array columns
        for subj in _SUBJECTS:
            op.add_column(tbl, sa.Column(f"{subj}_faculty_ids",   sa.JSON, nullable=True))
            op.add_column(tbl, sa.Column(f"{subj}_faculty_names", sa.JSON, nullable=True))


def downgrade() -> None:
    for tbl in _TABLES:
        for subj in _SUBJECTS:
            op.drop_column(tbl, f"{subj}_faculty_ids")
            op.drop_column(tbl, f"{subj}_faculty_names")
        for subj in _SUBJECTS:
            op.add_column(tbl, sa.Column(f"{subj}_faculty_id",   sa.Integer, nullable=True))
            op.add_column(tbl, sa.Column(f"{subj}_faculty_name", sa.String(200), nullable=True))
