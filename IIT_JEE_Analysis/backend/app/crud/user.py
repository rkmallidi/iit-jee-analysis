"""CRUD helpers for User and Role."""
import json
from typing import Optional, Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.security import hash_password
from app.models.mapping import FacultySubject, SubjectName
from app.models.user import Role, RoleName, User, UserRole
from app.schemas.user import UserCreate, UserUpdate


# ----------- Role -----------

def get_roles(db: Session) -> Sequence[Role]:
    return db.scalars(select(Role)).all()


def get_role_by_name(db: Session, name: RoleName) -> Optional[Role]:
    return db.scalar(select(Role).where(Role.name == name))


def get_roles_by_ids(db: Session, ids: list[int]) -> Sequence[Role]:
    return db.scalars(select(Role).where(Role.id.in_(ids))).all()


def seed_roles(db: Session) -> None:
    """Create all roles if they don't exist yet."""
    for role_name in RoleName:
        existing = get_role_by_name(db, role_name)
        if not existing:
            db.add(Role(name=role_name))
    db.commit()


# ----------- User -----------

def _user_query():
    return select(User).options(
        selectinload(User.user_roles).selectinload(UserRole.role),
        selectinload(User.faculty_subjects),
    )


def _replace_faculty_subjects(db: Session, user_id: int, subjects: list[SubjectName]) -> None:
    db.query(FacultySubject).filter(FacultySubject.user_id == user_id).delete()
    for subject in dict.fromkeys(subjects):
        db.add(FacultySubject(user_id=user_id, subject=subject))


def _is_faculty_role_name(name: RoleName | str) -> bool:
    return name == RoleName.FACULTY or name == RoleName.FACULTY.value


def get_user(db: Session, user_id: int) -> Optional[User]:
    return db.scalar(_user_query().where(User.id == user_id))


def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.scalar(_user_query().where(User.username == username))


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.scalar(_user_query().where(User.email == email))


def get_users(db: Session, skip: int = 0, limit: int = 100) -> Sequence[User]:
    return db.scalars(_user_query().offset(skip).limit(limit)).all()


def create_user(db: Session, data: UserCreate) -> User:
    roles = get_roles_by_ids(db, data.role_ids) if data.role_ids else []
    is_faculty = any(_is_faculty_role_name(role.name) for role in roles)
    if is_faculty and not data.faculty_subjects:
        raise ValueError("Faculty subject is required")

    user = User(
        username=data.username,
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        phone=data.phone,
        whatsapp=data.whatsapp,
        is_active=data.is_active,
    )
    db.add(user)
    db.flush()  # get user.id
    for role in roles:
        db.add(UserRole(user_id=user.id, role_id=role.id))
    if is_faculty:
        _replace_faculty_subjects(db, user.id, data.faculty_subjects)
    db.commit()
    return db.scalar(_user_query().where(User.id == user.id))


def update_user(db: Session, user: User, data: UserUpdate) -> User:
    target_roles = get_roles_by_ids(db, data.role_ids) if data.role_ids is not None else [ur.role for ur in user.user_roles]
    will_be_faculty = any(_is_faculty_role_name(role.name) for role in target_roles)
    if will_be_faculty:
        target_subjects = data.faculty_subjects if data.faculty_subjects is not None else [fs.subject for fs in user.faculty_subjects]
        if not target_subjects:
            raise ValueError("Faculty subject is required")

    if data.email is not None:
        user.email = data.email
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.phone is not None:
        user.phone = data.phone
    if data.whatsapp is not None:
        user.whatsapp = data.whatsapp
    if data.clear_avatar:
        user.avatar_url = None
    elif data.avatar_url is not None:
        user.avatar_url = data.avatar_url
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.password is not None:
        user.hashed_password = hash_password(data.password)
    if data.role_ids is not None:
        # Replace roles
        db.query(UserRole).filter(UserRole.user_id == user.id).delete()
        for role in target_roles:
            db.add(UserRole(user_id=user.id, role_id=role.id))
        if not will_be_faculty:
            _replace_faculty_subjects(db, user.id, [])
    if data.faculty_subjects is not None:
        _replace_faculty_subjects(db, user.id, data.faculty_subjects if will_be_faculty else [])
    db.commit()
    return db.scalar(_user_query().where(User.id == user.id))


def update_user_theme(db: Session, user: User, theme_prefs: dict) -> User:
    user.theme_prefs = json.dumps(theme_prefs)
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user: User) -> None:
    user.is_active = False
    db.commit()
