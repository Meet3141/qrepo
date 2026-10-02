from fastapi import APIRouter
from app.auth.router import router as auth_router
from app.subject.router import subject_router, unit_router
from app.document.router import document_router, unit_document_router
from app.ai.router import ai_router
from app.users.router import users_router, roles_router
from app.department.router import departments_router, faculty_router
from app.permissions.router import permissions_router
from app.papers.router import papers_router
from app.analytics.router import analytics_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(subject_router, prefix="/subjects", tags=["subjects"])
api_router.include_router(unit_router, prefix="/units", tags=["units"])
api_router.include_router(unit_document_router, prefix="/units", tags=["documents"])
api_router.include_router(document_router, prefix="/documents", tags=["documents"])
api_router.include_router(ai_router, prefix="/ai", tags=["ai"])
api_router.include_router(users_router, prefix="/users", tags=["users"])
api_router.include_router(roles_router, prefix="/roles", tags=["users"])
api_router.include_router(departments_router, prefix="/departments", tags=["departments"])
api_router.include_router(faculty_router, prefix="/faculty", tags=["departments"])
api_router.include_router(permissions_router, prefix="/permissions", tags=["permissions"])
api_router.include_router(papers_router, prefix="/papers", tags=["papers"])
api_router.include_router(analytics_router, prefix="/analytics", tags=["analytics"])
