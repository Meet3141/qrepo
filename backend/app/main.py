from fastapi import FastAPI
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
import logging

from app.api.router import api_router
from app.document import models as document_models # Register models for SQLAlchemy
from app.core.exceptions import global_exception_handler, app_exception_handler, validation_exception_handler, AppException

# Pre-load models into SQLAlchemy registry
from app.auth.models import User, Role
from app.subject.models import Subject, Unit
from app.ai import models as ai_models  # noqa: F401  (AI generations, drafts, feedback)

from contextlib import asynccontextmanager
from app.ai import get_provider

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-warm the AI provider on startup to catch config errors early
    try:
        provider = get_provider()
        logger.info("AI provider ready: %r (model=%s)", provider.name, provider.model)
    except Exception as exc:
        logger.warning("AI provider not configured at startup: %s", exc)
    yield

logger = logging.getLogger("qrepo")

app = FastAPI(title="QRepo API", lifespan=lifespan)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
app.add_exception_handler(Exception, global_exception_handler)
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

# Routers
app.include_router(api_router, prefix="/api/v1")

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(content=b"", media_type="image/x-icon")







