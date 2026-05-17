"""Student master-data model."""
from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, Integer, String, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class RankCategory(str, enum.Enum):
    TOP_10 = "Top 10"
    TOP_100 = "Top 100"
    TOP_1000 = "Top 1000"
    TOP_10000 = "Top 10000"
    QUALIFIER = "Qualifier"

if TYPE_CHECKING:
    from app.models.student_section import StudentSection


class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    admission_no: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    target_rank: Mapped[str | None] = mapped_column(
        Enum(RankCategory, name="rankcategory_enum", values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    section_mappings: Mapped[list["StudentSection"]] = relationship(
        "StudentSection", back_populates="student",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Student {self.admission_no}>"
