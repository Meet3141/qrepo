from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging
from app.shared.responses import APIResponse

logger = logging.getLogger("qrepo")

class AppException(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code

async def app_exception_handler(request: Request, exc: AppException):
    logger.warning(f"AppException on {request.url.path}: {exc.message}")
    response = APIResponse(success=False, message=exc.message)
    return JSONResponse(status_code=exc.status_code, content=response.model_dump())

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error on {request.url.path}: {exc.errors()}")
    response = APIResponse(success=False, message="Validation error", data={"errors": exc.errors()})
    return JSONResponse(status_code=422, content=response.model_dump())

async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    response = APIResponse(success=False, message="Internal server error")
    return JSONResponse(status_code=500, content=response.model_dump())
