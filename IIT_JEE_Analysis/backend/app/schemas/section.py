"""Section schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SectionBase(BaseModel):
    name: str
    is_active: bool = True


class SectionCreate(SectionBase):
    pass


class SectionUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None


class SectionOut(SectionBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
