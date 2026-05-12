"""Exam endpoints — CRUD + per-paper question configuration + OMR results upload."""
import io
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.api.deps import DbSession, require_roles
from app.crud.exam_result import get_enrolled_students_for_exam, upsert_exam_result
from app.models.exam import Exam
from app.models.exam_question import ExamQuestion
from app.models.mapping import BranchSection
from app.models.student import Student
from app.models.student_section import StudentSection
from app.models.user import RoleName
from app.schemas.exam import ExamCreate, ExamOut, ExamUpdate, ExamQuestionOut, ExamQuestionUpdate, ExamQuestionUploadResult, ExamDetailOut
from app.schemas.exam_result import OMRValidationRecord, OMRValidationSummary, OMRUploadConfirm

router = APIRouter(prefix="/exams", tags=["exams"])
admin_only = Depends(require_roles(RoleName.ADMIN))

_QUESTION_COLS = [
    "qno", "subject", "topic", "sub_topic", "difficulty",
    "question_type", "marks", "negative_marks", "bkc",
    "partial_marks", "is_deleted", "is_bonus", "akc",
]

_COL_ALIASES: dict[str, str] = {
    "qno": "qno", "q_no": "qno", "question_no": "qno", "question_number": "qno",
    "subject": "subject",
    "topic": "topic",
    "sub_topic": "sub_topic", "subtopic": "sub_topic",
    "difficulty": "difficulty",
    "question_type": "question_type", "type": "question_type", "qtype": "question_type",
    "marks": "marks",
    "negative_marks": "negative_marks", "neg_marks": "negative_marks",
    "bkc": "bkc", "correct_answer": "bkc", "answer": "bkc",
    "partial_marks": "partial_marks",
    "is_deleted": "is_deleted", "deleted": "is_deleted",
    "is_bonus": "is_bonus", "bonus": "is_bonus",
    "akc": "akc", "after_key_change": "akc",
}


def _siblings(db, exam: Exam) -> list[Exam]:
    """All paper records for the same logical exam (same year + code + program + class)."""
    return list(db.scalars(
        select(Exam).where(
            Exam.academic_year_id == exam.academic_year_id,
            Exam.exam_code == exam.exam_code,
            Exam.program_id == exam.program_id,
            Exam.class_id == exam.class_id,
        ).order_by(Exam.paper)
    ).all())


# ── Exam CRUD ─────────────────────────────────────────────────────────────────

@router.get("", response_model=list[ExamOut])
def list_exams(
    db: DbSession,
    academic_year_id: Optional[int] = Query(None),
    program_id: Optional[int] = Query(None),
    class_id: Optional[int] = Query(None),
):
    stmt = select(Exam)
    if academic_year_id:
        stmt = stmt.where(Exam.academic_year_id == academic_year_id)
    if program_id:
        stmt = stmt.where(Exam.program_id == program_id)
    if class_id:
        stmt = stmt.where(Exam.class_id == class_id)
    stmt = stmt.order_by(Exam.exam_date, Exam.exam_code, Exam.paper)
    exams = db.scalars(stmt).all()

    counts: dict[int, int] = {}
    if exams:
        count_rows = db.execute(
            select(ExamQuestion.exam_id, func.count(ExamQuestion.id).label("cnt"))
            .where(
                ExamQuestion.exam_id.in_([e.id for e in exams]),
                ExamQuestion.is_deleted == False,  # noqa: E712
            )
            .group_by(ExamQuestion.exam_id)
        ).all()
        counts = {r.exam_id: r.cnt for r in count_rows}

    return [
        ExamOut.model_validate(e).model_copy(update={"question_count": counts.get(e.id, 0)})
        for e in exams
    ]


