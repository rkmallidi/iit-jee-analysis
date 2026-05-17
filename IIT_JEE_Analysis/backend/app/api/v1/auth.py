"""Auth endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, DbSession
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.crud.user import get_user, get_user_by_username
from app.schemas.auth import LoginRequest, RefreshRequest, TokenResponse
from app.schemas.user import UserOut
from app.models.mapping import DeanBranch, PrincipalBranch, VicePrincipalBranch, OperatorBranch, FacultySection

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: DbSession):
    user = get_user_by_username(db, payload.username)
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    roles = [ur.role.name for ur in user.user_roles]
    return TokenResponse(
        access_token=create_access_token(user.id, {"roles": roles, "username": user.username}),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(payload: RefreshRequest, db: DbSession):
    data = decode_token(payload.refresh_token)
    if not data or data.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    user = get_user(db, int(data["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    roles = [ur.role.name for ur in user.user_roles]
    return TokenResponse(
        access_token=create_access_token(user.id, {"roles": roles, "username": user.username}),
        refresh_token=create_refresh_token(user.id),
    )


@router.get("/me", response_model=UserOut)
def me(current_user: CurrentUser):
    return current_user


@router.get("/me/context")
def me_context(current_user: CurrentUser, db: DbSession):
    """Return the calling user's branch IDs based on their role mappings."""
    uid = current_user.id
    role_names = {ur.role.name for ur in current_user.user_roles}

    branch_ids: list[int] = []

    if "Dean" in role_names:
        rows = db.scalars(select(DeanBranch).where(DeanBranch.user_id == uid)).all()
        branch_ids = [r.branch_id for r in rows]
    elif "Principal" in role_names:
        rows = db.scalars(select(PrincipalBranch).where(PrincipalBranch.user_id == uid)).all()
        branch_ids = [r.branch_id for r in rows]
    elif "Vice-Principal" in role_names:
        rows = db.scalars(select(VicePrincipalBranch).where(VicePrincipalBranch.user_id == uid)).all()
        branch_ids = [r.branch_id for r in rows]
    elif "Operator" in role_names:
        rows = db.scalars(select(OperatorBranch).where(OperatorBranch.user_id == uid)).all()
        branch_ids = [r.branch_id for r in rows]
    elif "Faculty" in role_names:
        rows = db.scalars(select(FacultySection).where(FacultySection.user_id == uid)).all()
        branch_ids = list({r.branch_id for r in rows})

    return {
        "user_id":    uid,
        "roles":      list(role_names),
        "branch_ids": branch_ids,
        "is_admin":   "Admin" in role_names,
    }
