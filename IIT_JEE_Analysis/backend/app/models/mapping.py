"""All mapping / association models.

Kept in one file to avoid circular imports — parent models import from here.
"""
import enum
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime, Enum, ForeignKey, Integer, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


# ---------------------------------------------------------------------------
# Faculty subject enum
# ---------------------------------------------------------------------------

class SubjectName(str, enum.Enum):
    MATHS = "Maths"
    CHEMISTRY = "Chemistry"
    PHYSICS = "Physics"


# ---------------------------------------------------------------------------
# FacultySubject — one subject per faculty member
# ---------------------------------------------------------------------------

class FacultySubject(Base):
    __tablename__ = "faculty_subjects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    subject: Mapped[str] = mapped_column(
        Enum(SubjectName, name="subjectname_enum", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    faculty: Mapped["User"] = relationship("User", back_populates="faculty_subject")  # type: ignore[name-defined]


# ---------------------------------------------------------------------------
# DeanBranch — many-to-many Dean ↔ Branch
# ---------------------------------------------------------------------------

class DeanBranch(Base):
    __tablename__ = "dean_branches"
    __table_args__ = (UniqueConstraint("user_id", "branch_id", name="uq_dean_branch"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    branch_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("branches.id", ondelete="CASCADE"), nullable=False
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    dean: Mapped["User"] = relationship("User", back_populates="dean_branches")  # type: ignore[name-defined]
    branch: Mapped["Branch"] = relationship("Branch", back_populates="dean_branches")  # type: ignore[name-defined]


# ---------------------------------------------------------------------------
# PrincipalBranch — many-to-many Principal ↔ Branch
# ---------------------------------------------------------------------------

class PrincipalBranch(Base):
    __tablename__ = "principal_branches"
    __table_args__ = (UniqueConstraint("user_id", "branch_id", name="uq_principal_branch"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    branch_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("branches.id", ondelete="CASCADE"), nullable=False
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    principal: Mapped["User"] = relationship("User", back_populates="principal_branches")  # type: ignore[name-defined]
    branch: Mapped["Branch"] = relationship("Branch", back_populates="principal_branches")  # type: ignore[name-defined]


# ---------------------------------------------------------------------------
# BranchProgram — many-to-many Branch ↔ Program
# ---------------------------------------------------------------------------

class BranchProgram(Base):
    __tablename__ = "branch_programs"
    __table_args__ = (UniqueConstraint("branch_id", "program_id", name="uq_branch_program"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    branch_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("branches.id", ondelete="CASCADE"), nullable=False
    )
    program_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("programs.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    branch: Mapped["Branch"] = relationship("Branch", back_populates="branch_programs")  # type: ignore[name-defined]
    program: Mapped["Program"] = relationship("Program", back_populates="branch_programs")  # type: ignore[name-defined]


# ---------------------------------------------------------------------------
# BranchSection — the core slot: Branch + Program + Class + Section
# ---------------------------------------------------------------------------

class BranchSection(Base):
    """Represents a specific section slot: a branch runs a program's class as a section."""
    __tablename__ = "branch_sections"
    __table_args__ = (
        UniqueConstraint(
            "branch_id", "program_id", "class_id", "section_id",
            name="uq_branch_program_class_section",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    branch_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("branches.id", ondelete="CASCADE"), nullable=False
    )
    program_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("programs.id", ondelete="CASCADE"), nullable=False
    )
    class_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False
    )
    section_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("sections.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    branch: Mapped["Branch"] = relationship("Branch", back_populates="branch_sections")  # type: ignore[name-defined]
    program: Mapped["Program"] = relationship("Program", back_populates="branch_sections")  # type: ignore[name-defined]
    class_: Mapped["Class"] = relationship("Class", back_populates="branch_sections")  # type: ignore[name-defined]
    section: Mapped["Section"] = relationship("Section", back_populates="branch_sections")  # type: ignore[name-defined]
    faculty_sections: Mapped[list["FacultySection"]] = relationship(
        "FacultySection", back_populates="branch_section", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# FacultySection — Faculty mapped to a BranchSection slot
# ---------------------------------------------------------------------------

class FacultySection(Base):
    """Maps a faculty member to a specific Branch+Program+Class+Section slot."""
    __tablename__ = "faculty_sections"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "branch_section_id",
            name="uq_faculty_branch_section",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    branch_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("branches.id", ondelete="CASCADE"), nullable=False
    )
    class_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False
    )
    section_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("sections.id", ondelete="CASCADE"), nullable=False
    )
    branch_section_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("branch_sections.id", ondelete="CASCADE"), nullable=False
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    faculty: Mapped["User"] = relationship("User", back_populates="faculty_sections")  # type: ignore[name-defined]
    branch: Mapped["Branch"] = relationship("Branch", back_populates="faculty_sections")  # type: ignore[name-defined]
    class_: Mapped["Class"] = relationship("Class", back_populates="faculty_sections")  # type: ignore[name-defined]
    section: Mapped["Section"] = relationship("Section", back_populates="faculty_sections")  # type: ignore[name-defined]
    branch_section: Mapped["BranchSection"] = relationship("BranchSection", back_populates="faculty_sections")
