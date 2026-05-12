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


class OMRValidationRecord(BaseModel):
    """A single student record from OMR file."""
    admission_no: str
    answers: list[int | float]


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
    records: list[OMRValidationRecord]
