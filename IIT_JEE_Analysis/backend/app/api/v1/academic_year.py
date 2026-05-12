"""Academic Year endpoints."""
from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import CurrentUser, DbSession, require_roles
from app.crud.academic_year import (
    create_academic_year,
    delete_academic_year,
    get_academic_year,
    get_academic_years,
    get_current_academic_year,
    set_current_academic_year,
    update_academic_year,
)
from app.models.user import RoleName
from app.schemas.academic_year import AcademicYearCreate, AcademicYearOut, AcademicYearUpdate

router = APIRouter(prefix="/academic-years", tags=["academic-years"])
admin_only = Depends(require_roles(RoleName.ADMIN))


@router.get("", response_model=list[AcademicYearOut])
def list_academic_years(db: DbSession, _: CurrentUser):
    return get_academic_years(db)


@router.get("/current", response_model=AcademicYearOut)
def current_academic_year(db: DbSession, _: CurrentUser):
    obj = get_current_academic_year(db)
    if not obj:
        raise HTTPException(404, "No current academic year set")
    return obj


@router.post("", response_model=AcademicYearOut, status_code=201, dependencies=[admin_only])
def create_year(data: AcademicYearCreate, db: DbSession):
    return create_academic_year(db, data)


@router.patch("/{year_id}", response_model=AcademicYearOut, dependencies=[admin_only])
def update_year(year_id: int, data: AcademicYearUpdate, db: DbSession):
    obj = get_academic_year(db, year_id)
    if not obj:
        raise HTTPException(404, "Not found")
    return update_academic_year(db, obj, data)


@router.post("/{year_id}/set-current", response_model=AcademicYearOut, dependencies=[admin_only])
def set_current(year_id: int, db: DbSession):
    obj = get_academic_year(db, year_id)
    if not obj:
        raise HTTPException(404, "Not found")
    return set_current_academic_year(db, obj)


@router.delete("/{year_id}", status_code=204, dependencies=[admin_only])
def delete_year(year_id: int, db: DbSession):
    obj = get_academic_year(db, year_id)
    if not obj:
        raise HTTPException(404, "Not found")
    if obj.is_current:
        raise HTTPException(400, "Cannot delete the current academic year")
    delete_academic_year(db, obj)
