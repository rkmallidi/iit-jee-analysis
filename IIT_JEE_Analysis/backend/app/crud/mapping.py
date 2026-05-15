"""CRUD for all mapping tables."""
from typing import Optional, Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.academic_year import AcademicYear
from app.models.branch import Branch
from app.models.class_ import Class
from app.models.mapping import (
    BranchProgram,
    BranchSection,
    DeanBranch,
    FacultySection,
    FacultySubject,
    PrincipalBranch,
    VicePrincipalBranch,
    OperatorBranch,
    SubjectName,
)
from app.models.program import Program
from app.models.section import Section
from app.models.user import User, UserRole


# -------- Query helpers --------

def _dean_branch_query():
    return select(DeanBranch).options(
        selectinload(DeanBranch.dean).selectinload(User.user_roles).selectinload(UserRole.role),
        selectinload(DeanBranch.branch),
    )

def _principal_branch_query():
    return select(PrincipalBranch).options(
        selectinload(PrincipalBranch.principal).selectinload(User.user_roles).selectinload(UserRole.role),
        selectinload(PrincipalBranch.branch),
    )

def _vice_principal_branch_query():
    return select(VicePrincipalBranch).options(
        selectinload(VicePrincipalBranch.vice_principal).selectinload(User.user_roles).selectinload(UserRole.role),
        selectinload(VicePrincipalBranch.branch),
    )

def _operator_branch_query():
    return select(OperatorBranch).options(
        selectinload(OperatorBranch.operator).selectinload(User.user_roles).selectinload(UserRole.role),
        selectinload(OperatorBranch.branch),
    )

def _branch_section_query():
    return select(BranchSection).options(
        selectinload(BranchSection.academic_year),
        selectinload(BranchSection.branch),
        selectinload(BranchSection.program),
        selectinload(BranchSection.class_),
        selectinload(BranchSection.section),
    )

def _faculty_section_query():
    return select(FacultySection).options(
        selectinload(FacultySection.faculty).selectinload(User.user_roles).selectinload(UserRole.role),
        selectinload(FacultySection.branch),
        selectinload(FacultySection.class_),
        selectinload(FacultySection.section),
    )


# -------- FacultySubject --------

def get_faculty_subjects(db: Session, user_id: int) -> Sequence[FacultySubject]:
    return db.scalars(
        select(FacultySubject).where(FacultySubject.user_id == user_id)
    ).all()

def get_faculty_subject_by_id(db: Session, id: int) -> Optional[FacultySubject]:
    return db.get(FacultySubject, id)

def set_faculty_subject(db: Session, user_id: int, subject: SubjectName) -> FacultySubject:
    existing = db.scalar(
        select(FacultySubject).where(
            FacultySubject.user_id == user_id, FacultySubject.subject == subject
        )
    )
    if existing:
        return existing
    obj = FacultySubject(user_id=user_id, subject=subject)
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

def delete_faculty_subject(db: Session, fs: FacultySubject) -> None:
    db.delete(fs); db.commit()


# -------- DeanBranch --------

def get_dean_branches(db: Session) -> Sequence[DeanBranch]:
    return db.scalars(_dean_branch_query()).all()

def get_dean_branch(db: Session, id: int) -> Optional[DeanBranch]:
    return db.get(DeanBranch, id)

def assign_dean_branch(db: Session, user_id: int, branch_id: int) -> DeanBranch:
    existing = db.scalar(
        select(DeanBranch).where(DeanBranch.user_id == user_id, DeanBranch.branch_id == branch_id)
    )
    if existing:
        return db.scalar(_dean_branch_query().where(DeanBranch.id == existing.id))
    obj = DeanBranch(user_id=user_id, branch_id=branch_id)
    db.add(obj); db.commit()
    return db.scalar(_dean_branch_query().where(DeanBranch.id == obj.id))

def remove_dean_branch(db: Session, db_obj: DeanBranch) -> None:
    db.delete(db_obj); db.commit()


# -------- PrincipalBranch --------

def get_principal_branches(db: Session) -> Sequence[PrincipalBranch]:
    return db.scalars(_principal_branch_query()).all()

def get_principal_branch(db: Session, id: int) -> Optional[PrincipalBranch]:
    return db.get(PrincipalBranch, id)

def assign_principal_branch(db: Session, user_id: int, branch_id: int) -> PrincipalBranch:
    existing = db.scalar(
        select(PrincipalBranch).where(
            PrincipalBranch.user_id == user_id, PrincipalBranch.branch_id == branch_id
        )
    )
    if existing:
        return db.scalar(_principal_branch_query().where(PrincipalBranch.id == existing.id))
    obj = PrincipalBranch(user_id=user_id, branch_id=branch_id)
    db.add(obj); db.commit()
    return db.scalar(_principal_branch_query().where(PrincipalBranch.id == obj.id))

