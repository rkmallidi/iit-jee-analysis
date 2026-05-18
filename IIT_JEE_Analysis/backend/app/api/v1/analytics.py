"""Analytics endpoints — powers all three dashboards."""
from typing import Optional
from fastapi import APIRouter, Query
from sqlalchemy import func, select, distinct, case
from sqlalchemy.orm import aliased

from app.api.deps import DbSession
from app.models.exam import Exam, EXAM_STATUS_DRAFT, EXAM_STATUS_PUBLISHED, EXAM_STATUS_COMPLETED
from app.models.exam_result import ExamResult
from app.models.student_evaluation import StudentEvaluation, StudentCumulativeEvaluation
from app.models.student import Student
from app.models.student_section import StudentSection
from app.models.mapping import BranchSection, FacultySection
from app.models.branch import Branch
from app.models.section import Section
from app.models.user import User

router = APIRouter(prefix="/analytics", tags=["analytics"])


# ── Dashboard 1: Command Center ───────────────────────────────────────────────

@router.get("/command-center")
def command_center(db: DbSession, academic_year_id: Optional[int] = Query(None)):
    """Year-wide health metrics for the command center dashboard."""

    # Exam pipeline counts
    stmt = select(Exam)
    if academic_year_id:
        stmt = stmt.where(Exam.academic_year_id == academic_year_id)

    all_exams = db.scalars(stmt).all()

    draft_count     = sum(1 for e in all_exams if e.status == EXAM_STATUS_DRAFT)
    published_count = sum(1 for e in all_exams if e.status == EXAM_STATUS_PUBLISHED)
    completed_count = sum(1 for e in all_exams if e.status == EXAM_STATUS_COMPLETED)

    # Unique logical exams (deduplicated by code+program+class)
    logical_keys = {(e.exam_code, e.program_id, e.class_id) for e in all_exams}
    total_logical = len(logical_keys)

    # Evaluated exams
    eval_stmt = select(distinct(StudentEvaluation.exam_id))
    if academic_year_id:
        eval_stmt = eval_stmt.where(StudentEvaluation.academic_year_id == academic_year_id)
    evaluated_exam_ids = set(db.scalars(eval_stmt).all())
    evaluated_count = len({e.id for e in all_exams if e.id in evaluated_exam_ids})

    # Total students evaluated
    students_eval_stmt = select(func.count(distinct(StudentEvaluation.student_id)))
    if academic_year_id:
        students_eval_stmt = students_eval_stmt.where(StudentEvaluation.academic_year_id == academic_year_id)
    total_students_evaluated = db.scalar(students_eval_stmt) or 0

    # Total OMR results uploaded
    result_stmt = select(func.count(ExamResult.id))
    if all_exams:
        result_stmt = result_stmt.where(ExamResult.exam_id.in_([e.id for e in all_exams]))
    total_results = db.scalar(result_stmt) or 0

    # Recent exams (last 8, with result + eval info)
    recent_exams = sorted(all_exams, key=lambda e: e.exam_date, reverse=True)[:12]
    recent_exam_ids = [e.id for e in recent_exams]

    result_counts: dict[int, int] = {}
    if recent_exam_ids:
        rows = db.execute(
            select(ExamResult.exam_id, func.count(ExamResult.id).label("cnt"))
            .where(ExamResult.exam_id.in_(recent_exam_ids))
            .group_by(ExamResult.exam_id)
        ).all()
        result_counts = {r.exam_id: r.cnt for r in rows}

    recent = []
    for e in recent_exams:
        recent.append({
            "id":           e.id,
            "exam_code":    e.exam_code,
            "paper":        e.paper,
            "exam_type":    e.exam_type,
            "exam_date":    str(e.exam_date),
            "status":       e.status,
            "result_count": result_counts.get(e.id, 0),
            "evaluated":    e.id in evaluated_exam_ids,
        })

    # Branch upload readiness (published exams)
    published_exams = [e for e in all_exams if e.status == EXAM_STATUS_PUBLISHED]
    pub_exam_ids = [e.id for e in published_exams]

    branch_upload_rows = []
    if pub_exam_ids and academic_year_id:
        from app.models.exam_upload_log import ExamUploadLog
        upload_logs = db.scalars(
            select(ExamUploadLog).where(ExamUploadLog.exam_id.in_(pub_exam_ids))
        ).all()
        uploaded_branch_ids = {log.branch_id for log in upload_logs}

        branches = db.scalars(
            select(Branch).where(Branch.is_active == True)  # noqa: E712
        ).all()
        for b in branches:
            uploaded = b.id in uploaded_branch_ids
            branch_upload_rows.append({
                "branch_id":   b.id,
                "branch_name": b.name,
                "uploaded":    uploaded,
            })

    return {
        "pipeline": {
            "total_logical":  total_logical,
            "draft":          draft_count,
            "published":      published_count,
            "completed":      completed_count,
            "evaluated":      evaluated_count,
        },
        "totals": {
            "results_uploaded":      total_results,
            "students_evaluated":    total_students_evaluated,
        },
        "recent_exams":   recent,
        "branch_uploads": branch_upload_rows,
    }


