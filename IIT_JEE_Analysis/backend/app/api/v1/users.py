"""User management endpoints."""
import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

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

AVATAR_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads", "avatars")
os.makedirs(AVATAR_DIR, exist_ok=True)

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


@router.post("/{user_id}/avatar", response_model=UserOut, dependencies=[admin_only])
async def upload_avatar(user_id: int, db: DbSession, file: UploadFile = File(...)):
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be an image")

    ext = os.path.splitext(file.filename or "")[1] or ".jpg"
    filename = f"{user_id}_{uuid.uuid4().hex}{ext}"
    path = os.path.join(AVATAR_DIR, filename)

    # Remove old avatar file if it exists
    if user.avatar_url:
        old_filename = user.avatar_url.split("/")[-1]
        old_path = os.path.join(AVATAR_DIR, old_filename)
        if os.path.exists(old_path):
            os.remove(old_path)

    contents = await file.read()
    with open(path, "wb") as f:
        f.write(contents)

    from app.schemas.user import UserUpdate as UU
    return update_user(db, user, UU(avatar_url=f"/uploads/avatars/{filename}"))


@router.get("/avatars/{filename}")
def serve_avatar(filename: str):
    path = os.path.join(AVATAR_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(path)
