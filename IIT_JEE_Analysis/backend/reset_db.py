"""
Database reset utility.

Run this ONLY if a previous migration attempt left the database in a partial
state (e.g. enum types were created but tables were not).

Usage:
    cd backend
    python reset_db.py

WARNING: This drops ALL application tables and types. All data will be lost.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import settings
import sqlalchemy as sa


def reset() -> None:
    print("Connecting to:", settings.DATABASE_URL)
    engine = sa.create_engine(settings.DATABASE_URL)

    drop_tables = [
        "faculty_sections",
        "branch_sections",
        "branch_programs",
        "principal_branches",
        "dean_branches",
        "faculty_subjects",
        "sections",
        "classes",
        "programs",
        "branches",
        "user_roles",
        "users",
        "roles",
        "alembic_version",
    ]

    drop_types = [
        "subjectname_enum",
        "rolename_enum",
    ]

    with engine.begin() as conn:
        for table in drop_tables:
            conn.execute(sa.text(f"DROP TABLE IF EXISTS {table} CASCADE"))
            print(f"  dropped table: {table}")
        for typ in drop_types:
            conn.execute(sa.text(f"DROP TYPE IF EXISTS {typ} CASCADE"))
            print(f"  dropped type:  {typ}")

    print("\nDatabase reset complete. You can now re-run run.bat.")


if __name__ == "__main__":
    confirm = input(
        "\nThis will DROP all tables and lose all data.\n"
        "Type YES to continue: "
    ).strip()
    if confirm == "YES":
        reset()
    else:
        print("Aborted.")
        sys.exit(0)
