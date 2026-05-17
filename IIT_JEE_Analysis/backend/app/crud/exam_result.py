"""CRUD for ExamResult — OMR data storage and retrieval."""
from typing import Optional, Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.exam import Exam
from app.models.exam_result import ExamResult
from app.models.student import Student
from app.models.student_section import StudentSection


def get_exam_results(db: Session, exam_id: int) -> Sequence[ExamResult]:
    """Get all results for an exam."""
    return db.scalars(
        select(ExamResult).where(ExamResult.exam_id == exam_id).order_by(ExamResult.student_id)
    ).all()


def get_exam_result(db: Session, exam_id: int, student_id: int) -> Optional[ExamResult]:
    """Get a specific student's result for an exam."""
    return db.scalar(
        select(ExamResult).where(
            ExamResult.exam_id == exam_id,
            ExamResult.student_id == student_id,
        )
    )


def upsert_exam_result(
    db: Session,
    exam_id: int,
    student_id: int,
    answers: str,
) -> ExamResult:
    """Create or update an exam result."""
    existing = get_exam_result(db, exam_id, student_id)
    if existing:
        existing.answers = answers
        db.commit()
        db.refresh(existing)
        return existing

    result = ExamResult(exam_id=exam_id, student_id=student_id, answers=answers)
    db.add(result)
    db.commit()
    db.refresh(result)
    return result


def delete_exam_results(db: Session, exam_id: int) -> int:
    """Delete all results for an exam. Returns count deleted."""
    count = db.query(ExamResult).where(ExamResult.exam_id == exam_id).delete()
    db.commit()
    return count


def get_enrolled_students_for_exam(
    db: Session,
    exam_id: int,
    branch_id: Optional[int] = None,
) -> Sequence[Student]:
    """Get students enrolled in the program/class/year of the exam.

    If branch_id is given, restrict to that branch only.
    """
    from app.models.mapping import BranchSection

    exam = db.get(Exam, exam_id)
    if not exam:
        return []

    stmt = (
        select(Student).join(
            StudentSection,
            Student.id == StudentSection.student_id,
        ).join(
            BranchSection,
            StudentSection.branch_section_id == BranchSection.id,
        ).where(
            StudentSection.academic_year_id == exam.academic_year_id,
            BranchSection.program_id == exam.program_id,
            BranchSection.class_id == exam.class_id,
        )
    )
    if branch_id is not None:
        stmt = stmt.where(BranchSection.branch_id == branch_id)

    return db.scalars(stmt).all()
