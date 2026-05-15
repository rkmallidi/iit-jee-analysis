"""Mapping schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.mapping import SubjectName
from app.schemas.academic_year import AcademicYearOut
from app.schemas.branch import BranchOut
from app.schemas.class_ import ClassOut
from app.schemas.program import ProgramOut
from app.schemas.section import SectionOut
from app.schemas.user import UserOut


# ----------- Faculty Subject -----------

class FacultySubjectCreate(BaseModel):
    user_id: int
    subject: SubjectName


class FacultySubjectOut(BaseModel):
    id: int
    user_id: int
    subject: SubjectName
    created_at: datetime

    model_config = {"from_attributes": True}


# ----------- Dean ↔ Branch -----------

class DeanBranchCreate(BaseModel):
    user_id: int
    branch_id: int


class DeanBranchOut(BaseModel):
    id: int
    user_id: int
    branch_id: int
    assigned_at: datetime
    dean: Optional[UserOut] = None
    branch: Optional[BranchOut] = None

    model_config = {"from_attributes": True}


# ----------- Principal ↔ Branch -----------

class PrincipalBranchCreate(BaseModel):
    user_id: int
    branch_id: int


class PrincipalBranchOut(BaseModel):
    id: int
    user_id: int
    branch_id: int
    assigned_at: datetime
    principal: Optional[UserOut] = None
    branch: Optional[BranchOut] = None

    model_config = {"from_attributes": True}


# ----------- Vice-Principal ↔ Branch -----------

class VicePrincipalBranchCreate(BaseModel):
    user_id: int
    branch_id: int


class VicePrincipalBranchOut(BaseModel):
    id: int
    user_id: int
    branch_id: int
    assigned_at: datetime
    vice_principal: Optional[UserOut] = None
    branch: Optional[BranchOut] = None

    model_config = {"from_attributes": True}


# ----------- Operator ↔ Branch -----------

class OperatorBranchCreate(BaseModel):
    user_id: int
    branch_id: int


class OperatorBranchOut(BaseModel):
    id: int
    user_id: int
    branch_id: int
    assigned_at: datetime
    operator: Optional[UserOut] = None
    branch: Optional[BranchOut] = None

    model_config = {"from_attributes": True}


# ----------- Branch ↔ Program -----------

class BranchProgramCreate(BaseModel):
    academic_year_id: int
    branch_id: int
    program_id: int


class BranchProgramOut(BaseModel):
    id: int
    academic_year_id: int
    branch_id: int
    program_id: int
    created_at: datetime
    academic_year: Optional[AcademicYearOut] = None
    branch: Optional[BranchOut] = None
    program: Optional[ProgramOut] = None

    model_config = {"from_attributes": True}


# ----------- Branch Section slot -----------

class BranchSectionCreate(BaseModel):
    academic_year_id: int
    branch_id: int
    program_id: int
    class_id: int
    section_id: int


class BranchSectionOut(BaseModel):
    id: int
    academic_year_id: int
    branch_id: int
    program_id: int
    class_id: int
    section_id: int
    created_at: datetime
    academic_year: Optional[AcademicYearOut] = None
    branch: Optional[BranchOut] = None
    program: Optional[ProgramOut] = None
    class_: Optional[ClassOut] = None
    section: Optional[SectionOut] = None

    model_config = {"from_attributes": True, "populate_by_name": True}


# ----------- Faculty ↔ Section -----------

class FacultySectionCreate(BaseModel):
    user_id: int
    branch_section_id: int
    subject: SubjectName


class FacultySectionOut(BaseModel):
    id: int
    user_id: int
    branch_section_id: int
    branch_id: int
    class_id: int
    section_id: int
    subject: SubjectName
    assigned_at: datetime
    faculty: Optional[UserOut] = None
    branch: Optional[BranchOut] = None
    class_: Optional[ClassOut] = None
    section: Optional[SectionOut] = None

    model_config = {"from_attributes": True, "populate_by_name": True}


# ----------- Overview (aggregated) -----------

class FacultyOverview(BaseModel):
    faculty: UserOut
    subjects: list[FacultySubjectOut] = []
    sections: list[BranchSectionOut] = []


class ProgramOverview(BaseModel):
    program: ProgramOut
    branches: list[BranchOut] = []
    branch_sections: list[BranchSectionOut] = []


class BranchOverview(BaseModel):
    branch: BranchOut
    deans: list[UserOut] = []
    principals: list[UserOut] = []
    programs: list[ProgramOut] = []
    sections: list[BranchSectionOut] = []
    faculty_sections: list[FacultySectionOut] = []
