"""User management endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import CurrentUser, DbSession, require_roles
from app.crud.user import (
    create_user,
    delete_user,
    get_roles,
    get_user,
    get_users,
    update_user,
    update_user_theme,
)
from app.models.user import RoleName
from app.schemas.user import RoleOut, UserCreate, UserOut, UserThemeUpdate, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])

admin_only = Depends(require_roles(RoleName.ADMIN))


@router.get("/roles", response_model=list[RoleOut])
def list_roles(db: DbSession, _: CurrentUser):
    return get_roles(db)


@router.get("", response_model=list[UserOut], dependencies=[admin_only])
def list_users(db: DbSession, skip: int = 0, limit: int = 100):
    return get_users(db, skip=skip, limit=limit)


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED, dependencies=[admin_only])
def create_user_endpoint(data: UserCreate, db: DbSession):
    return create_user(db, data)


@router.get("/{user_id}", response_model=UserOut)
def get_user_endpoint(user_id: int, db: DbSession, current_user: CurrentUser):
    # Allow self-lookup or admin
    roles = {ur.role.name for ur in current_user.user_roles}
    if current_user.id != user_id and RoleName.ADMIN not in roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=UserOut, dependencies=[admin_only])
def update_user_endpoint(user_id: int, data: UserUpdate, db: DbSession):
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return update_user(db, user, data)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[admin_only])
def delete_user_endpoint(user_id: int, db: DbSession):
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    delete_user(db, user)


@router.patch("/me/theme", response_model=UserOut)
def update_my_theme(data: UserThemeUpdate, db: DbSession, current_user: CurrentUser):
    return update_user_theme(db, current_user, data.theme_prefs)
