"""Exam schemas."""
from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel

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


class ExamUpdate(BaseModel):
    exam_code: str | None = None
    program_id: int | None = None
    class_id: int | None = None
    exam_date: date | None = None
    # exam_type is not updatable (would require adding/removing paper records)


class ExamOut(BaseModel):
    id: int
    academic_year_id: int
    program_id: int
    class_id: int
    exam_code: str
    exam_type: ExamType
    paper: PaperType
    exam_date: date
    created_at: datetime
    updated_at: datetime
    question_count: int = 0

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


class ExamQuestionUploadResult(BaseModel):
    created: int
    updated: int
    skipped: int
    errors: list[str]
