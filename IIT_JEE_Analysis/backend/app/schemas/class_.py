"""Class schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ClassBase(BaseModel):
    name: str
    is_active: bool = True


class ClassCreate(ClassBase):
    pass


class ClassUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None


class ClassOut(ClassBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