def remove_principal_branch(db: Session, db_obj: PrincipalBranch) -> None:
    db.delete(db_obj); db.commit()


# -------- VicePrincipalBranch --------

def get_vice_principal_branches(db: Session) -> Sequence[VicePrincipalBranch]:
    return db.scalars(_vice_principal_branch_query()).all()

def get_vice_principal_branch(db: Session, id: int) -> Optional[VicePrincipalBranch]:
    return db.get(VicePrincipalBranch, id)

def assign_vice_principal_branch(db: Session, user_id: int, branch_id: int) -> VicePrincipalBranch:
    existing = db.scalar(
        select(VicePrincipalBranch).where(
            VicePrincipalBranch.user_id == user_id, VicePrincipalBranch.branch_id == branch_id
        )
    )
    if existing:
        return db.scalar(_vice_principal_branch_query().where(VicePrincipalBranch.id == existing.id))
    obj = VicePrincipalBranch(user_id=user_id, branch_id=branch_id)
    db.add(obj); db.commit()
    return db.scalar(_vice_principal_branch_query().where(VicePrincipalBranch.id == obj.id))

def remove_vice_principal_branch(db: Session, db_obj: VicePrincipalBranch) -> None:
    db.delete(db_obj); db.commit()


# -------- OperatorBranch --------

def get_operator_branches(db: Session) -> Sequence[OperatorBranch]:
    return db.scalars(_operator_branch_query()).all()

def get_operator_branch(db: Session, id: int) -> Optional[OperatorBranch]:
    return db.get(OperatorBranch, id)

def assign_operator_branch(db: Session, user_id: int, branch_id: int) -> OperatorBranch:
    existing = db.scalar(
        select(OperatorBranch).where(
            OperatorBranch.user_id == user_id, OperatorBranch.branch_id == branch_id
        )
    )
    if existing:
        return db.scalar(_operator_branch_query().where(OperatorBranch.id == existing.id))
    obj = OperatorBranch(user_id=user_id, branch_id=branch_id)
    db.add(obj); db.commit()
    return db.scalar(_operator_branch_query().where(OperatorBranch.id == obj.id))

def remove_operator_branch(db: Session, db_obj: OperatorBranch) -> None:
    db.delete(db_obj); db.commit()


# -------- BranchProgram --------

def get_branch_programs(
    db: Session,
    academic_year_id: Optional[int] = None,
    branch_id: Optional[int] = None,
) -> Sequence[BranchProgram]:
    q = select(BranchProgram).options(
        selectinload(BranchProgram.academic_year),
        selectinload(BranchProgram.branch),
        selectinload(BranchProgram.program),
    )
    if academic_year_id:
        q = q.where(BranchProgram.academic_year_id == academic_year_id)
    if branch_id:
        q = q.where(BranchProgram.branch_id == branch_id)
    return db.scalars(q).all()

def get_branch_program(db: Session, id: int) -> Optional[BranchProgram]:
    return db.get(BranchProgram, id)

def assign_branch_program(db: Session, academic_year_id: int, branch_id: int, program_id: int) -> BranchProgram:
    existing = db.scalar(
        select(BranchProgram).where(
            BranchProgram.academic_year_id == academic_year_id,
            BranchProgram.branch_id == branch_id,
            BranchProgram.program_id == program_id,
        )
    )
    if existing:
        return existing
    obj = BranchProgram(academic_year_id=academic_year_id, branch_id=branch_id, program_id=program_id)
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

def remove_branch_program(db: Session, db_obj: BranchProgram) -> None:
    db.delete(db_obj); db.commit()


# -------- BranchSection --------

def get_branch_sections(
    db: Session,
    academic_year_id: Optional[int] = None,
    branch_id: Optional[int] = None,
    program_id: Optional[int] = None,
) -> Sequence[BranchSection]:
    q = _branch_section_query()
    if academic_year_id:
        q = q.where(BranchSection.academic_year_id == academic_year_id)
    if branch_id:
        q = q.where(BranchSection.branch_id == branch_id)
    if program_id:
        q = q.where(BranchSection.program_id == program_id)
    return db.scalars(q).all()

def get_branch_section(db: Session, id: int) -> Optional[BranchSection]:
    return db.scalar(_branch_section_query().where(BranchSection.id == id))

def create_branch_section(
    db: Session, academic_year_id: int, branch_id: int, program_id: int, class_id: int, section_id: int
) -> BranchSection:
    existing = db.scalar(
        select(BranchSection).where(
            BranchSection.academic_year_id == academic_year_id,
            BranchSection.branch_id == branch_id,
            BranchSection.program_id == program_id,
            BranchSection.class_id == class_id,
            BranchSection.section_id == section_id,
        )
    )
    if existing:
        return db.scalar(_branch_section_query().where(BranchSection.id == existing.id))
    obj = BranchSection(
        academic_year_id=academic_year_id,
        branch_id=branch_id, program_id=program_id, class_id=class_id, section_id=section_id
    )
    db.add(obj); db.commit()
    return db.scalar(_branch_section_query().where(BranchSection.id == obj.id))

