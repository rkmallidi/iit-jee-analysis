"""AcademicYear model — top-level umbrella for all section/student mappings."""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.mapping import BranchSection


class AcademicYear(Base):
    __tablename__ = "academic_years"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)  # e.g. "2024-25"
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    branch_sections: Mapped[list["BranchSection"]] = relationship(
        "BranchSection", back_populates="academic_year"
    )
