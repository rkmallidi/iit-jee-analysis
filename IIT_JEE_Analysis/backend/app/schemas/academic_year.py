"""Academic Year schemas."""
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class AcademicYearCreate(BaseModel):
    name: str
    start_date: date
    end_date: date
    is_current: bool = False


class AcademicYearUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: Optional[bool] = None


class AcademicYearOut(BaseModel):
    id: int
    name: str
    start_date: date
    end_date: date
    is_current: bool
    created_at: datetime

    model_config = {"from_attributes": True}