@router.get("/{exam_id}/detail", response_model=ExamDetailOut)
def get_exam_detail(exam_id: int, db: DbSession):
    """Get detailed exam view with ALL branches; sections/students shown where configured."""
    exam = db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(404, "Exam not found")

    from sqlalchemy.orm import selectinload
    from app.models.branch import Branch
    from app.models.mapping import DeanBranch, PrincipalBranch
    from app.models.user import User

    # All active branches
    all_branches = db.scalars(
        select(Branch).where(Branch.is_active == True).order_by(Branch.name)  # noqa: E712
    ).all()

    # Branch sections configured for this exam's program/class/year
    branch_sections = db.scalars(
        select(BranchSection).where(
            BranchSection.academic_year_id == exam.academic_year_id,
            BranchSection.program_id == exam.program_id,
            BranchSection.class_id == exam.class_id,
        ).options(
            selectinload(BranchSection.section),
        )
    ).all()

    # Group branch sections by branch_id
    bs_by_branch: dict[int, list] = {}
    for bs in branch_sections:
        bs_by_branch.setdefault(bs.branch_id, []).append(bs)

    # Students for all branch sections
    students_by_bs: dict[int, list] = {}
    if branch_sections:
        student_sections = db.scalars(
            select(StudentSection).where(
                StudentSection.academic_year_id == exam.academic_year_id,
                StudentSection.branch_section_id.in_([bs.id for bs in branch_sections]),
            ).options(
                selectinload(StudentSection.student),
            )
        ).all()
        for ss in student_sections:
            students_by_bs.setdefault(ss.branch_section_id, []).append(ss.student)

    # Leadership per branch (batch fetch)
    dean_rows = db.execute(
        select(DeanBranch.branch_id, User.id, User.full_name, User.username)
        .join(User, DeanBranch.user_id == User.id)
    ).all()
    dean_by_branch = {
        r.branch_id: {"id": r.id, "full_name": r.full_name, "username": r.username}
        for r in dean_rows
    }

    principal_rows = db.execute(
        select(PrincipalBranch.branch_id, User.id, User.full_name, User.username)
        .join(User, PrincipalBranch.user_id == User.id)
    ).all()
    principal_by_branch = {
        r.branch_id: {"id": r.id, "full_name": r.full_name, "username": r.username}
        for r in principal_rows
    }

    branches_detail = []
    for branch in all_branches:
        sections = []
        for bs in bs_by_branch.get(branch.id, []):
            students = students_by_bs.get(bs.id, [])
            sections.append({
                "section_name": bs.section.name,
                "student_count": len(students),
                "students": [
                    {"id": s.id, "admission_no": s.admission_no, "name": s.name}
                    for s in students
                ],
            })
        sections.sort(key=lambda s: s["section_name"])

        branches_detail.append({
            "id": branch.id,
            "name": branch.name,
            "code": branch.code,
            "address": branch.address,
            "principal": principal_by_branch.get(branch.id),
            "dean": dean_by_branch.get(branch.id),
            "operator": None,
            "sections": sections,
        })

    return {
        "id": exam.id,
        "exam_code": exam.exam_code,
        "exam_type": exam.exam_type,
        "exam_date": exam.exam_date,
        "program_name": exam.program.name,
        "class_name": exam.class_.name,
        "branches": branches_detail,
    }


@router.post("", response_model=list[ExamOut], dependencies=[admin_only])
def create_exam(data: ExamCreate, db: DbSession):
    papers = ["P1"] if data.exam_type == "Mains" else ["P1", "P2"]
    records = [
        Exam(
            academic_year_id=data.academic_year_id,
            program_id=data.program_id,
            class_id=data.class_id,
            exam_code=data.exam_code,
            exam_type=data.exam_type,
            paper=p,
            exam_date=data.exam_date,
        )
        for p in papers
    ]
    for r in records:
        db.add(r)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, f"Exam '{data.exam_code}' already exists for this program/class/year")
    for r in records:
        db.refresh(r)
    return records


@router.patch("/{exam_id}", response_model=list[ExamOut], dependencies=[admin_only])
def update_exam(exam_id: int, data: ExamUpdate, db: DbSession):
    exam = db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(404, "Exam not found")
    updates = data.model_dump(exclude_none=True)
    for sib in _siblings(db, exam):
        for k, v in updates.items():
            setattr(sib, k, v)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Exam already exists for this program/class/year")
    return _siblings(db, exam)


@router.delete("/{exam_id}", dependencies=[admin_only])
def delete_exam(exam_id: int, db: DbSession):
    exam = db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(404, "Exam not found")
    for sib in _siblings(db, exam):
        db.delete(sib)
    db.commit()
    return {"ok": True}


# ── Per-paper question endpoints ──────────────────────────────────────────────

@router.get("/{exam_id}/questions", response_model=list[ExamQuestionOut])
def list_exam_questions(exam_id: int, db: DbSession, include_deleted: bool = Query(False)):
    if not db.get(Exam, exam_id):
        raise HTTPException(404, "Exam not found")
    stmt = select(ExamQuestion).where(ExamQuestion.exam_id == exam_id)
    if not include_deleted:
        stmt = stmt.where(ExamQuestion.is_deleted == False)  # noqa: E712
    stmt = stmt.order_by(ExamQuestion.qno)
    return db.scalars(stmt).all()


