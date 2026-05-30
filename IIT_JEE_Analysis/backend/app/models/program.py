"""Program model."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.mapping import BranchProgram, BranchSection


class Program(Base):
    __tablename__ = "programs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    branch_programs: Mapped[List["BranchProgram"]] = relationship(
        "BranchProgram", back_populates="program", cascade="all, delete-orphan"
    )
    branch_sections: Mapped[List["BranchSection"]] = relationship(
        "BranchSection", back_populates="program", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Program {self.code}>"
