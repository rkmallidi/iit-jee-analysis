"""Aggregate v1 router."""
from fastapi import APIRouter

from app.api.v1 import auth, entities, mappings, users

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(entities.router)
api_router.include_router(mappings.router)
