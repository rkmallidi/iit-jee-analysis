"""CRUD for all mapping tables."""
from typing import Optional, Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.branch import Branch
from app.models.class_ import Class
from app.models.mapping import (
    BranchProgram,
    BranchSection,
    DeanBranch,
    FacultySection,
    FacultySubject,
    PrincipalBranch,
    SubjectName,
)
from app.models.program import Program
from app.models.section import Section
from app.models.user import User, UserRole


# -------- FacultySubject --------

def get_faculty_subject(db: Session, user_id: int) -> Optional[FacultySubject]:
    return db.scalar(select(FacultySubject).where(FacultySubject.user_id == user_id))

def set_faculty_subject(db: Session, user_id: int, subject: SubjectName) -> FacultySubject:
    existing = get_faculty_subject(db, user_id)
    if existing:
        existing.subject = subject
        db.commit(); db.refresh(existing)
        return existing
    obj = FacultySubject(user_id=user_id, subject=subject)
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

def delete_faculty_subject(db: Session, fs: FacultySubject) -> None:
    db.delete(fs); db.commit()


# -------- DeanBranch --------

def get_dean_branches(db: Session) -> Sequence[DeanBranch]:
    return db.scalars(
        select(DeanBranch)
        .options(selectinload(DeanBranch.dean).selectinload(UserRole.role))  # type: ignore[arg-type]
    ).all()

def get_dean_branch(db: Session, id: int) -> Optional[DeanBranch]:
    return db.get(DeanBranch, id)

def assign_dean_branch(db: Session, user_id: int, branch_id: int) -> DeanBranch:
    existing = db.scalar(
        select(DeanBranch).where(DeanBranch.user_id == user_id, DeanBranch.branch_id == branch_id)
    )
    if existing:
        return existing
    obj = DeanBranch(user_id=user_id, branch_id=branch_id)
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

def remove_dean_branch(db: Session, db_obj: DeanBranch) -> None:
    db.delete(db_obj); db.commit()


# -------- PrincipalBranch --------

def get_principal_branches(db: Session) -> Sequence[PrincipalBranch]:
    return db.scalars(select(PrincipalBranch)).all()

def get_principal_branch(db: Session, id: int) -> Optional[PrincipalBranch]:
    return db.get(PrincipalBranch, id)

def assign_principal_branch(db: Session, user_id: int, branch_id: int) -> PrincipalBranch:
    existing = db.scalar(
        select(PrincipalBranch).where(
            PrincipalBranch.user_id == user_id, PrincipalBranch.branch_id == branch_id
        )
    )
    if existing:
        return existing
    obj = PrincipalBranch(user_id=user_id, branch_id=branch_id)
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

def remove_principal_branch(db: Session, db_obj: PrincipalBranch) -> None:
    db.delete(db_obj); db.commit()


# -------- BranchProgram --------

def get_branch_programs(db: Session, branch_id: Optional[int] = None) -> Sequence[BranchProgram]:
    q = select(BranchProgram)
    if branch_id:
        q = q.where(BranchProgram.branch_id == branch_id)
    return db.scalars(q).all()

def get_branch_program(db: Session, id: int) -> Optional[BranchProgram]:
    return db.get(BranchProgram, id)

def assign_branch_program(db: Session, branch_id: int, program_id: int) -> BranchProgram:
    existing = db.scalar(
        select(BranchProgram).where(
            BranchProgram.branch_id == branch_id, BranchProgram.program_id == program_id
        )
    )
    if existing:
        return existing
    obj = BranchProgram(branch_id=branch_id, program_id=program_id)
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

def remove_branch_program(db: Session, db_obj: BranchProgram) -> None:
    db.delete(db_obj); db.commit()


# -------- BranchSection --------

def get_branch_sections(
    db: Session,
    branch_id: Optional[int] = None,
    program_id: Optional[int] = None,
) -> Sequence[BranchSection]:
    q = select(BranchSection).options(
        selectinload(BranchSection.branch),
        selectinload(BranchSection.program),
        selectinload(BranchSection.class_),
        selectinload(BranchSection.section),
    )
    if branch_id:
        q = q.where(BranchSection.branch_id == branch_id)
    if program_id:
        q = q.where(BranchSection.program_id == program_id)
    return db.scalars(q).all()

def get_branch_section(db: Session, id: int) -> Optional[BranchSection]:
    return db.scalar(
        select(BranchSection)
        .where(BranchSection.id == id)
        .options(
            selectinload(BranchSection.branch),
            selectinload(BranchSection.program),
            selectinload(BranchSection.class_),
            selectinload(BranchSection.section),
        )
    )

