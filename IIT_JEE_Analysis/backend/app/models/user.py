"""User, Role, and UserRole models."""
from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.mapping import DeanBranch, FacultySection, FacultySubject, PrincipalBranch, VicePrincipalBranch, OperatorBranch


class RoleName(str, enum.Enum):
    ADMIN = "Admin"
    DEAN = "Dean"
    PRINCIPAL = "Principal"
    VICE_PRINCIPAL = "Vice-Principal"
    FACULTY = "Faculty"
    OPERATOR = "Operator"


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(
        Enum(RoleName, name="rolename_enum", values_callable=lambda x: [e.value for e in x]),
        unique=True,
        nullable=False,
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    user_roles: Mapped[List["UserRole"]] = relationship("UserRole", back_populates="role")

    def __repr__(self) -> str:
        return f"<Role {self.name}>"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    whatsapp: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    theme_prefs: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="JSON blob: {theme, primary_color, ...}"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    user_roles: Mapped[List["UserRole"]] = relationship(
        "UserRole", back_populates="user", cascade="all, delete-orphan"
    )
    faculty_subjects: Mapped[List["FacultySubject"]] = relationship(
        "FacultySubject", back_populates="faculty", cascade="all, delete-orphan"
    )
    dean_branches: Mapped[List["DeanBranch"]] = relationship(
        "DeanBranch", back_populates="dean", cascade="all, delete-orphan"
    )
    principal_branches: Mapped[List["PrincipalBranch"]] = relationship(
        "PrincipalBranch", back_populates="principal", cascade="all, delete-orphan"
    )
    vice_principal_branches: Mapped[List["VicePrincipalBranch"]] = relationship(
        "VicePrincipalBranch", back_populates="vice_principal", cascade="all, delete-orphan"
    )
    operator_branches: Mapped[List["OperatorBranch"]] = relationship(
        "OperatorBranch", back_populates="operator", cascade="all, delete-orphan"
    )
    faculty_sections: Mapped[List["FacultySection"]] = relationship(
        "FacultySection", back_populates="faculty", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User {self.username}>"


class UserRole(Base):
    __tablename__ = "user_roles"
    __table_args__ = (UniqueConstraint("user_id", "role_id", name="uq_user_role"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="user_roles")
    role: Mapped["Role"] = relationship("Role", back_populates="user_roles")
