"""Branch model."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, List

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.mapping import (
        BranchProgram, BranchSection, DeanBranch, FacultySection, PrincipalBranch,
        VicePrincipalBranch, OperatorBranch
    )


class Branch(Base):
    __tablename__ = "branches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    dean_branches: Mapped[List["DeanBranch"]] = relationship(
        "DeanBranch", back_populates="branch", cascade="all, delete-orphan"
    )
    principal_branches: Mapped[List["PrincipalBranch"]] = relationship(
        "PrincipalBranch", back_populates="branch", cascade="all, delete-orphan"
    )
    vice_principal_branches: Mapped[List["VicePrincipalBranch"]] = relationship(
        "VicePrincipalBranch", back_populates="branch", cascade="all, delete-orphan"
    )
    operator_branches: Mapped[List["OperatorBranch"]] = relationship(
        "OperatorBranch", back_populates="branch", cascade="all, delete-orphan"
    )
    branch_programs: Mapped[List["BranchProgram"]] = relationship(
        "BranchProgram", back_populates="branch", cascade="all, delete-orphan"
    )
    branch_sections: Mapped[List["BranchSection"]] = relationship(
        "BranchSection", back_populates="branch", cascade="all, delete-orphan"
    )
    faculty_sections: Mapped[List["FacultySection"]] = relationship(
        "FacultySection", back_populates="branch", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Branch {self.code}>"
