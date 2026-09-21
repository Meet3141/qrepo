from fastapi import APIRouter
from app.auth.router import router as auth_router
from app.subject.router import subject_router, unit_router
from app.document.router import document_router, unit_document_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(subject_router, prefix="/subjects", tags=["subjects"])
api_router.include_router(unit_router, prefix="/units", tags=["units"])
api_router.include_router(unit_document_router, prefix="/units", tags=["documents"])
api_router.include_router(document_router, prefix="/documents", tags=["documents"])
