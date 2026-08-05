from fastapi import APIRouter

api_router = APIRouter()

# Example of how routers will be included later:
# from app.auth.router import router as auth_router
# api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
