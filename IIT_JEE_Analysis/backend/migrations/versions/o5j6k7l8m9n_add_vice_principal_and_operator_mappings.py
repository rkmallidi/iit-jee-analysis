"""Add vice_principal_branches and operator_branches mapping tables.

Revision ID: o5j6k7l8m9n
Revises: n4i5j6k7l8m
Create Date: 2026-05-15 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "o5j6k7l8m9n"
down_revision: Union[str, None] = "n4i5j6k7l8m"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "vice_principal_branches",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("branch_id", sa.Integer(), nullable=False),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["branch_id"], ["branches.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "branch_id", name="uq_vice_principal_branch"),
    )
    op.create_index(
        op.f("ix_vice_principal_branches_user_id"), "vice_principal_branches", ["user_id"], unique=False
    )
    op.create_index(
        op.f("ix_vice_principal_branches_branch_id"), "vice_principal_branches", ["branch_id"], unique=False
    )

    op.create_table(
        "operator_branches",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("branch_id", sa.Integer(), nullable=False),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["branch_id"], ["branches.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "branch_id", name="uq_operator_branch"),
    )
    op.create_index(
        op.f("ix_operator_branches_user_id"), "operator_branches", ["user_id"], unique=False
    )
    op.create_index(
        op.f("ix_operator_branches_branch_id"), "operator_branches", ["branch_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_operator_branches_branch_id"), table_name="operator_branches")
    op.drop_index(op.f("ix_operator_branches_user_id"), table_name="operator_branches")
    op.drop_table("operator_branches")

    op.drop_index(op.f("ix_vice_principal_branches_branch_id"), table_name="vice_principal_branches")
    op.drop_index(op.f("ix_vice_principal_branches_user_id"), table_name="vice_principal_branches")
    op.drop_table("vice_principal_branches")
