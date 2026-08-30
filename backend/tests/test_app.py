from app.main import app
from fastapi import APIRouter, Depends
from app.api.dependencies import RequireRole
from app.auth.constants import ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY, ROLE_STUDENT

router = APIRouter()

@router.get("/admin")
def ta(user=Depends(RequireRole([ROLE_ADMIN]))): return "OK"

@router.get("/hod")
def th(user=Depends(RequireRole([ROLE_HOD]))): return "OK"

@router.get("/faculty")
def tf(user=Depends(RequireRole([ROLE_FACULTY]))): return "OK"

@router.get("/student")
def ts(user=Depends(RequireRole([ROLE_STUDENT]))): return "OK"

app.include_router(router, prefix="/api/v1/test_rbac")
