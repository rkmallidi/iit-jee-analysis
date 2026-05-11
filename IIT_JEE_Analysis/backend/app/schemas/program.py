"""Program schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ProgramBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    is_active: bool = True


class ProgramCreate(ProgramBase):
    pass


class ProgramUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ProgramOut(ProgramBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
