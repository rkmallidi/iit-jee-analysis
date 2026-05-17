"""Student schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.mapping import BranchSectionOut


class RankCategoryEnum(str):
    TOP_10 = "Top 10"
    TOP_100 = "Top 100"
    TOP_1000 = "Top 1000"
    TOP_10000 = "Top 10000"
    QUALIFIER = "Qualifier"


class StudentBase(BaseModel):
    admission_no: str
    name: str
    phone: Optional[str] = None
    target_rank: Optional[str] = None
    is_active: bool = True


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    target_rank: Optional[str] = None
    is_active: Optional[bool] = None


class StudentSectionOut(BaseModel):
    id: int
    student_id: int
    academic_year_id: int
    branch_section_id: int
    assigned_at: datetime
    branch_section: Optional[BranchSectionOut] = None

    model_config = {"from_attributes": True}


class StudentOut(StudentBase):
    id: int
    created_at: datetime
    section_mapping: Optional[StudentSectionOut] = None  # set per-request by CRUD

    model_config = {"from_attributes": True}


class StudentSectionAssign(BaseModel):
    branch_section_id: int
    academic_year_id: int


class UploadResult(BaseModel):
    created: int
    updated: int
    skipped: int
    errors: list[str]