def create_branch_section(
    db: Session, branch_id: int, program_id: int, class_id: int, section_id: int
) -> BranchSection:
    existing = db.scalar(
        select(BranchSection).where(
            BranchSection.branch_id == branch_id,
            BranchSection.program_id == program_id,
            BranchSection.class_id == class_id,
            BranchSection.section_id == section_id,
        )
    )
    if existing:
        return existing
    obj = BranchSection(
        branch_id=branch_id, program_id=program_id, class_id=class_id, section_id=section_id
    )
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

def delete_branch_section(db: Session, db_obj: BranchSection) -> None:
    db.delete(db_obj); db.commit()


# -------- FacultySection --------

def get_faculty_sections(
    db: Session, user_id: Optional[int] = None
) -> Sequence[FacultySection]:
    q = select(FacultySection).options(
        selectinload(FacultySection.branch),
        selectinload(FacultySection.class_),
        selectinload(FacultySection.section),
    )
    if user_id:
        q = q.where(FacultySection.user_id == user_id)
    return db.scalars(q).all()

def get_faculty_section(db: Session, id: int) -> Optional[FacultySection]:
    return db.get(FacultySection, id)

def assign_faculty_section(db: Session, user_id: int, branch_section_id: int) -> FacultySection:
    bs = db.get(BranchSection, branch_section_id)
    if not bs:
        raise ValueError(f"BranchSection {branch_section_id} not found")
    existing = db.scalar(
        select(FacultySection).where(
            FacultySection.user_id == user_id,
            FacultySection.branch_section_id == branch_section_id,
        )
    )
    if existing:
        return existing
    obj = FacultySection(
        user_id=user_id,
        branch_section_id=branch_section_id,
        branch_id=bs.branch_id,
        class_id=bs.class_id,
        section_id=bs.section_id,
    )
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

def remove_faculty_section(db: Session, db_obj: FacultySection) -> None:
    db.delete(db_obj); db.commit()


# -------- Overview helpers --------

def get_faculty_overview(db: Session, user_id: int) -> dict:
    user = db.scalar(
        select(User).where(User.id == user_id)
        .options(selectinload(User.user_roles).selectinload(UserRole.role))
    )
    if not user:
        raise ValueError("User not found")
    subject_row = get_faculty_subject(db, user_id)
    sections = db.scalars(
        select(FacultySection)
        .where(FacultySection.user_id == user_id)
        .options(
            selectinload(FacultySection.branch),
            selectinload(FacultySection.class_),
            selectinload(FacultySection.section),
            selectinload(FacultySection.branch_section).selectinload(BranchSection.program),
        )
    ).all()
    return {"faculty": user, "subject": subject_row.subject if subject_row else None, "sections": [fs.branch_section for fs in sections]}


def get_program_overview(db: Session, program_id: int) -> dict:
    program = db.get(Program, program_id)
    if not program:
        raise ValueError("Program not found")
    branch_sections = db.scalars(
        select(BranchSection)
        .where(BranchSection.program_id == program_id)
        .options(
            selectinload(BranchSection.branch),
            selectinload(BranchSection.class_),
            selectinload(BranchSection.section),
        )
    ).all()
    branches = list({bs.branch for bs in branch_sections})
    return {"program": program, "branches": branches, "branch_sections": branch_sections}


def get_branch_overview(db: Session, branch_id: int) -> dict:
    branch = db.get(Branch, branch_id)
    if not branch:
        raise ValueError("Branch not found")
    deans = [
        db.get(User, db_row.user_id)
        for db_row in db.scalars(select(DeanBranch).where(DeanBranch.branch_id == branch_id)).all()
    ]
    principals = [
        db.get(User, db_row.user_id)
        for db_row in db.scalars(select(PrincipalBranch).where(PrincipalBranch.branch_id == branch_id)).all()
    ]
    branch_sections = db.scalars(
        select(BranchSection)
        .where(BranchSection.branch_id == branch_id)
        .options(
            selectinload(BranchSection.program),
            selectinload(BranchSection.class_),
            selectinload(BranchSection.section),
        )
    ).all()
    programs = list({bs.program for bs in branch_sections})
    return {
        "branch": branch,
        "deans": deans,
        "principals": principals,
        "programs": programs,
        "sections": branch_sections,
    }
