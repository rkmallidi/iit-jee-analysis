"""Exam result schemas for OMR upload."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ExamResultOut(BaseModel):
    id: int
    exam_id: int
    student_id: int
    answers: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class QuestionResult(BaseModel):
    qno: int
    subject: str
    question_type: Optional[str]
    student_answer: int | str    # raw answer value; str for MCQ e.g. "2|4"
    correct_answer: Optional[str]  # effective key (akc if set, else bkc)
    is_correct: Optional[bool]   # None if unattempted or no key
    marks_awarded: float
    is_bonus: bool
    is_deleted: bool


class StudentResult(BaseModel):
    student_id: int
    admission_no: str
    name: str
    target_rank: Optional[str]
    branch_id: Optional[int]
    branch_name: Optional[str]
    total_score: float
    math_score: float
    physics_score: float
    chemistry_score: float
    attempted: int
    correct: int
    wrong: int
    unattempted: int
    responses: list[QuestionResult]


class ExamResultsDetail(BaseModel):
    exam_id: int
    questions: list[dict]        # lightweight question meta for header
    students: list[StudentResult]


class OMRValidationRecord(BaseModel):
    """A single student record from OMR file."""
    omr_id: str
    answers: list[int | str]  # int for SCQ/INT, str for MCQ ("2|4") or DECIMAL ("3.14")


class OMRValidationSummary(BaseModel):
    """Summary of OMR file validation."""
    valid_count: int
    duplicate_ids: list[str]
    invalid_student_ids: list[str]
    missing_students: list[str]  # Enrolled but not in file
    errors: list[str]
    file_records: list[OMRValidationRecord]
    program_id: int
    class_id: int


class OMRUploadConfirm(BaseModel):
    """User confirmation to save validated OMR data."""
    exam_id: int
    branch_id: int
    records: list[OMRValidationRecord]
    file_name: str = ""
    valid_count: int = 0
    absent_count: int = 0
    duplicate_count: int = 0
    invalid_count: int = 0
    absent_list: list[str] = []


class UploadLogOut(BaseModel):
    branch_id: int
    uploaded_at: datetime
    valid_count: int
    absent_count: int
    duplicate_count: int
    invalid_count: int
    absent_list: list[str]
    file_name: str

    model_config = {"from_attributes": True}
