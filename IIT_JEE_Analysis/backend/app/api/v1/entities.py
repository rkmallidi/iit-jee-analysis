"""Branch, Program, Class, Section CRUD endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import CurrentUser, DbSession, require_roles
from app.crud.entities import (
    create_branch, create_class, create_program, create_section,
    delete_branch, delete_class, delete_program, delete_section,
    get_branch, get_branches, get_class, get_classes,
    get_program, get_programs, get_section, get_sections,
    update_branch, update_class, update_program, update_section,
)
from app.models.user import RoleName
from app.schemas.branch import BranchCreate, BranchOut, BranchUpdate
from app.schemas.class_ import ClassCreate, ClassOut, ClassUpdate
from app.schemas.program import ProgramCreate, ProgramOut, ProgramUpdate
from app.schemas.section import SectionCreate, SectionOut, SectionUpdate

router = APIRouter(tags=["entities"])
admin_only = Depends(require_roles(RoleName.ADMIN))


# ----- Branch -----
@router.get("/branches", response_model=list[BranchOut])
def list_branches(db: DbSession, _: CurrentUser):
    return get_branches(db)

@router.post("/branches", response_model=BranchOut, status_code=201, dependencies=[admin_only])
def create_branch_ep(data: BranchCreate, db: DbSession):
    return create_branch(db, data)

@router.get("/branches/{branch_id}", response_model=BranchOut)
def get_branch_ep(branch_id: int, db: DbSession, _: CurrentUser):
    obj = get_branch(db, branch_id)
    if not obj: raise HTTPException(404, "Not found")
    return obj

@router.patch("/branches/{branch_id}", response_model=BranchOut, dependencies=[admin_only])
def update_branch_ep(branch_id: int, data: BranchUpdate, db: DbSession):
    obj = get_branch(db, branch_id)
    if not obj: raise HTTPException(404, "Not found")
    return update_branch(db, obj, data)

@router.delete("/branches/{branch_id}", status_code=204, dependencies=[admin_only])
def delete_branch_ep(branch_id: int, db: DbSession):
    obj = get_branch(db, branch_id)
    if not obj: raise HTTPException(404, "Not found")
    delete_branch(db, obj)


# ----- Program -----
@router.get("/programs", response_model=list[ProgramOut])
def list_programs(db: DbSession, _: CurrentUser):
    return get_programs(db)

@router.post("/programs", response_model=ProgramOut, status_code=201, dependencies=[admin_only])
def create_program_ep(data: ProgramCreate, db: DbSession):
    return create_program(db, data)

@router.get("/programs/{program_id}", response_model=ProgramOut)
def get_program_ep(program_id: int, db: DbSession, _: CurrentUser):
    obj = get_program(db, program_id)
    if not obj: raise HTTPException(404, "Not found")
    return obj

@router.patch("/programs/{program_id}", response_model=ProgramOut, dependencies=[admin_only])
def update_program_ep(program_id: int, data: ProgramUpdate, db: DbSession):
    obj = get_program(db, program_id)
    if not obj: raise HTTPException(404, "Not found")
    return update_program(db, obj, data)

@router.delete("/programs/{program_id}", status_code=204, dependencies=[admin_only])
def delete_program_ep(program_id: int, db: DbSession):
    obj = get_program(db, program_id)
    if not obj: raise HTTPException(404, "Not found")
    delete_program(db, obj)


# ----- Class -----
@router.get("/classes", response_model=list[ClassOut])
def list_classes(db: DbSession, _: CurrentUser):
    return get_classes(db)

@router.post("/classes", response_model=ClassOut, status_code=201, dependencies=[admin_only])
def create_class_ep(data: ClassCreate, db: DbSession):
    return create_class(db, data)

@router.get("/classes/{class_id}", response_model=ClassOut)
def get_class_ep(class_id: int, db: DbSession, _: CurrentUser):
    obj = get_class(db, class_id)
    if not obj: raise HTTPException(404, "Not found")
    return obj

@router.patch("/classes/{class_id}", response_model=ClassOut, dependencies=[admin_only])
def update_class_ep(class_id: int, data: ClassUpdate, db: DbSession):
    obj = get_class(db, class_id)
    if not obj: raise HTTPException(404, "Not found")
    return update_class(db, obj, data)

@router.delete("/classes/{class_id}", status_code=204, dependencies=[admin_only])
def delete_class_ep(class_id: int, db: DbSession):
    obj = get_class(db, class_id)
    if not obj: raise HTTPException(404, "Not found")
    delete_class(db, obj)


# ----- Section -----
@router.get("/sections", response_model=list[SectionOut])
def list_sections(db: DbSession, _: CurrentUser):
    return get_sections(db)

@router.post("/sections", response_model=SectionOut, status_code=201, dependencies=[admin_only])
def create_section_ep(data: SectionCreate, db: DbSession):
    return create_section(db, data)

@router.get("/sections/{section_id}", response_model=SectionOut)
def get_section_ep(section_id: int, db: DbSession, _: CurrentUser):
    obj = get_section(db, section_id)
    if not obj: raise HTTPException(404, "Not found")
    return obj

@router.patch("/sections/{section_id}", response_model=SectionOut, dependencies=[admin_only])
def update_section_ep(section_id: int, data: SectionUpdate, db: DbSession):
    obj = get_section(db, section_id)
    if not obj: raise HTTPException(404, "Not found")
    return update_section(db, obj, data)

@router.delete("/sections/{section_id}", status_code=204, dependencies=[admin_only])
def delete_section_ep(section_id: int, db: DbSession):
    obj = get_section(db, section_id)
    if not obj: raise HTTPException(404, "Not found")
    delete_section(db, obj)
