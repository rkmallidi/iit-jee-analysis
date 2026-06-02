"""Evaluation engine — computes ranks, MI, percentile and persists StudentEvaluation rows."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, delete
from sqlalchemy.orm import Session

from app.models.exam import Exam, EXAM_TYPE_ADVANCED, PAPER_P1, PAPER_P2
from app.models.exam_question import ExamQuestion
from app.models.exam_result import ExamResult
from app.models.mapping import BranchSection, FacultySection, DeanBranch, PrincipalBranch
from app.models.student import Student
from app.models.student_section import StudentSection
from app.models.student_evaluation import StudentEvaluation, StudentCumulativeEvaluation
from app.models.user import User


# ── Scoring helpers (mirror of exams.py) ────────────────────────────────────────

_LETTER_TO_NUM = {"A": "1", "B": "2", "C": "3", "D": "4"}
_NUMERIC_QTYPES = {"INT", "DECIMAL"}
_MULTI_QTYPES = {"MCQ"}
_BLANK_ANSWER_SENTINELS = {"-1000000", "-20000", "-2000000"}


def _normalise_answer_key(key: str, question_type: str | None = None) -> str:
    import re
    qt = (question_type or "").strip().upper()
    if qt in _NUMERIC_QTYPES:
        return key
    parts = [p.strip() for p in key.split("|")]
    result: list[str] = []
    for part in parts:
        upper = part.upper()
        if re.fullmatch(r"[A-D]+", upper):
            if qt in _MULTI_QTYPES or len(upper) > 1:
                result.extend(_LETTER_TO_NUM[ch] for ch in upper)
            else:
                result.append(_LETTER_TO_NUM.get(upper, part))
        elif qt in _MULTI_QTYPES and re.fullmatch(r"[1-4]{2,}", part):
            result.extend(list(part))
        else:
            result.append(part)
    return "|".join(result)


def _key_options(key: str) -> frozenset[str]:
    return frozenset(p.strip() for p in key.split("|") if p.strip())


def _is_unattempted(ans: int | str, qtype: str | None = None) -> bool:
    if str(ans).strip() in _BLANK_ANSWER_SENTINELS:
        return True
    qt = (qtype or "").upper()
    if qt in {"INT", "DECIMAL"}:
        return False
    return ans == 0 or str(ans).strip() == "0"


def _score_question(
    ans: int | str, key: str, qtype: str | None,
    marks: float, neg: float, partial: float,
) -> tuple[float, bool | None]:
    key_str = key.strip()
    qt = (qtype or "").upper()
    ans_str = str(ans).strip()

    if qt == "SCQ":
        return (marks, True) if ans_str in _key_options(key_str) else (-neg, False)

    if qt == "INT":
        accepted = _key_options(key_str)
        if ans_str in accepted:
            return marks, True
        try:
            ans_int = str(int(float(ans_str)))
            if ans_int in accepted:
                return marks, True
            for k in accepted:
                if int(float(k)) == int(float(ans_str)):
                    return marks, True
        except (ValueError, TypeError):
            pass
        return -neg, False

    if qt == "DECIMAL":
        try:
            val = float(ans_str)
        except ValueError:
            return -neg, False
        if ":" in key_str:
            try:
                lo_s, hi_s = key_str.split(":", 1)
                lo, hi = float(lo_s.strip()), float(hi_s.strip())
                if min(lo, hi) <= val <= max(lo, hi):
                    return marks, True
            except ValueError:
                pass
        else:
            try:
                if float(key_str) == val:
                    return marks, True
            except ValueError:
                pass
        return -neg, False

    if qt == "MCQ":
        selected = _key_options(ans_str)
        correct_set = _key_options(key_str)
        if selected == correct_set:
            return marks, True
        if selected - correct_set:
            return -neg, False
        n = len(selected & correct_set)
        return n * (partial if partial else 1.0), None

    return 0.0, False


def _parse_answers(answers_csv: str, questions: list[ExamQuestion]) -> list[int | str]:
    result: list[int | str] = []
    for i, a in enumerate(answers_csv.split(",")):
        a = a.strip()
        if not a:
            continue
        qt = (questions[i].question_type or "").upper() if i < len(questions) else ""
        if "|" in a:
            result.append(a)
        elif qt == "MCQ":
            result.append(_normalise_answer_key(a, "MCQ"))
        elif qt == "DECIMAL":
            result.append(a)
        else:
            try:
                result.append(int(a))
            except ValueError:
                result.append(0)
    return result


def _score_student(answers_csv: str, questions: list[ExamQuestion]) -> dict:
    """Score one student's OMR answers against the question bank. Returns score breakdown dict."""
    student_answers = _parse_answers(answers_csv, questions)
    total = math_s = phys_s = chem_s = 0.0
    attempted = correct = wrong = unattempted = 0
    math_att = math_cor = math_wrg = math_uat = 0
    phys_att = phys_cor = phys_wrg = phys_uat = 0
    chem_att = chem_cor = chem_wrg = chem_uat = 0

    for i, q in enumerate(questions):
        ans: int | str = student_answers[i] if i < len(student_answers) else 0
        effective_key = q.akc if q.akc else q.bkc
        marks = float(q.marks or 0)
        neg = float(q.negative_marks or 0)
        partial = float(q.partial_marks or 0)
        subj = q.subject

        if q.is_deleted:
            awarded = 0.0
            is_correct = None
        elif q.is_bonus:
            awarded = marks
            is_correct = None
        elif _is_unattempted(ans, q.question_type):
            awarded = 0.0
            is_correct = None
            unattempted += 1
            if subj == "Mathematics":   math_uat += 1
            elif subj == "Physics":     phys_uat += 1
            elif subj == "Chemistry":   chem_uat += 1
        elif not effective_key:
            awarded = 0.0
            is_correct = None
        else:
            awarded, is_correct = _score_question(ans, effective_key, q.question_type, marks, neg, partial)
            if is_correct is True:
                correct += 1; attempted += 1
                if subj == "Mathematics":   math_cor += 1; math_att += 1
                elif subj == "Physics":     phys_cor += 1; phys_att += 1
                elif subj == "Chemistry":   chem_cor += 1; chem_att += 1
            elif is_correct is False:
                wrong += 1; attempted += 1
                if subj == "Mathematics":   math_wrg += 1; math_att += 1
                elif subj == "Physics":     phys_wrg += 1; phys_att += 1
                elif subj == "Chemistry":   chem_wrg += 1; chem_att += 1
            else:
                attempted += 1
                if subj == "Mathematics":   math_att += 1
                elif subj == "Physics":     phys_att += 1
                elif subj == "Chemistry":   chem_att += 1

        if not q.is_deleted:
            total += awarded
            if subj == "Mathematics":   math_s += awarded
            elif subj == "Physics":     phys_s += awarded
            elif subj == "Chemistry":   chem_s += awarded

    return dict(
        total=total, math=math_s, physics=phys_s, chemistry=chem_s,
        attempted=attempted, correct=correct, wrong=wrong, unattempted=unattempted,
        math_att=math_att, math_cor=math_cor, math_wrg=math_wrg, math_uat=math_uat,
        phys_att=phys_att, phys_cor=phys_cor, phys_wrg=phys_wrg, phys_uat=phys_uat,
        chem_att=chem_att, chem_cor=chem_cor, chem_wrg=chem_wrg, chem_uat=chem_uat,
    )


