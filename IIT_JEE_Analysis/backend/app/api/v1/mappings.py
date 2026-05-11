"""Mapping endpoints: dean-branch, principal-branch, branch-program, branch-section, faculty-section, overview."""
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import CurrentUser, DbSession, require_roles
from app.crud import mapping as crud
from app.models.mapping import SubjectName
from app.models.user import RoleName
from app.schemas.mapping import (
    BranchOverview,
    BranchProgramCreate,
    BranchProgramOut,
    BranchSectionCreate,
    BranchSectionOut,
    DeanBranchCreate,
    DeanBranchOut,
    FacultyOverview,
    FacultySectionCreate,
    FacultySectionOut,
    FacultySubjectCreate,
    FacultySubjectOut,
    PrincipalBranchCreate,
    PrincipalBranchOut,
    ProgramOverview,
)

router = APIRouter(prefix="/mappings", tags=["mappings"])
admin_only = Depends(require_roles(RoleName.ADMIN))


# ----- Faculty Subject -----
@router.post("/faculty-subject", response_model=FacultySubjectOut, dependencies=[admin_only])
def set_faculty_subject(data: FacultySubjectCreate, db: DbSession):
    return crud.set_faculty_subject(db, data.user_id, data.subject)

@router.delete("/faculty-subject/{user_id}", status_code=204, dependencies=[admin_only])
def delete_faculty_subject(user_id: int, db: DbSession):
    fs = crud.get_faculty_subject(db, user_id)
    if not fs: raise HTTPException(404, "Not found")
    crud.delete_faculty_subject(db, fs)


# ----- Dean ↔ Branch -----
@router.get("/dean-branches", response_model=list[DeanBranchOut])
def list_dean_branches(db: DbSession, _: CurrentUser):
    return crud.get_dean_branches(db)

@router.post("/dean-branches", response_model=DeanBranchOut, status_code=201, dependencies=[admin_only])
def assign_dean_branch(data: DeanBranchCreate, db: DbSession):
    return crud.assign_dean_branch(db, data.user_id, data.branch_id)

@router.delete("/dean-branches/{id}", status_code=204, dependencies=[admin_only])
def remove_dean_branch(id: int, db: DbSession):
    obj = crud.get_dean_branch(db, id)
    if not obj: raise HTTPException(404, "Not found")
    crud.remove_dean_branch(db, obj)


# ----- Principal ↔ Branch -----
@router.get("/principal-branches", response_model=list[PrincipalBranchOut])
def list_principal_branches(db: DbSession, _: CurrentUser):
    return crud.get_principal_branches(db)

@router.post("/principal-branches", response_model=PrincipalBranchOut, status_code=201, dependencies=[admin_only])
def assign_principal_branch(data: PrincipalBranchCreate, db: DbSession):
    return crud.assign_principal_branch(db, data.user_id, data.branch_id)

@router.delete("/principal-branches/{id}", status_code=204, dependencies=[admin_only])
def remove_principal_branch(id: int, db: DbSession):
    obj = crud.get_principal_branch(db, id)
    if not obj: raise HTTPException(404, "Not found")
    crud.remove_principal_branch(db, obj)


# ----- Branch ↔ Program -----
@router.get("/branch-programs", response_model=list[BranchProgramOut])
def list_branch_programs(db: DbSession, _: CurrentUser, branch_id: int | None = None):
    return crud.get_branch_programs(db, branch_id=branch_id)

@router.post("/branch-programs", response_model=BranchProgramOut, status_code=201, dependencies=[admin_only])
def assign_branch_program(data: BranchProgramCreate, db: DbSession):
    return crud.assign_branch_program(db, data.branch_id, data.program_id)

@router.delete("/branch-programs/{id}", status_code=204, dependencies=[admin_only])
def remove_branch_program(id: int, db: DbSession):
    obj = crud.get_branch_program(db, id)
    if not obj: raise HTTPException(404, "Not found")
    crud.remove_branch_program(db, obj)


# ----- Branch Sections (slots) -----
@router.get("/branch-sections", response_model=list[BranchSectionOut])
def list_branch_sections(
    db: DbSession, _: CurrentUser,
    branch_id: int | None = None, program_id: int | None = None
):
    return crud.get_branch_sections(db, branch_id=branch_id, program_id=program_id)

@router.post("/branch-sections", response_model=BranchSectionOut, status_code=201, dependencies=[admin_only])
def create_branch_section(data: BranchSectionCreate, db: DbSession):
    return crud.create_branch_section(db, data.branch_id, data.program_id, data.class_id, data.section_id)

@router.delete("/branch-sections/{id}", status_code=204, dependencies=[admin_only])
def delete_branch_section(id: int, db: DbSession):
    obj = crud.get_branch_section(db, id)
    if not obj: raise HTTPException(404, "Not found")
    crud.delete_branch_section(db, obj)


# ----- Faculty ↔ Section -----
@router.get("/faculty-sections", response_model=list[FacultySectionOut])
def list_faculty_sections(db: DbSession, _: CurrentUser, user_id: int | None = None):
    return crud.get_faculty_sections(db, user_id=user_id)

@router.post("/faculty-sections", response_model=FacultySectionOut, status_code=201, dependencies=[admin_only])
def assign_faculty_section(data: FacultySectionCreate, db: DbSession):
    try:
        return crud.assign_faculty_section(db, data.user_id, data.branch_section_id)
    except ValueError as e:
        raise HTTPException(404, str(e))

@router.delete("/faculty-sections/{id}", status_code=204, dependencies=[admin_only])
def remove_faculty_section(id: int, db: DbSession):
    obj = crud.get_faculty_section(db, id)
    if not obj: raise HTTPException(404, "Not found")
    crud.remove_faculty_section(db, obj)


# ----- Overview -----
@router.get("/overview/faculty/{user_id}", response_model=FacultyOverview)
def faculty_overview(user_id: int, db: DbSession, _: CurrentUser):
    try:
        return crud.get_faculty_overview(db, user_id)
    except ValueError as e:
        raise HTTPException(404, str(e))

@router.get("/overview/program/{program_id}", response_model=ProgramOverview)
def program_overview(program_id: int, db: DbSession, _: CurrentUser):
    try:
        return crud.get_program_overview(db, program_id)
    except ValueError as e:
        raise HTTPException(404, str(e))

@router.get("/overview/branch/{branch_id}", response_model=BranchOverview)
def branch_overview(branch_id: int, db: DbSession, _: CurrentUser):
    try:
        return crud.get_branch_overview(db, branch_id)
    except ValueError as e:
        raise HTTPException(404, str(e))
