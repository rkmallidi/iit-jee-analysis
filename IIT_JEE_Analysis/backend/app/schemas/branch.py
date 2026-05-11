"""Branch schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class BranchBase(BaseModel):
    name: str
    code: str
    address: Optional[str] = None
    is_active: bool = True


class BranchCreate(BranchBase):
    pass


class BranchUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None


class BranchOut(BranchBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
