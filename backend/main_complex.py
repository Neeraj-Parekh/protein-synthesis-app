"""
Main FastAPI application for Protein Synthesis Web Application
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
import uvicorn
import os

# Import routers
from routers import auth, proteins, ai_models, analysis, export, users, real_ai_models, large_ai_models
from database import init_database
from middleware.error_handler import ErrorHandlingMiddleware

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Protein Synthesis Web Application API",
    description="""
    A comprehensive API for protein visualization, analysis, and AI-powered generation.

    ## Features

    * **Protein Management**: Upload, store, and manage protein structures
    * **AI Generation**: Generate novel proteins using state-of-the-art AI models
    * **Analysis Tools**: Chemical properties, sequence analysis, and structural comparison
    * **Authentication**: Secure user authentication and authorization
    * **Real-time Collaboration**: WebSocket support for collaborative features

    ## Authentication

    Most endpoints require authentication. Use the `/auth/login` endpoint to obtain an access token,
    then include it in the Authorization header as `Bearer <token>`.

    ## Rate Limiting

    API requests are rate-limited to prevent abuse. Check the response headers for rate limit information.

    ## File Upload

    Supported formats: PDB, FASTA, CIF, MMTF
    Maximum file size: 100MB
    """,
    version="2.0.0",
    contact={
        "name": "Protein Synthesis Team",
        "email": "support@proteinsynth.com",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Add middleware
app.add_middleware(ErrorHandlingMiddleware)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    init_database()
    print("Application startup complete - database initialized")

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    return response

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173,http://localhost:5174").split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
    expose_headers=["Content-Type", "X-Total-Count"]
)

# Include routers with proper prefix
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(proteins.router, prefix="/proteins", tags=["proteins"])
app.include_router(ai_models.router, prefix="/ai-models", tags=["ai-models"])
app.include_router(real_ai_models.router, prefix="/ai", tags=["ai"])  # Real AI service with ESM-2
app.include_router(large_ai_models.router, prefix="/large-models", tags=["large-models"])  # Large AI models via Ollama
app.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
app.include_router(export.router, prefix="/export", tags=["export"])
app.include_router(users.router, prefix="/users", tags=["users"])

@app.get("/")
@limiter.limit("10/minute")
async def root(request: Request):
    return {"message": "Protein Synthesis API is running"}

@app.get("/health")
@limiter.limit("30/minute")
async def health_check(request: Request):
    return {"status": "healthy", "version": "2.0.0"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )