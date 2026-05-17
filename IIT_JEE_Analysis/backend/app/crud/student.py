"""CRUD for Student and StudentSection — all section operations are year-scoped."""
from typing import Optional, Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.mapping import BranchSection
from app.models.student import Student
from app.models.student_section import StudentSection
from app.schemas.student import StudentCreate, StudentUpdate


# ── Eager-load helpers ────────────────────────────────────────────────────────

def _bs_options():
    """Options to fully load a BranchSection with all nested lookups."""
    return [
        selectinload(BranchSection.branch),
        selectinload(BranchSection.program),
        selectinload(BranchSection.class_),
        selectinload(BranchSection.section),
        selectinload(BranchSection.academic_year),
    ]


def _attach_section_mapping(
    db: Session,
    students: Sequence[Student],
    academic_year_id: Optional[int],
) -> None:
    """Batch-fetch the year-specific StudentSection for each student and
    attach it as `student.section_mapping` (monkeypatched onto the ORM object
    so Pydantic `from_attributes` can read it).
    """
    if not students:
        return

    if academic_year_id is None:
        for s in students:
            s.section_mapping = None  # type: ignore[attr-defined]
        return

    ids = [s.id for s in students]
    sms = db.scalars(
        select(StudentSection)
        .where(
            StudentSection.student_id.in_(ids),
            StudentSection.academic_year_id == academic_year_id,
        )
        .options(
            selectinload(StudentSection.branch_section).options(*_bs_options())
        )
    ).all()

    sm_map = {sm.student_id: sm for sm in sms}
    for s in students:
        s.section_mapping = sm_map.get(s.id)  # type: ignore[attr-defined]


# ── Student CRUD ──────────────────────────────────────────────────────────────

def get_students(
    db: Session,
    academic_year_id: Optional[int] = None,
    branch_section_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 1000,
) -> Sequence[Student]:
    q = select(Student)
    if branch_section_id and academic_year_id:
        q = q.join(
            StudentSection,
            (StudentSection.student_id == Student.id) &
            (StudentSection.branch_section_id == branch_section_id) &
            (StudentSection.academic_year_id == academic_year_id),
        )
    if search:
        pattern = f"%{search}%"
        q = q.where(Student.name.ilike(pattern) | Student.admission_no.ilike(pattern))
    students = db.scalars(q.order_by(Student.admission_no).offset(skip).limit(limit)).all()
    _attach_section_mapping(db, students, academic_year_id)
    return students


def get_student(
    db: Session, student_id: int, academic_year_id: Optional[int] = None
) -> Optional[Student]:
    student = db.get(Student, student_id)
    if student:
        _attach_section_mapping(db, [student], academic_year_id)
    return student


def get_student_by_admission_no(db: Session, admission_no: str) -> Optional[Student]:
    return db.scalar(select(Student).where(Student.admission_no == admission_no))


def create_student(db: Session, data: StudentCreate) -> Student:
    obj = Student(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    obj.section_mapping = None  # type: ignore[attr-defined]
    return obj


def update_student(db: Session, student: Student, data: StudentUpdate) -> Student:
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(student, k, v)
    db.commit()
    db.refresh(student)
    return student


def has_history(db: Session, student: Student) -> bool:
    """Returns True if the student has any exam results or evaluations."""
    from sqlalchemy import select
    from app.models.exam_result import ExamResult
    has_results = db.scalar(
        select(ExamResult.id).where(ExamResult.student_id == student.id).limit(1)
    )
    return has_results is not None


def reactivate_student(db: Session, student: Student) -> Student:
    student.is_active = True
    db.commit()
    db.refresh(student)
    student.section_mapping = None  # type: ignore[attr-defined]
    return student


def delete_student(db: Session, student: Student) -> dict:
    """Soft-deletes if history exists, hard-deletes otherwise.
    Returns {"action": "deactivated"} or {"action": "deleted"}."""
    if has_history(db, student):
        student.is_active = False
        db.commit()
        return {"action": "deactivated"}
    db.delete(student)
    db.commit()
    return {"action": "deleted"}


# ── Section mapping (year-scoped) ─────────────────────────────────────────────

def assign_section(
    db: Session, student: Student, branch_section_id: int, academic_year_id: int
) -> Student:
    existing = db.scalar(
        select(StudentSection).where(
            StudentSection.student_id == student.id,
            StudentSection.academic_year_id == academic_year_id,
        )
    )
    if existing:
        existing.branch_section_id = branch_section_id
    else:
        db.add(StudentSection(
            student_id=student.id,
            branch_section_id=branch_section_id,
            academic_year_id=academic_year_id,
        ))
    db.commit()
    _attach_section_mapping(db, [student], academic_year_id)
    return student


def remove_section(
    db: Session, student: Student, academic_year_id: int
) -> Student:
    existing = db.scalar(
        select(StudentSection).where(
            StudentSection.student_id == student.id,
            StudentSection.academic_year_id == academic_year_id,
        )
    )
    if existing:
        db.delete(existing)
        db.commit()
    student.section_mapping = None  # type: ignore[attr-defined]
    return student