def delete_branch_section(db: Session, db_obj: BranchSection) -> None:
    db.delete(db_obj); db.commit()


# -------- FacultySection --------

def get_faculty_sections(
    db: Session, user_id: Optional[int] = None
) -> Sequence[FacultySection]:
    q = _faculty_section_query()
    if user_id:
        q = q.where(FacultySection.user_id == user_id)
    return db.scalars(q).all()

def get_faculty_section(db: Session, id: int) -> Optional[FacultySection]:
    return db.get(FacultySection, id)

def assign_faculty_section(
    db: Session, user_id: int, branch_section_id: int, subject: SubjectName
) -> FacultySection:
    bs = db.get(BranchSection, branch_section_id)
    if not bs:
        raise ValueError(f"BranchSection {branch_section_id} not found")
    existing = db.scalar(
        select(FacultySection).where(
            FacultySection.branch_section_id == branch_section_id,
            FacultySection.subject == subject,
        )
    )
    if existing:
        existing.user_id = user_id
        db.commit()
        return db.scalar(_faculty_section_query().where(FacultySection.id == existing.id))
    obj = FacultySection(
        user_id=user_id,
        branch_section_id=branch_section_id,
        branch_id=bs.branch_id,
        class_id=bs.class_id,
        section_id=bs.section_id,
        subject=subject,
    )
    db.add(obj); db.commit()
    return db.scalar(_faculty_section_query().where(FacultySection.id == obj.id))

def remove_faculty_section(db: Session, db_obj: FacultySection) -> None:
    db.delete(db_obj); db.commit()


# -------- Overview helpers --------

def get_faculty_overview(db: Session, user_id: int, academic_year_id: Optional[int] = None) -> dict:
    user = db.scalar(
        select(User).where(User.id == user_id)
        .options(selectinload(User.user_roles).selectinload(UserRole.role))
    )
    if not user:
        raise ValueError("User not found")
    subject_rows = get_faculty_subjects(db, user_id)
    q = (
        select(FacultySection)
        .where(FacultySection.user_id == user_id)
        .options(
            selectinload(FacultySection.branch_section).options(
                selectinload(BranchSection.academic_year),
                selectinload(BranchSection.program),
                selectinload(BranchSection.branch),
                selectinload(BranchSection.class_),
                selectinload(BranchSection.section),
            ),
        )
    )
    if academic_year_id:
        q = q.join(BranchSection, FacultySection.branch_section_id == BranchSection.id).where(
            BranchSection.academic_year_id == academic_year_id
        )
    sections = db.scalars(q).all()
    return {
        "faculty": user,
        "subjects": list(subject_rows),
        "sections": [fs.branch_section for fs in sections],
    }


def get_program_overview(db: Session, program_id: int, academic_year_id: Optional[int] = None) -> dict:
    program = db.get(Program, program_id)
    if not program:
        raise ValueError("Program not found")
    q = (
        select(BranchSection)
        .where(BranchSection.program_id == program_id)
        .options(
            selectinload(BranchSection.academic_year),
            selectinload(BranchSection.branch),
            selectinload(BranchSection.class_),
            selectinload(BranchSection.section),
        )
    )
    if academic_year_id:
        q = q.where(BranchSection.academic_year_id == academic_year_id)
    branch_sections = db.scalars(q).all()
    branches = list({bs.branch for bs in branch_sections})
    return {"program": program, "branches": branches, "branch_sections": branch_sections}


def get_branch_overview(db: Session, branch_id: int, academic_year_id: Optional[int] = None) -> dict:
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
    bs_q = (
        select(BranchSection)
        .where(BranchSection.branch_id == branch_id)
        .options(
            selectinload(BranchSection.academic_year),
            selectinload(BranchSection.program),
            selectinload(BranchSection.class_),
            selectinload(BranchSection.section),
        )
    )
    if academic_year_id:
        bs_q = bs_q.where(BranchSection.academic_year_id == academic_year_id)
    branch_sections = db.scalars(bs_q).all()

    fs_q = (
        select(FacultySection)
        .where(FacultySection.branch_id == branch_id)
        .options(
            selectinload(FacultySection.faculty),
            selectinload(FacultySection.class_),
            selectinload(FacultySection.section),
        )
    )
    if academic_year_id:
        fs_q = fs_q.join(BranchSection, FacultySection.branch_section_id == BranchSection.id).where(
            BranchSection.academic_year_id == academic_year_id
        )
    faculty_sections = db.scalars(fs_q).all()
    programs = list({bs.program for bs in branch_sections})
    return {
        "branch": branch,
        "deans": deans,
        "principals": principals,
        "programs": programs,
        "sections": branch_sections,
        "faculty_sections": faculty_sections,
    }