@router.patch("/{exam_id}/questions/{question_id}", response_model=ExamQuestionOut, dependencies=[admin_only])
def update_exam_question(exam_id: int, question_id: int, data: ExamQuestionUpdate, db: DbSession):
    q = db.get(ExamQuestion, question_id)
    if not q or q.exam_id != exam_id:
        raise HTTPException(404, "Question not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(q, k, v)
    db.commit()
    db.refresh(q)
    return q


@router.get("/{exam_id}/questions/upload/template")
def download_exam_question_template(exam_id: int, db: DbSession):
    if not db.get(Exam, exam_id):
        raise HTTPException(404, "Exam not found")
    import openpyxl
    from openpyxl.styles import Alignment, Font, PatternFill

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Questions"
    ws.append(_QUESTION_COLS)
    for cell in ws[1]:
        cell.font = Font(bold=True)
        cell.fill = PatternFill("solid", fgColor="DCE6F1")
        cell.alignment = Alignment(horizontal="center")
    ws.append([1, "Mathematics", "Algebra", "Quadratic Equations", "Medium", "SCQ", 4, 1, "A", 0, False, False, "B"])
    ws.append([2, "Physics", "Mechanics", "Newton's Laws", "Hard", "INT", 4, 0, "12", 0, False, False, "15"])
    ws.append([3, "Chemistry", "Organic", "Hydrocarbons", "Easy", "SCQ", 4, 1, "C", 0, False, True, "D"])
    ws.append([4, "Mathematics", "Calculus", "Integration", "Very Hard", "MCQ", 4, 2, "ABD", 1, False, False, "ACD"])
    ws.append([5, "Physics", "Optics", "Refraction", "None", "NUM", 4, 0, "1.5", 0, False, False, ""])

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=exam_questions_template.xlsx"},
    )


@router.post("/{exam_id}/questions/upload/excel", response_model=ExamQuestionUploadResult, dependencies=[admin_only])
def upload_exam_questions(exam_id: int, db: DbSession, file: UploadFile = File(...)):
    exam = db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(404, "Exam not found")

    import openpyxl

    created = updated = skipped = 0
    errors: list[str] = []

    try:
        wb = openpyxl.load_workbook(file.file, data_only=True)
    except Exception:
        raise HTTPException(400, "Invalid Excel file")

    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        raise HTTPException(400, "Empty file")

    raw_headers = [str(h).strip().lower().replace(" ", "_") if h else "" for h in rows[0]]
    col_map: dict[str, int] = {}
    for i, h in enumerate(raw_headers):
        canon = _COL_ALIASES.get(h)
        if canon and canon not in col_map:
            col_map[canon] = i

    if "qno" not in col_map or "subject" not in col_map:
        raise HTTPException(400, "Missing required columns: qno, subject")

    existing = {
        q.qno: q
        for q in db.scalars(select(ExamQuestion).where(ExamQuestion.exam_id == exam_id)).all()
    }

    def _str(val) -> Optional[str]:
        return str(val).strip() if val is not None and str(val).strip() else None

    def _float(val) -> Optional[float]:
        if val is None or str(val).strip() == "":
            return None
        try:
            return float(val)
        except (ValueError, TypeError):
            return None

    def _bool(val) -> bool:
        if isinstance(val, bool):
            return val
        return str(val).strip().lower() in ("true", "1", "yes", "deleted")

    # Track qno values in this upload to catch duplicates within the file
    seen_qnos: set[int] = set()

    for row_idx, row in enumerate(rows[1:], start=2):
        try:
            qno_raw = row[col_map["qno"]] if "qno" in col_map else None
            if qno_raw is None or str(qno_raw).strip() == "":
                skipped += 1
                continue
            try:
                qno = int(float(qno_raw))
            except (ValueError, TypeError):
                errors.append(f"Row {row_idx}: qno '{qno_raw}' is not a valid integer")
                skipped += 1
                continue

            # Check for duplicate qno within this upload
            if qno in seen_qnos:
                errors.append(f"Row {row_idx}: qno {qno} is duplicated in this file")
                skipped += 1
                continue
            seen_qnos.add(qno)

            subject = _str(row[col_map["subject"]]) if "subject" in col_map else None
            if not subject:
                errors.append(f"Row {row_idx}: subject is required")
                skipped += 1
                continue

            data = {
                "qno": qno,
                "subject": subject,
                "topic": _str(row[col_map["topic"]]) if "topic" in col_map else None,
                "sub_topic": _str(row[col_map["sub_topic"]]) if "sub_topic" in col_map else None,
                "difficulty": _str(row[col_map["difficulty"]]) if "difficulty" in col_map else None,
                "question_type": _str(row[col_map["question_type"]]) if "question_type" in col_map else None,
                "marks": _float(row[col_map["marks"]]) if "marks" in col_map else None,
                "negative_marks": _float(row[col_map["negative_marks"]]) if "negative_marks" in col_map else None,
                "bkc": _str(row[col_map["bkc"]]) if "bkc" in col_map else None,
                "partial_marks": _float(row[col_map["partial_marks"]]) if "partial_marks" in col_map else None,
                "is_deleted": _bool(row[col_map["is_deleted"]]) if "is_deleted" in col_map and row[col_map["is_deleted"]] is not None else False,
                "is_bonus": _bool(row[col_map["is_bonus"]]) if "is_bonus" in col_map and row[col_map["is_bonus"]] is not None else False,
                "akc": _str(row[col_map["akc"]]) if "akc" in col_map else None,
            }

            if qno in existing:
                q = existing[qno]
                for k, v in data.items():
                    setattr(q, k, v)
                updated += 1
            else:
                q = ExamQuestion(exam_id=exam_id, **data)
                db.add(q)
                existing[qno] = q
                created += 1

        except Exception as exc:
            errors.append(f"Row {row_idx}: {exc}")
            skipped += 1

    db.commit()
    return ExamQuestionUploadResult(created=created, updated=updated, skipped=skipped, errors=errors)


