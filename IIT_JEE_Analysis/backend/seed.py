"""Bootstrap seed script.

Run with:  python seed.py
Creates all roles and the initial admin user from settings.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import settings
from app.core.database import SessionLocal
from app.crud.user import (
    create_user,
    get_user_by_username,
    seed_roles,
    get_role_by_name,
)
from app.models.user import RoleName, UserRole
from app.schemas.user import UserCreate


def main() -> None:
    db = SessionLocal()
    try:
        print("Seeding roles...")
        seed_roles(db)

        print("Checking admin user...")
        existing = get_user_by_username(db, settings.BOOTSTRAP_ADMIN_USERNAME)
        if existing:
            print(f"Admin user '{settings.BOOTSTRAP_ADMIN_USERNAME}' already exists — skipping.")
        else:
            admin_role = get_role_by_name(db, RoleName.ADMIN)
            user = create_user(
                db,
                UserCreate(
                    username=settings.BOOTSTRAP_ADMIN_USERNAME,
                    email=settings.BOOTSTRAP_ADMIN_EMAIL,
                    full_name=settings.BOOTSTRAP_ADMIN_FULL_NAME,
                    password=settings.BOOTSTRAP_ADMIN_PASSWORD,
                    role_ids=[admin_role.id] if admin_role else [],
                ),
            )
            print(f"Created admin user: {user.username} ({user.email})")

        print("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
