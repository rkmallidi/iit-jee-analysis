"""rename_maths_to_mathematics

Revision ID: 211e76612194
Revises: af1c704a4403
Create Date: 2026-05-11 13:02:09.113579

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '211e76612194'
down_revision: Union[str, None] = 'af1c704a4403'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE subjectname_enum RENAME VALUE 'Maths' TO 'Mathematics'")


def downgrade() -> None:
    op.execute("ALTER TYPE subjectname_enum RENAME VALUE 'Mathematics' TO 'Maths'")