# ── Dashboard 2: Performance Analytics ───────────────────────────────────────

@router.get("/evaluated-exams")
def list_evaluated_exams(db: DbSession, academic_year_id: Optional[int] = Query(None)):
    """List all exams that have evaluation data, for the exam selector."""
    stmt = select(
        StudentEvaluation.exam_id,
        StudentEvaluation.exam_code,
        StudentEvaluation.exam_type,
        StudentEvaluation.paper,
        StudentEvaluation.exam_date,
        StudentEvaluation.academic_year_id,
        func.count(StudentEvaluation.id).label("student_count"),
    ).group_by(
        StudentEvaluation.exam_id,
        StudentEvaluation.exam_code,
        StudentEvaluation.exam_type,
        StudentEvaluation.paper,
        StudentEvaluation.exam_date,
        StudentEvaluation.academic_year_id,
    ).order_by(StudentEvaluation.exam_date.desc())

    if academic_year_id:
        stmt = stmt.where(StudentEvaluation.academic_year_id == academic_year_id)

    rows = db.execute(stmt).all()
    return [
        {
            "exam_id":        r.exam_id,
            "exam_code":      r.exam_code,
            "exam_type":      r.exam_type,
            "paper":          r.paper,
            "exam_date":      r.exam_date,
            "academic_year_id": r.academic_year_id,
            "student_count":  r.student_count,
        }
        for r in rows
    ]


@router.get("/performance/{exam_id}")
def exam_performance(db: DbSession, exam_id: int):
    """Full performance analytics for one evaluated exam paper."""

    rows = db.scalars(
        select(StudentEvaluation).where(StudentEvaluation.exam_id == exam_id)
    ).all()

    if not rows:
        return {"error": "No evaluation data for this exam"}

    scores       = [r.total_score     for r in rows]
    math_scores  = [r.math_score      for r in rows]
    phys_scores  = [r.physics_score   for r in rows]
    chem_scores  = [r.chemistry_score for r in rows]
    n            = len(rows)

    def safe_avg(lst): return round(sum(lst) / len(lst), 2) if lst else 0
    def safe_max(lst): return max(lst) if lst else 0

    # MI values (same for all rows in this exam)
    mi_total = rows[0].mi_total
    mi_math  = rows[0].mi_math
    mi_phys  = rows[0].mi_physics
    mi_chem  = rows[0].mi_chemistry

    above_mi_total = sum(1 for r in rows if r.above_mi_total) if mi_total else None
    above_mi_math  = sum(1 for r in rows if r.above_mi_math)  if mi_math  else None
    above_mi_phys  = sum(1 for r in rows if r.above_mi_physics) if mi_phys else None
    above_mi_chem  = sum(1 for r in rows if r.above_mi_chemistry) if mi_chem else None

    # Score distribution buckets (0-10%, 10-20%, ... 90-100%)
    max_score = rows[0].max_score or 1
    buckets = [0] * 10
    for s in scores:
        pct = (s / max_score) * 100
        idx = min(int(pct // 10), 9)
        buckets[idx] += 1
    score_distribution = [
        {"range": f"{i*10}–{(i+1)*10}%", "count": buckets[i]}
        for i in range(10)
    ]

    # Percentile band distribution
    band_counts: dict[str, int] = {}
    for r in rows:
        b = r.percentile_band or "Below 50%"
        band_counts[b] = band_counts.get(b, 0) + 1

    # Branch comparison
    branch_map: dict[int, list] = {}
    for r in rows:
        bid = r.branch_id or 0
        branch_map.setdefault(bid, []).append(r)

    branch_comparison = []
    from app.models.branch import Branch
    branch_names = {b.id: b.name for b in db.scalars(select(Branch)).all()}
    for bid, brows in sorted(branch_map.items()):
        bs = [r.total_score for r in brows]
        ms = [r.math_score  for r in brows]
        ps = [r.physics_score for r in brows]
        cs = [r.chemistry_score for r in brows]
        branch_comparison.append({
            "branch_id":    bid,
            "branch_name":  branch_names.get(bid, f"Branch {bid}"),
            "students":     len(brows),
            "avg_score":    safe_avg(bs),
            "top_score":    safe_max(bs),
            "avg_math":     safe_avg(ms),
            "avg_physics":  safe_avg(ps),
            "avg_chemistry": safe_avg(cs),
            "avg_percentile": safe_avg([r.overall_percentile or 0 for r in brows]),
            "above_mi":     sum(1 for r in brows if r.above_mi_total) if mi_total else None,
        })
    branch_comparison.sort(key=lambda x: x["avg_score"], reverse=True)

    # Top 10 students
    top10 = sorted(rows, key=lambda r: r.total_score, reverse=True)[:10]
    top10_out = []
    student_ids = [r.student_id for r in top10]
    students_map = {s.id: s for s in db.scalars(select(Student).where(Student.id.in_(student_ids))).all()}
    for r in top10:
        s = students_map.get(r.student_id)
        top10_out.append({
            "rank":           r.overall_rank,
            "student_id":     r.student_id,
            "name":           s.name if s else "—",
            "admission_no":   s.admission_no if s else "—",
            "branch_name":    branch_names.get(r.branch_id or 0, "—"),
            "total_score":    r.total_score,
            "math_score":     r.math_score,
            "physics_score":  r.physics_score,
            "chemistry_score": r.chemistry_score,
            "percentile":     r.overall_percentile,
            "percentile_band": r.percentile_band,
            "above_mi":       r.above_mi_total,
        })

    # Faculty performance (avg score per faculty per subject)
    # Each subject now stores parallel lists of ids/names (multiple co-teachers).
    faculty_perf: dict[tuple, list] = {}
    for r in rows:
        for ids, names, subj, score in [
            (r.math_faculty_ids or [],     r.math_faculty_names or [],     "Mathematics", r.math_score),
            (r.physics_faculty_ids or [],  r.physics_faculty_names or [],  "Physics",     r.physics_score),
            (r.chemistry_faculty_ids or [], r.chemistry_faculty_names or [], "Chemistry",  r.chemistry_score),
        ]:
            for fid, fname in zip(ids, names):
                key = (fid, fname or f"Faculty {fid}", subj)
                faculty_perf.setdefault(key, []).append(score)

    faculty_out = [
        {
            "faculty_id":   k[0],
            "faculty_name": k[1],
            "subject":      k[2],
            "students":     len(v),
            "avg_score":    safe_avg(v),
            "top_score":    safe_max(v),
        }
        for k, v in faculty_perf.items()
    ]
    faculty_out.sort(key=lambda x: (x["subject"], -x["avg_score"]))

    return {
        "exam_id":    exam_id,
        "students":   n,
        "max_score":  max_score,
        "summary": {
            "avg_score":    safe_avg(scores),
            "top_score":    safe_max(scores),
            "avg_math":     safe_avg(math_scores),
            "avg_physics":  safe_avg(phys_scores),
            "avg_chemistry": safe_avg(chem_scores),
            "avg_percentile": safe_avg([r.overall_percentile or 0 for r in rows]),
            "mi_total":     mi_total,
            "mi_math":      mi_math,
            "mi_physics":   mi_phys,
            "mi_chemistry": mi_chem,
            "above_mi_total":     above_mi_total,
            "above_mi_math":      above_mi_math,
            "above_mi_physics":   above_mi_phys,
            "above_mi_chemistry": above_mi_chem,
        },
        "score_distribution":  score_distribution,
        "percentile_bands":    band_counts,
        "branch_comparison":   branch_comparison,
        "top10":               top10_out,
        "faculty_performance": faculty_out,
    }


# ── Dashboard 3: Student Report ───────────────────────────────────────────────

@router.get("/student-search")
def student_search(
    db: DbSession,
    q: str = Query("", description="Search by name or admission number"),
    academic_year_id: Optional[int] = Query(None),
    limit: int = Query(20),
):
    """Search students by name or admission number."""
    stmt = select(Student).where(
        Student.admission_no.ilike(f"%{q}%") | Student.name.ilike(f"%{q}%")
    ).limit(limit)
    students = db.scalars(stmt).all()

    result = []
    for s in students:
        # Get branch/section for this academic year
        ss = db.scalar(
            select(StudentSection)
            .join(BranchSection, StudentSection.branch_section_id == BranchSection.id)
            .where(
                StudentSection.student_id == s.id,
                StudentSection.academic_year_id == academic_year_id,
            )
        ) if academic_year_id else None

        branch_name = None
        section_name = None
        if ss:
            bs = db.get(BranchSection, ss.branch_section_id)
            if bs:
                b = db.get(Branch, bs.branch_id)
                sec = db.get(Section, bs.section_id)
                branch_name  = b.name  if b   else None
                section_name = sec.name if sec else None

        result.append({
            "id":             s.id,
            "admission_no":   s.admission_no,
            "name":           s.name,
            "target_rank":    s.target_rank,
            "branch_name":    branch_name,
            "section_name":   section_name,
        })
    return result


@router.get("/student-report/{student_id}")
def student_report(
    db: DbSession,
    student_id: int,
    academic_year_id: Optional[int] = Query(None),
):
    """Full report card for a student across all evaluated exams."""
    student = db.get(Student, student_id)
    if not student:
        return {"error": "Student not found"}

    # All per-paper evaluations for this student
    stmt = select(StudentEvaluation).where(
        StudentEvaluation.student_id == student_id
    ).order_by(StudentEvaluation.exam_date, StudentEvaluation.paper)
    if academic_year_id:
        stmt = stmt.where(StudentEvaluation.academic_year_id == academic_year_id)

    evals = db.scalars(stmt).all()

    # Cumulative evaluations (Advanced only)
    cum_stmt = select(StudentCumulativeEvaluation).where(
        StudentCumulativeEvaluation.student_id == student_id
    ).order_by(StudentCumulativeEvaluation.exam_date)
    if academic_year_id:
        cum_stmt = cum_stmt.where(StudentCumulativeEvaluation.academic_year_id == academic_year_id)
    cum_evals = db.scalars(cum_stmt).all()

    # Build exam history
    history = []
    for e in evals:
        history.append({
            "exam_id":        e.exam_id,
            "exam_code":      e.exam_code,
            "exam_type":      e.exam_type,
            "paper":          e.paper,
            "exam_date":      e.exam_date,
            "total_score":    e.total_score,
            "max_score":      e.max_score,
            "math_score":     e.math_score,
            "physics_score":  e.physics_score,
            "chemistry_score": e.chemistry_score,
            "average_percentage": e.average_percentage,
            "math_percentage":    e.math_percentage,
            "physics_percentage": e.physics_percentage,
            "chemistry_percentage": e.chemistry_percentage,
            "overall_rank":   e.overall_rank,
            "branch_rank":    e.branch_rank,
            "section_rank":   e.section_rank,
            "overall_percentile": e.overall_percentile,
            "percentile_band": e.percentile_band,
            "rank_change_overall": e.rank_change_overall,
            "rank_change_branch":  e.rank_change_branch,
            "score_change":        e.score_change,
            "mi_total":       e.mi_total,
            "above_mi_total": e.above_mi_total,
            "above_mi_math":  e.above_mi_math,
            "above_mi_physics": e.above_mi_physics,
            "above_mi_chemistry": e.above_mi_chemistry,
            "attempted":      e.attempted,
            "correct":        e.correct,
            "wrong":          e.wrong,
            "unattempted":    e.unattempted,
            "math_attempted": e.math_attempted, "math_correct": e.math_correct, "math_wrong": e.math_wrong,
            "physics_attempted": e.physics_attempted, "physics_correct": e.physics_correct, "physics_wrong": e.physics_wrong,
            "chemistry_attempted": e.chemistry_attempted, "chemistry_correct": e.chemistry_correct, "chemistry_wrong": e.chemistry_wrong,
            "math_faculty_names":     e.math_faculty_names or [],
            "physics_faculty_names":  e.physics_faculty_names or [],
            "chemistry_faculty_names": e.chemistry_faculty_names or [],
            "branch_name":    None,  # resolved below
        })

    # Cumulative history
    cum_history = []
    for c in cum_evals:
        cum_history.append({
            "exam_code":       c.exam_code,
            "exam_date":       c.exam_date,
            "p1_total":        c.p1_total,
            "p2_total":        c.p2_total,
            "cumulative_total": c.cumulative_total,
            "max_score":       c.max_score,
            "cumulative_math": c.cumulative_math,
            "cumulative_physics": c.cumulative_physics,
            "cumulative_chemistry": c.cumulative_chemistry,
            "overall_rank":    c.overall_rank,
            "branch_rank":     c.branch_rank,
            "section_rank":    c.section_rank,
            "overall_percentile": c.overall_percentile,
            "percentile_band": c.percentile_band,
            "rank_change_overall": c.rank_change_overall,
            "average_percentage": c.average_percentage,
            "above_mi_total":  c.above_mi_total,
        })

    # Subject averages across all exams
    def subj_avg(attr):
        vals = [getattr(e, attr) for e in evals]
        return round(sum(vals) / len(vals), 2) if vals else 0

    subject_summary = {
        "math":     {"avg_score": subj_avg("math_score"),     "avg_pct": subj_avg("math_percentage"),
                     "avg_correct": subj_avg("math_correct"), "avg_wrong": subj_avg("math_wrong")},
        "physics":  {"avg_score": subj_avg("physics_score"),  "avg_pct": subj_avg("physics_percentage"),
                     "avg_correct": subj_avg("physics_correct"), "avg_wrong": subj_avg("physics_wrong")},
        "chemistry":{"avg_score": subj_avg("chemistry_score"), "avg_pct": subj_avg("chemistry_percentage"),
                     "avg_correct": subj_avg("chemistry_correct"), "avg_wrong": subj_avg("chemistry_wrong")},
    }

    # Best / worst subject
    subj_avgs = {
        "Mathematics": subj_avg("math_percentage"),
        "Physics":     subj_avg("physics_percentage"),
        "Chemistry":   subj_avg("chemistry_percentage"),
    }
    best_subject  = max(subj_avgs, key=lambda k: subj_avgs[k]) if evals else None
    worst_subject = min(subj_avgs, key=lambda k: subj_avgs[k]) if evals else None

    # Branch/section from most recent eval
    branch_name  = evals[-1].branch_id and None  # resolved via branch names lookup
    branch_names = {b.id: b.name for b in db.scalars(select(Branch)).all()}
    section_names = {s.id: s.name for s in db.scalars(select(Section)).all()}

    for h in history:
        ev = next((e for e in evals if e.exam_id == h["exam_id"]), None)
        if ev:
            h["branch_name"] = branch_names.get(ev.branch_id) if ev.branch_id else None

    latest = evals[-1] if evals else None

    return {
        "student": {
            "id":            student.id,
            "admission_no":  student.admission_no,
            "name":          student.name,
            "target_rank":   student.target_rank,
            "branch_name":   branch_names.get(latest.branch_id) if latest and latest.branch_id else None,
        },
        "history":          history,
        "cumulative_history": cum_history,
        "subject_summary":  subject_summary,
        "best_subject":     best_subject,
        "worst_subject":    worst_subject,
        "total_exams":      len(set(e.exam_code for e in evals)),
        "mi_cleared_count": sum(1 for e in evals if e.above_mi_total),
    }
