"""
Main FastAPI application for Protein Synthesis Web Application
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os

# Import routers
from routers import auth, proteins, ai_models, analysis, export, users, real_ai_models, large_ai_models, external_ai_models
from database import init_database

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

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    init_database()
    print("Application startup complete - database initialized")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:5173", 
        "http://localhost:5174",  # Additional Vite port
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173", 
        "http://127.0.0.1:5174"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Include routers with proper prefix
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(proteins.router, prefix="/proteins", tags=["proteins"])
app.include_router(ai_models.router, prefix="/ai-models", tags=["ai-models"])
app.include_router(real_ai_models.router, prefix="/ai", tags=["ai"])  # Real AI service with ESM-2
app.include_router(large_ai_models.router, prefix="/large-models", tags=["large-models"])  # Large AI models via Ollama
app.include_router(external_ai_models.router, prefix="/external-ai", tags=["external-ai"])  # External AI models from storage
app.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
app.include_router(export.router, prefix="/export", tags=["export"])
app.include_router(users.router, prefix="/users", tags=["users"])

@app.get("/")
async def root():
    return {"message": "Protein Synthesis API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
