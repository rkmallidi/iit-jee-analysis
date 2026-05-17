"""Exam schemas."""
from datetime import date, datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, field_validator

VALID_QUESTION_TYPES = {"SCQ", "MCQ", "MSQ", "INT", "NUM", "NR", "ALT", "NUMERICAL_INT"}

ExamType  = Literal["Mains", "Advanced"]
PaperType = Literal["P1", "P2"]


class UserBasicOut(BaseModel):
    id: int
    full_name: str
    username: str

    model_config = {"from_attributes": True}


class BranchSectionDetailOut(BaseModel):
    """Branch section with section and student details."""
    section_name: str
    student_count: int
    students: list[dict]  # {id, admission_no, name}

    model_config = {"from_attributes": True}


class BranchDetailOut(BaseModel):
    """Branch with principal, dean, operator and sections."""
    id: int
    name: str
    code: str
    address: Optional[str] = None
    principal: Optional[UserBasicOut] = None
    dean: Optional[UserBasicOut] = None
    operator: Optional[UserBasicOut] = None
    sections: list[BranchSectionDetailOut]

    model_config = {"from_attributes": True}


class ExamDetailOut(BaseModel):
    """Detailed exam view with branches and sections."""
    id: int
    exam_code: str
    exam_type: ExamType
    exam_date: date
    program_name: str
    class_name: str
    branches: list[BranchDetailOut]

    model_config = {"from_attributes": True}


class ExamCreate(BaseModel):
    academic_year_id: int
    exam_code: str
    program_id: int
    class_id: int
    exam_type: ExamType
    exam_date: date
    # paper is auto-determined: Mains → P1 only, Advanced → P1 + P2
    mas_mathematics: Optional[float] = None
    mas_physics: Optional[float] = None
    mas_chemistry: Optional[float] = None


class ExamUpdate(BaseModel):
    exam_code: str | None = None
    program_id: int | None = None
    class_id: int | None = None
    exam_date: date | None = None
    # exam_type is not updatable (would require adding/removing paper records)
    mas_mathematics: Optional[float] = None
    mas_physics: Optional[float] = None
    mas_chemistry: Optional[float] = None


ExamStatus = Literal["draft", "published", "completed"]


class ExamOut(BaseModel):
    id: int
    academic_year_id: int
    program_id: int
    class_id: int
    exam_code: str
    exam_type: ExamType
    paper: PaperType
    exam_date: date
    status: ExamStatus = "draft"
    mas_mathematics: Optional[float] = None
    mas_physics: Optional[float] = None
    mas_chemistry: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    question_count: int = 0
    result_count: int = 0
    upload_logs: list[Any] = []

    model_config = {"from_attributes": True}


class ExamQuestionOut(BaseModel):
    id: int
    exam_id: int
    qno: int
    subject: str
    topic: str | None = None
    sub_topic: str | None = None
    difficulty: str | None = None
    question_type: str | None = None
    marks: float | None = None
    negative_marks: float | None = None
    bkc: str | None = None
    partial_marks: float | None = None
    is_deleted: bool
    is_bonus: bool = False
    akc: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ExamQuestionUpdate(BaseModel):
    subject: str | None = None
    topic: str | None = None
    sub_topic: str | None = None
    difficulty: str | None = None
    question_type: str | None = None
    marks: float | None = None
    negative_marks: float | None = None
    bkc: str | None = None
    partial_marks: float | None = None
    is_deleted: bool | None = None
    is_bonus: bool | None = None
    akc: str | None = None

    @field_validator("question_type", mode="before")
    @classmethod
    def validate_question_type(cls, v):
        if v is None:
            return v
        normalised = str(v).strip().upper()
        if normalised not in VALID_QUESTION_TYPES:
            raise ValueError(
                f"Invalid question_type '{v}'. Must be one of: {', '.join(sorted(VALID_QUESTION_TYPES))}"
            )
        return normalised


class ExamQuestionUploadResult(BaseModel):
    created: int
    updated: int
    skipped: int
    errors: list[str]
