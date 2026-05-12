"""User and Role schemas."""
import json
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, field_validator, model_validator

from app.models.user import RoleName


# ----------- Role -----------

class RoleOut(BaseModel):
    id: int
    name: RoleName
    description: Optional[str] = None

    model_config = {"from_attributes": True}


# ----------- User -----------

class UserBase(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    full_name: str
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    is_active: bool = True


class UserCreate(UserBase):
    password: str
    role_ids: list[int] = []

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
    role_ids: Optional[list[int]] = None


class UserThemeUpdate(BaseModel):
    theme_prefs: dict[str, Any]


class UserOut(UserBase):
    id: int
    created_at: datetime
    roles: list[RoleOut] = []
    theme_prefs: Optional[dict[str, Any]] = None

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def extract_roles_and_theme(cls, data: Any) -> Any:
        # ORM object
        if hasattr(data, "user_roles"):
            data.__dict__.setdefault("roles", [ur.role for ur in data.user_roles])
        if hasattr(data, "theme_prefs") and isinstance(data.theme_prefs, str):
            try:
                data.__dict__["theme_prefs"] = json.loads(data.theme_prefs)
            except Exception:
                data.__dict__["theme_prefs"] = None
        return data