# ── OMR results upload ────────────────────────────────────────────────────────

@router.post("/{exam_id}/results/validate", response_model=OMRValidationSummary, dependencies=[admin_only])
def validate_omr_file(exam_id: int, db: DbSession, file: UploadFile = File(...)):
    """Validate OMR file and return validation summary without saving."""
    exam = db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(404, "Exam not found")

    # Read file
    try:
        content = file.file.read().decode("utf-8")
    except Exception:
        raise HTTPException(400, "Cannot read file — ensure it's plain text CSV")

    lines = [line.strip() for line in content.split("\n") if line.strip()]
    if not lines:
        raise HTTPException(400, "File is empty")

    # Parse records
    records: list[OMRValidationRecord] = []
    duplicate_ids: set[str] = set()
    seen_ids: set[str] = set()
    errors: list[str] = []
    invalid_student_ids: list[str] = []

    for line_num, line in enumerate(lines, 1):
        parts = [p.strip() for p in line.split(",")]
        if len(parts) < 2:
            errors.append(f"Row {line_num}: insufficient columns (expected at least 2)")
            continue

        marker = parts[0]
        admission_no = parts[1]

        if marker != "x":
            errors.append(f"Row {line_num}: invalid marker '{marker}' (expected 'x')")
            continue

        if not admission_no:
            errors.append(f"Row {line_num}: empty admission number")
            continue

        # Check for duplicates
        if admission_no in seen_ids:
            duplicate_ids.add(admission_no)
            errors.append(f"Row {line_num}: duplicate student ID '{admission_no}'")
            continue

        seen_ids.add(admission_no)

        # Parse answers
        answers_raw = parts[2:]
        try:
            answers = []
            for ans in answers_raw:
                if ans == "-1000000":
                    answers.append(-1000000)
                else:
                    answers.append(int(ans))
        except ValueError:
            errors.append(f"Row {line_num} ({admission_no}): invalid answer value")
            invalid_student_ids.append(admission_no)
            continue

        records.append(OMRValidationRecord(admission_no=admission_no, answers=answers))

    # Validate students exist and are enrolled
    if records:
        admitted_nos = {r.admission_no for r in records}
        enrolled_students = get_enrolled_students_for_exam(db, exam_id)
        enrolled_map = {s.admission_no: s for s in enrolled_students}

        for record in records:
            if record.admission_no not in enrolled_map:
                invalid_student_ids.append(record.admission_no)
                errors.append(f"Student '{record.admission_no}' not enrolled in {exam.program.name} / {exam.class_.name}")

        # Find missing students
        missing = set(enrolled_map.keys()) - admitted_nos
        missing_list = sorted(list(missing))
    else:
        missing_list = []

    return OMRValidationSummary(
        valid_count=len(records) - len(invalid_student_ids),
        duplicate_ids=sorted(list(duplicate_ids)),
        invalid_student_ids=sorted(list(set(invalid_student_ids))),
        missing_students=missing_list,
        errors=errors,
        file_records=records,
        program_id=exam.program_id,
        class_id=exam.class_id,
    )


@router.post("/{exam_id}/results/save", dependencies=[admin_only])
def save_omr_results(exam_id: int, data: OMRUploadConfirm, db: DbSession):
    """Save validated OMR results to database."""
    exam = db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(404, "Exam not found")

    if exam_id != data.exam_id:
        raise HTTPException(400, "Exam ID mismatch")

    enrolled_students = get_enrolled_students_for_exam(db, exam_id)
    enrolled_map = {s.admission_no: s for s in enrolled_students}

    saved = 0
    errors: list[str] = []

    for record in data.records:
        if record.admission_no not in enrolled_map:
            errors.append(f"Student '{record.admission_no}' not found")
            continue

        student = enrolled_map[record.admission_no]
        answers_str = ",".join(str(a) for a in record.answers)

        try:
            upsert_exam_result(db, exam_id, student.id, answers_str)
            saved += 1
        except Exception as exc:
            errors.append(f"Failed to save {record.admission_no}: {exc}")

    return {
        "saved": saved,
        "errors": errors,
    }
