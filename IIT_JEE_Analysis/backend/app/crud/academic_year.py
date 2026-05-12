"""CRUD for AcademicYear."""
from typing import Optional, Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.academic_year import AcademicYear
from app.schemas.academic_year import AcademicYearCreate, AcademicYearUpdate


def get_academic_years(db: Session) -> Sequence[AcademicYear]:
    return db.scalars(select(AcademicYear).order_by(AcademicYear.start_date.desc())).all()


def get_academic_year(db: Session, year_id: int) -> Optional[AcademicYear]:
    return db.get(AcademicYear, year_id)


def get_current_academic_year(db: Session) -> Optional[AcademicYear]:
    return db.scalar(select(AcademicYear).where(AcademicYear.is_current == True))  # noqa: E712


def create_academic_year(db: Session, data: AcademicYearCreate) -> AcademicYear:
    if data.is_current:
        db.execute(
            AcademicYear.__table__.update().values(is_current=False)
        )
    obj = AcademicYear(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_academic_year(db: Session, obj: AcademicYear, data: AcademicYearUpdate) -> AcademicYear:
    updates = data.model_dump(exclude_none=True)
    if updates.get("is_current"):
        db.execute(
            AcademicYear.__table__.update().values(is_current=False)
        )
    for k, v in updates.items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


def set_current_academic_year(db: Session, obj: AcademicYear) -> AcademicYear:
    db.execute(AcademicYear.__table__.update().values(is_current=False))
    obj.is_current = True
    db.commit()
    db.refresh(obj)
    return obj


def delete_academic_year(db: Session, obj: AcademicYear) -> None:
    db.delete(obj)
    db.commit()
