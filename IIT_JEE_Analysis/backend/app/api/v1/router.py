"""Aggregate v1 router."""
from fastapi import APIRouter

from app.api.v1 import academic_year, analytics, auth, entities, exams, mappings, students, users

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(entities.router)
api_router.include_router(academic_year.router)
api_router.include_router(mappings.router)
api_router.include_router(students.router)
api_router.include_router(exams.router)
api_router.include_router(analytics.router)