# ── Rank helpers ─────────────────────────────────────────────────────────────────

def _assign_ranks(items: list, score_key) -> dict:
    """Standard competition ranking (1224 style). Returns {id: rank}."""
    sorted_items = sorted(items, key=lambda x: score_key(x), reverse=True)
    ranks: dict = {}
    for i, item in enumerate(sorted_items):
        if i == 0:
            ranks[item["student_id"]] = 1
        else:
            prev = sorted_items[i - 1]
            if score_key(item) == score_key(prev):
                ranks[item["student_id"]] = ranks[prev["student_id"]]
            else:
                ranks[item["student_id"]] = i + 1
    return ranks


def _assign_percentiles(items: list, score_key) -> dict:
    """Standard percentile: (students below / total) × 100."""
    scores = sorted([score_key(x) for x in items])
    total = len(scores)
    result: dict = {}
    for item in items:
        s = score_key(item)
        below = sum(1 for sc in scores if sc < s)
        result[item["student_id"]] = round((below / total) * 100, 2) if total > 0 else 0.0
    return result


def _percentile_band(pct: float) -> str:
    if pct >= 99:   return "Top 1%"
    if pct >= 95:   return "Top 5%"
    if pct >= 90:   return "Top 10%"
    if pct >= 75:   return "Top 25%"
    if pct >= 50:   return "Top 50%"
    return "Below 50%"


