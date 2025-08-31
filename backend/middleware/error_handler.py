"""
Error handling middleware for consistent error responses
"""
import logging
import traceback
from typing import Union
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Middleware to handle errors consistently across the application"""
    
    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.time()
        
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            response.headers["X-Process-Time"] = str(process_time)
            return response
            
        except HTTPException as exc:
            logger.warning(f"HTTP Exception: {exc.status_code} - {exc.detail}")
            return JSONResponse(
                status_code=exc.status_code,
                content={
                    "error": True,
                    "message": exc.detail,
                    "status_code": exc.status_code,
                    "timestamp": time.time()
                }
            )
            
        except RequestValidationError as exc:
            logger.warning(f"Validation Error: {exc.errors()}")
            return JSONResponse(
                status_code=422,
                content={
                    "error": True,
                    "message": "Validation failed",
                    "details": exc.errors(),
                    "status_code": 422,
                    "timestamp": time.time()
                }
            )
            
        except Exception as exc:
            logger.error(f"Unhandled exception: {str(exc)}")
            logger.error(traceback.format_exc())
            
            return JSONResponse(
                status_code=500,
                content={
                    "error": True,
                    "message": "Internal server error",
                    "status_code": 500,
                    "timestamp": time.time()
                }
            )

def create_error_response(
    status_code: int,
    message: str,
    details: Union[dict, list, None] = None
) -> JSONResponse:
    """Create a standardized error response"""
    content = {
        "error": True,
        "message": message,
        "status_code": status_code,
        "timestamp": time.time()
    }
    
    if details:
        content["details"] = details
        
    return JSONResponse(status_code=status_code, content=content)

def create_success_response(
    data: Union[dict, list],
    message: str = "Success",
    status_code: int = 200
) -> JSONResponse:
    """Create a standardized success response"""
    content = {
        "error": False,
        "message": message,
        "data": data,
        "status_code": status_code,
        "timestamp": time.time()
    }
    
    return JSONResponse(status_code=status_code, content=content)

# Custom exception classes
class AuthenticationError(HTTPException):
    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(status_code=401, detail=detail)

class AuthorizationError(HTTPException):
    def __init__(self, detail: str = "Insufficient permissions"):
        super().__init__(status_code=403, detail=detail)

class ValidationError(HTTPException):
    def __init__(self, detail: str = "Validation failed"):
        super().__init__(status_code=422, detail=detail)

class NotFoundError(HTTPException):
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(status_code=404, detail=detail)

class ConflictError(HTTPException):
    def __init__(self, detail: str = "Resource conflict"):
        super().__init__(status_code=409, detail=detail)

class RateLimitError(HTTPException):
    def __init__(self, detail: str = "Rate limit exceeded"):
        super().__init__(status_code=429, detail=detail)