def _compute_mi(scores: list[float]) -> Optional[float]:
    """MI = 80% of average of top-10 scores. Returns None if no scores."""
    if not scores:
        return None
    top10 = sorted(scores, reverse=True)[:10]
    return round(0.8 * (sum(top10) / len(top10)), 2)


def _max_marks(questions: list[ExamQuestion]) -> tuple[float, float, float, float]:
    """Return (total_max, math_max, phys_max, chem_max) from non-deleted questions."""
    total = math_m = phys_m = chem_m = 0.0
    for q in questions:
        if q.is_deleted:
            continue
        m = float(q.marks or 0)
        total += m
        if q.subject == "Mathematics":   math_m += m
        elif q.subject == "Physics":     phys_m += m
        elif q.subject == "Chemistry":   chem_m += m
    return total, math_m, phys_m, chem_m


# ── Main evaluation function ──────────────────────────────────────────────────────

def run_evaluation(db: Session, exam: Exam) -> dict:
    """
    Evaluate all papers for the given exam (representative paper, siblings resolved internally).
    Writes StudentEvaluation rows (per paper) and StudentCumulativeEvaluation rows (Advanced only).
    Returns a summary dict.
    """
    now = datetime.now(timezone.utc)

    # Resolve all sibling papers for this logical exam
    siblings: list[Exam] = list(db.scalars(
        select(Exam).where(
            Exam.academic_year_id == exam.academic_year_id,
            Exam.exam_code == exam.exam_code,
            Exam.program_id == exam.program_id,
            Exam.class_id == exam.class_id,
        ).order_by(Exam.paper)
    ).all())

    is_advanced = exam.exam_type == EXAM_TYPE_ADVANCED

    # ── Fetch faculty snapshots (section-level) ─────────────────────────────────
    # Multiple faculty may co-teach the same subject in a section.
    faculty_rows = db.execute(
        select(FacultySection.branch_section_id, FacultySection.subject,
               User.id.label("uid"), User.full_name)
        .join(User, FacultySection.user_id == User.id)
        .where(FacultySection.class_id == exam.class_id)
    ).all()
    # faculty_by_bs_subj[(branch_section_id, subject)] = [(user_id, full_name), ...]
    faculty_by_bs_subj: dict[tuple[int, str], list[tuple[int, str]]] = {}
    for r in faculty_rows:
        faculty_by_bs_subj.setdefault((r.branch_section_id, r.subject), []).append((r.uid, r.full_name))

    # ── Fetch principal / dean snapshots (branch-level) ──────────────────────────
    principal_rows = db.execute(
        select(PrincipalBranch.branch_id, User.id.label("uid"), User.full_name)
        .join(User, PrincipalBranch.user_id == User.id)
    ).all()
    principal_by_branch: dict[int, tuple[int, str]] = {
        r.branch_id: (r.uid, r.full_name) for r in principal_rows
    }

    dean_rows = db.execute(
        select(DeanBranch.branch_id, User.id.label("uid"), User.full_name)
        .join(User, DeanBranch.user_id == User.id)
    ).all()
    dean_by_branch: dict[int, tuple[int, str]] = {
        r.branch_id: (r.uid, r.full_name) for r in dean_rows
    }

    # ── Fetch student → (branch_id, section_id, branch_section_id) mapping ───────
    student_section_rows = db.execute(
        select(
            StudentSection.student_id,
            BranchSection.branch_id,
            BranchSection.section_id,
            BranchSection.id.label("bs_id"),
        )
        .join(BranchSection, StudentSection.branch_section_id == BranchSection.id)
        .where(
            StudentSection.academic_year_id == exam.academic_year_id,
            BranchSection.program_id == exam.program_id,
            BranchSection.class_id == exam.class_id,
        )
    ).all()
    student_placement: dict[int, dict] = {
        r.student_id: {
            "branch_id": r.branch_id,
            "section_id": r.section_id,
            "bs_id": r.bs_id,
        }
        for r in student_section_rows
    }

    # ── Fetch previous evaluations for rank-change calculation ───────────────────
    # Get the most recent prior StudentEvaluation per student for this program/class/year
    # (different exam_code, same paper)
    prev_eval_rows = db.execute(
        select(StudentEvaluation.student_id, StudentEvaluation.paper,
               StudentEvaluation.overall_rank, StudentEvaluation.branch_rank,
               StudentEvaluation.total_score)
        .where(
            StudentEvaluation.academic_year_id == exam.academic_year_id,
            StudentEvaluation.program_id == exam.program_id,
            StudentEvaluation.class_id == exam.class_id,
            StudentEvaluation.exam_code != exam.exam_code,
        )
        .order_by(StudentEvaluation.exam_date.desc())
    ).all()
    # Keep only most recent per (student_id, paper)
    prev_eval: dict[tuple[int, str], dict] = {}
    for r in prev_eval_rows:
        key = (r.student_id, r.paper)
        if key not in prev_eval:
            prev_eval[key] = {
                "overall_rank": r.overall_rank,
                "branch_rank": r.branch_rank,
                "total_score": r.total_score,
            }

    total_evaluated = 0
    paper_summaries: list[dict] = []

    # ── Per-paper scoring → evaluation rows ─────────────────────────────────────
    paper_scored: dict[str, list[dict]] = {}   # paper → list of scored student dicts

    for paper_exam in siblings:
        questions = list(db.scalars(
            select(ExamQuestion)
            .where(ExamQuestion.exam_id == paper_exam.id)
            .order_by(ExamQuestion.qno)
        ).all())
        results = list(db.scalars(
            select(ExamResult).where(ExamResult.exam_id == paper_exam.id)
        ).all())

        max_total, max_math, max_phys, max_chem = _max_marks(questions)

        # Score each student
        scored: list[dict] = []
        for result in results:
            sc = _score_student(result.answers, questions)
            placement = student_placement.get(result.student_id, {})
            branch_id = placement.get("branch_id")
            section_id = placement.get("section_id")
            bs_id = placement.get("bs_id")

            # Faculty snapshot — returns parallel lists of ids and names
            def _fac_lists(subj: str) -> tuple[list[int], list[str]]:
                if bs_id is None:
                    return [], []
                entries = faculty_by_bs_subj.get((bs_id, subj), [])
                return [e[0] for e in entries], [e[1] for e in entries]

            math_fac_ids, math_fac_names = _fac_lists("Mathematics")
            phys_fac_ids, phys_fac_names = _fac_lists("Physics")
            chem_fac_ids, chem_fac_names = _fac_lists("Chemistry")

            principal = principal_by_branch.get(branch_id) if branch_id else None
            dean = dean_by_branch.get(branch_id) if branch_id else None

            scored.append({
                "student_id":    result.student_id,
                "branch_id":     branch_id,
                "section_id":    section_id,
                "bs_id":         bs_id,
                "total":         sc["total"],
                "math":          sc["math"],
                "physics":       sc["physics"],
                "chemistry":     sc["chemistry"],
                "max_total":     max_total,
                "max_math":      max_math,
                "max_phys":      max_phys,
                "max_chem":      max_chem,
                "attempted":     sc["attempted"],
                "correct":       sc["correct"],
                "wrong":         sc["wrong"],
                "unattempted":   sc["unattempted"],
                "math_att":      sc["math_att"], "math_cor": sc["math_cor"],
                "math_wrg":      sc["math_wrg"], "math_uat": sc["math_uat"],
                "phys_att":      sc["phys_att"], "phys_cor": sc["phys_cor"],
                "phys_wrg":      sc["phys_wrg"], "phys_uat": sc["phys_uat"],
                "chem_att":      sc["chem_att"], "chem_cor": sc["chem_cor"],
                "chem_wrg":      sc["chem_wrg"], "chem_uat": sc["chem_uat"],
                "math_fac_ids":  math_fac_ids,  "math_fac_names":  math_fac_names,
                "phys_fac_ids":  phys_fac_ids,  "phys_fac_names":  phys_fac_names,
                "chem_fac_ids":  chem_fac_ids,  "chem_fac_names":  chem_fac_names,
                "principal_id":  principal[0] if principal else None,
                "principal_name": principal[1] if principal else None,
                "dean_id":       dean[0] if dean else None,
                "dean_name":     dean[1] if dean else None,
            })

        paper_scored[paper_exam.paper] = scored

        # ── Compute MI ────────────────────────────────────────────────────────────
        mi_total   = _compute_mi([s["total"]    for s in scored])
        mi_math    = _compute_mi([s["math"]     for s in scored])
        mi_phys    = _compute_mi([s["physics"]  for s in scored])
        mi_chem    = _compute_mi([s["chemistry"] for s in scored])

        # ── Compute overall ranks + percentiles ───────────────────────────────────
        overall_ranks   = _assign_ranks(scored, lambda s: s["total"])
        overall_pcts    = _assign_percentiles(scored, lambda s: s["total"])

        # ── Branch-level ranks + percentiles ─────────────────────────────────────
        by_branch: dict[int, list[dict]] = {}
        for s in scored:
            bid = s["branch_id"] or 0
            by_branch.setdefault(bid, []).append(s)
        branch_ranks: dict[int, int] = {}
        branch_pcts:  dict[int, float] = {}
        for grp in by_branch.values():
            branch_ranks.update(_assign_ranks(grp, lambda s: s["total"]))
            branch_pcts.update(_assign_percentiles(grp, lambda s: s["total"]))

        # ── Section-level ranks + percentiles ─────────────────────────────────────
        by_section: dict[int, list[dict]] = {}
        for s in scored:
            sid = s["section_id"] or 0
            by_section.setdefault(sid, []).append(s)
        section_ranks: dict[int, int] = {}
        section_pcts:  dict[int, float] = {}
        for grp in by_section.values():
            section_ranks.update(_assign_ranks(grp, lambda s: s["total"]))
            section_pcts.update(_assign_percentiles(grp, lambda s: s["total"]))

        # ── Delete existing evaluations for this paper ────────────────────────────
        db.execute(
            delete(StudentEvaluation).where(StudentEvaluation.exam_id == paper_exam.id)
        )

        # ── Upsert StudentEvaluation rows ─────────────────────────────────────────
        for s in scored:
            sid = s["student_id"]
            overall_pct = overall_pcts.get(sid, 0.0)
            prev = prev_eval.get((sid, paper_exam.paper))
            pct_pct = overall_pct

            row = StudentEvaluation(
                exam_id          = paper_exam.id,
                student_id       = sid,
                branch_id        = s["branch_id"],
                section_id       = s["section_id"],
                academic_year_id = exam.academic_year_id,
                program_id       = exam.program_id,
                class_id         = exam.class_id,
                exam_code        = exam.exam_code,
                exam_date        = str(paper_exam.exam_date),
                exam_type        = paper_exam.exam_type,
                paper            = paper_exam.paper,

                total_score      = s["total"],
                math_score       = s["math"],
                physics_score    = s["physics"],
                chemistry_score  = s["chemistry"],
                max_score        = s["max_total"],

                attempted        = s["attempted"],
                correct          = s["correct"],
                wrong            = s["wrong"],
                unattempted      = s["unattempted"],
                math_attempted   = s["math_att"],   math_correct = s["math_cor"],
                math_wrong       = s["math_wrg"],   math_unattempted = s["math_uat"],
                physics_attempted= s["phys_att"],   physics_correct = s["phys_cor"],
                physics_wrong    = s["phys_wrg"],   physics_unattempted = s["phys_uat"],
                chemistry_attempted = s["chem_att"], chemistry_correct = s["chem_cor"],
                chemistry_wrong  = s["chem_wrg"],   chemistry_unattempted = s["chem_uat"],

                average_percentage   = round((s["total"]    / s["max_total"]    * 100), 2) if s["max_total"]   else 0,
                math_percentage      = round((s["math"]     / s["max_math"]     * 100), 2) if s["max_math"]    else 0,
                physics_percentage   = round((s["physics"]  / s["max_phys"]     * 100), 2) if s["max_phys"]    else 0,
                chemistry_percentage = round((s["chemistry"] / s["max_chem"]    * 100), 2) if s["max_chem"]    else 0,

                overall_rank     = overall_ranks.get(sid),
                branch_rank      = branch_ranks.get(sid),
                section_rank     = section_ranks.get(sid),

                rank_change_overall = (prev["overall_rank"] - overall_ranks.get(sid, 0)) if prev and prev.get("overall_rank") else None,
                rank_change_branch  = (prev["branch_rank"]  - branch_ranks.get(sid, 0))  if prev and prev.get("branch_rank")  else None,
                score_change        = (s["total"] - prev["total_score"])                  if prev and prev.get("total_score") is not None else None,

                overall_percentile  = overall_pct,
                branch_percentile   = branch_pcts.get(sid),
                section_percentile  = section_pcts.get(sid),
                percentile_band     = _percentile_band(pct_pct),

                mi_total       = mi_total,
                mi_math        = mi_math,
                mi_physics     = mi_phys,
                mi_chemistry   = mi_chem,
                above_mi_total     = (s["total"]    >= mi_total) if mi_total is not None else None,
                above_mi_math      = (s["math"]     >= mi_math)  if mi_math  is not None else None,
                above_mi_physics   = (s["physics"]  >= mi_phys)  if mi_phys  is not None else None,
                above_mi_chemistry = (s["chemistry"] >= mi_chem) if mi_chem  is not None else None,

                math_faculty_ids    = s["math_fac_ids"],  math_faculty_names    = s["math_fac_names"],
                physics_faculty_ids = s["phys_fac_ids"],  physics_faculty_names = s["phys_fac_names"],
                chemistry_faculty_ids = s["chem_fac_ids"], chemistry_faculty_names = s["chem_fac_names"],
                principal_id       = s["principal_id"],  principal_name       = s["principal_name"],
                dean_id            = s["dean_id"],        dean_name            = s["dean_name"],

                evaluated_at = now,
            )
            db.add(row)
            total_evaluated += 1

        paper_summaries.append({
            "paper":         paper_exam.paper,
            "students":      len(scored),
            "mi_total":      mi_total,
            "mi_math":       mi_math,
            "mi_physics":    mi_phys,
            "mi_chemistry":  mi_chem,
        })

    # ── Advanced: cumulative evaluation ──────────────────────────────────────────
    if is_advanced and PAPER_P1 in paper_scored and PAPER_P2 in paper_scored:
        p1_map = {s["student_id"]: s for s in paper_scored[PAPER_P1]}
        p2_map = {s["student_id"]: s for s in paper_scored[PAPER_P2]}
        all_student_ids = set(p1_map) | set(p2_map)

        p1_exam = next((e for e in siblings if e.paper == PAPER_P1), siblings[0])
        max_p1 = p1_map[next(iter(p1_map))]["max_total"] if p1_map else 0
        max_p2 = p2_map[next(iter(p2_map))]["max_total"] if p2_map else 0
        max_combined = max_p1 + max_p2

        # Combine scores
        cumul: list[dict] = []
        for sid in all_student_ids:
            p1 = p1_map.get(sid)
            p2 = p2_map.get(sid)
            ref = p1 or p2
            cumul.append({
                "student_id":  sid,
                "branch_id":   ref["branch_id"],
                "section_id":  ref["section_id"],
                "p1_total":    p1["total"]    if p1 else 0,
                "p2_total":    p2["total"]    if p2 else 0,
                "cum_total":   (p1["total"]   if p1 else 0) + (p2["total"]   if p2 else 0),
                "cum_math":    (p1["math"]    if p1 else 0) + (p2["math"]    if p2 else 0),
                "cum_physics": (p1["physics"] if p1 else 0) + (p2["physics"] if p2 else 0),
                "cum_chem":    (p1["chemistry"] if p1 else 0) + (p2["chemistry"] if p2 else 0),
                "attempted":   (p1["attempted"] if p1 else 0) + (p2["attempted"] if p2 else 0),
                "correct":     (p1["correct"]   if p1 else 0) + (p2["correct"]   if p2 else 0),
                "wrong":       (p1["wrong"]     if p1 else 0) + (p2["wrong"]     if p2 else 0),
                "unattempted": (p1["unattempted"] if p1 else 0) + (p2["unattempted"] if p2 else 0),
                "math_att":    (p1["math_att"] if p1 else 0) + (p2["math_att"] if p2 else 0),
                "math_cor":    (p1["math_cor"] if p1 else 0) + (p2["math_cor"] if p2 else 0),
                "math_wrg":    (p1["math_wrg"] if p1 else 0) + (p2["math_wrg"] if p2 else 0),
                "phys_att":    (p1["phys_att"] if p1 else 0) + (p2["phys_att"] if p2 else 0),
                "phys_cor":    (p1["phys_cor"] if p1 else 0) + (p2["phys_cor"] if p2 else 0),
                "phys_wrg":    (p1["phys_wrg"] if p1 else 0) + (p2["phys_wrg"] if p2 else 0),
                "chem_att":    (p1["chem_att"] if p1 else 0) + (p2["chem_att"] if p2 else 0),
                "chem_cor":    (p1["chem_cor"] if p1 else 0) + (p2["chem_cor"] if p2 else 0),
                "chem_wrg":    (p1["chem_wrg"] if p1 else 0) + (p2["chem_wrg"] if p2 else 0),
                # Use P1 faculty/leadership snapshot (same student, same section)
                "math_fac_ids":  ref["math_fac_ids"],  "math_fac_names":  ref["math_fac_names"],
                "phys_fac_ids":  ref["phys_fac_ids"],  "phys_fac_names":  ref["phys_fac_names"],
                "chem_fac_ids":  ref["chem_fac_ids"],  "chem_fac_names":  ref["chem_fac_names"],
                "principal_id":  ref["principal_id"],  "principal_name":  ref["principal_name"],
                "dean_id":       ref["dean_id"],        "dean_name":       ref["dean_name"],
                "max_combined":  max_combined,
                "max_math":      (p1["max_math"] if p1 else 0) + (p2["max_math"] if p2 else 0),
                "max_phys":      (p1["max_phys"] if p1 else 0) + (p2["max_phys"] if p2 else 0),
                "max_chem":      (p1["max_chem"] if p1 else 0) + (p2["max_chem"] if p2 else 0),
            })

        mi_cum_total = _compute_mi([s["cum_total"]   for s in cumul])
        mi_cum_math  = _compute_mi([s["cum_math"]    for s in cumul])
        mi_cum_phys  = _compute_mi([s["cum_physics"] for s in cumul])
        mi_cum_chem  = _compute_mi([s["cum_chem"]    for s in cumul])

        cum_overall_ranks = _assign_ranks(cumul, lambda s: s["cum_total"])
        cum_overall_pcts  = _assign_percentiles(cumul, lambda s: s["cum_total"])

        cum_by_branch: dict[int, list] = {}
        for s in cumul:
            cum_by_branch.setdefault(s["branch_id"] or 0, []).append(s)
        cum_branch_ranks: dict[int, int] = {}
        cum_branch_pcts:  dict[int, float] = {}
        for grp in cum_by_branch.values():
            cum_branch_ranks.update(_assign_ranks(grp, lambda s: s["cum_total"]))
            cum_branch_pcts.update(_assign_percentiles(grp, lambda s: s["cum_total"]))

        cum_by_section: dict[int, list] = {}
        for s in cumul:
            cum_by_section.setdefault(s["section_id"] or 0, []).append(s)
        cum_section_ranks: dict[int, int] = {}
        cum_section_pcts:  dict[int, float] = {}
        for grp in cum_by_section.values():
            cum_section_ranks.update(_assign_ranks(grp, lambda s: s["cum_total"]))
            cum_section_pcts.update(_assign_percentiles(grp, lambda s: s["cum_total"]))

        # Previous cumulative evaluations for rank change
        prev_cum_rows = db.execute(
            select(StudentCumulativeEvaluation.student_id,
                   StudentCumulativeEvaluation.overall_rank,
                   StudentCumulativeEvaluation.branch_rank,
                   StudentCumulativeEvaluation.cumulative_total)
            .where(
                StudentCumulativeEvaluation.academic_year_id == exam.academic_year_id,
                StudentCumulativeEvaluation.program_id == exam.program_id,
                StudentCumulativeEvaluation.class_id == exam.class_id,
                StudentCumulativeEvaluation.exam_code != exam.exam_code,
            )
            .order_by(StudentCumulativeEvaluation.exam_date.desc())
        ).all()
        prev_cum: dict[int, dict] = {}
        for r in prev_cum_rows:
            if r.student_id not in prev_cum:
                prev_cum[r.student_id] = {
                    "overall_rank": r.overall_rank,
                    "branch_rank": r.branch_rank,
                    "cum_total": r.cumulative_total,
                }

        db.execute(
            delete(StudentCumulativeEvaluation).where(
                StudentCumulativeEvaluation.p1_exam_id == p1_exam.id
            )
        )

        for s in cumul:
            sid = s["student_id"]
            o_pct = cum_overall_pcts.get(sid, 0.0)
            prev_c = prev_cum.get(sid)

            row = StudentCumulativeEvaluation(
                p1_exam_id       = p1_exam.id,
                student_id       = sid,
                branch_id        = s["branch_id"],
                section_id       = s["section_id"],
                academic_year_id = exam.academic_year_id,
                program_id       = exam.program_id,
                class_id         = exam.class_id,
                exam_code        = exam.exam_code,
                exam_date        = str(p1_exam.exam_date),
                max_score        = s["max_combined"],

                p1_total         = s["p1_total"],
                p2_total         = s["p2_total"],
                cumulative_total = s["cum_total"],
                cumulative_math  = s["cum_math"],
                cumulative_physics = s["cum_physics"],
                cumulative_chemistry = s["cum_chem"],

                attempted        = s["attempted"],
                correct          = s["correct"],
                wrong            = s["wrong"],
                unattempted      = s["unattempted"],
                math_attempted   = s["math_att"],  math_correct = s["math_cor"],  math_wrong = s["math_wrg"],
                physics_attempted= s["phys_att"],  physics_correct = s["phys_cor"], physics_wrong = s["phys_wrg"],
                chemistry_attempted = s["chem_att"], chemistry_correct = s["chem_cor"], chemistry_wrong = s["chem_wrg"],

                average_percentage   = round(s["cum_total"]   / s["max_combined"] * 100, 2) if s["max_combined"] else 0,
                math_percentage      = round(s["cum_math"]    / s["max_math"]     * 100, 2) if s["max_math"]    else 0,
                physics_percentage   = round(s["cum_physics"] / s["max_phys"]     * 100, 2) if s["max_phys"]    else 0,
                chemistry_percentage = round(s["cum_chem"]    / s["max_chem"]     * 100, 2) if s["max_chem"]    else 0,

                overall_rank     = cum_overall_ranks.get(sid),
                branch_rank      = cum_branch_ranks.get(sid),
                section_rank     = cum_section_ranks.get(sid),

                rank_change_overall = (prev_c["overall_rank"] - cum_overall_ranks.get(sid, 0)) if prev_c and prev_c.get("overall_rank") else None,
                rank_change_branch  = (prev_c["branch_rank"]  - cum_branch_ranks.get(sid, 0))  if prev_c and prev_c.get("branch_rank")  else None,
                score_change        = (s["cum_total"] - prev_c["cum_total"])                    if prev_c and prev_c.get("cum_total") is not None else None,

                overall_percentile  = o_pct,
                branch_percentile   = cum_branch_pcts.get(sid),
                section_percentile  = cum_section_pcts.get(sid),
                percentile_band     = _percentile_band(o_pct),

                mi_total             = mi_cum_total,
                mi_math              = mi_cum_math,
                mi_physics           = mi_cum_phys,
                mi_chemistry         = mi_cum_chem,
                above_mi_total       = (s["cum_total"]   >= mi_cum_total) if mi_cum_total is not None else None,
                above_mi_math        = (s["cum_math"]    >= mi_cum_math)  if mi_cum_math  is not None else None,
                above_mi_physics     = (s["cum_physics"] >= mi_cum_phys)  if mi_cum_phys  is not None else None,
                above_mi_chemistry   = (s["cum_chem"]    >= mi_cum_chem)  if mi_cum_chem  is not None else None,

                math_faculty_ids      = s["math_fac_ids"],  math_faculty_names    = s["math_fac_names"],
                physics_faculty_ids   = s["phys_fac_ids"],  physics_faculty_names = s["phys_fac_names"],
                chemistry_faculty_ids = s["chem_fac_ids"],  chemistry_faculty_names = s["chem_fac_names"],
                principal_id         = s["principal_id"],  principal_name        = s["principal_name"],
                dean_id              = s["dean_id"],        dean_name             = s["dean_name"],

                evaluated_at = now,
            )
            db.add(row)

        paper_summaries.append({
            "paper":        "Cumulative",
            "students":     len(cumul),
            "mi_total":     mi_cum_total,
            "mi_math":      mi_cum_math,
            "mi_physics":   mi_cum_phys,
            "mi_chemistry": mi_cum_chem,
        })

    db.commit()

    return {
        "exam_code":       exam.exam_code,
        "exam_type":       exam.exam_type,
        "total_evaluated": total_evaluated,
        "papers":          paper_summaries,
    }
