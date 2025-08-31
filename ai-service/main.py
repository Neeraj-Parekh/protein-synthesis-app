"""
FastAPI AI Service for Protein Synthesis Web Application
Provides AI-powered protein generation, optimization, and structure prediction
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn
import logging
import asyncio
from contextlib import asynccontextmanager

from services.model_manager import ModelManager
from services.protein_generator import ProteinGenerator
from services.sequence_optimizer import SequenceOptimizer
from services.structure_predictor import StructurePredictor
from models.requests import (
    GenerationRequest, OptimizationRequest, PredictionRequest
)
from models.responses import (
    GenerationResponse, OptimizationResponse, PredictionResponse,
    ModelStatusResponse, HealthResponse
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global model manager
model_manager = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan - startup and shutdown"""
    global model_manager
    
    # Startup
    logger.info("Starting AI Service...")
    model_manager = ModelManager()
    await model_manager.initialize()
    logger.info("AI Service started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI Service...")
    if model_manager:
        await model_manager.cleanup()
    logger.info("AI Service shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="Protein Synthesis AI Service",
    description="AI-powered protein generation, optimization, and analysis",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    try:
        model_status = await model_manager.get_status() if model_manager else {}
        return HealthResponse(
            status="healthy",
            models_loaded=len(model_status),
            memory_usage=model_manager.get_memory_usage() if model_manager else 0,
            available_models=list(model_status.keys())
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unhealthy")

@app.get("/models/status", response_model=Dict[str, ModelStatusResponse])
async def get_model_status():
    """Get status of all AI models"""
    if not model_manager:
        raise HTTPException(status_code=503, detail="Model manager not initialized")
    
    try:
        return await model_manager.get_status()
    except Exception as e:
        logger.error(f"Failed to get model status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get model status")

@app.post("/models/{model_name}/load")
async def load_model(model_name: str, background_tasks: BackgroundTasks):
    """Load a specific AI model"""
    if not model_manager:
        raise HTTPException(status_code=503, detail="Model manager not initialized")
    
    if model_name not in ["protflash", "protgpt2", "geneverse"]:
        raise HTTPException(status_code=400, detail="Invalid model name")
    
    try:
        background_tasks.add_task(model_manager.load_model, model_name)
        return {"message": f"Loading {model_name} model in background"}
    except Exception as e:
        logger.error(f"Failed to load model {model_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load model: {e}")

@app.post("/models/{model_name}/unload")
async def unload_model(model_name: str):
    """Unload a specific AI model to free memory"""
    if not model_manager:
        raise HTTPException(status_code=503, detail="Model manager not initialized")
    
    try:
        await model_manager.unload_model(model_name)
        return {"message": f"Model {model_name} unloaded successfully"}
    except Exception as e:
        logger.error(f"Failed to unload model {model_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to unload model: {e}")

@app.post("/generate", response_model=GenerationResponse)
async def generate_protein(request: GenerationRequest):
    """Generate a novel protein sequence using AI models"""
    if not model_manager:
        raise HTTPException(status_code=503, detail="Model manager not initialized")
    
    try:
        generator = ProteinGenerator(model_manager)
        result = await generator.generate(request)
        return result
    except Exception as e:
        logger.error(f"Protein generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {e}")

@app.post("/optimize", response_model=OptimizationResponse)
async def optimize_sequence(request: OptimizationRequest):
    """Optimize an existing protein sequence for specific objectives"""
    if not model_manager:
        raise HTTPException(status_code=503, detail="Model manager not initialized")
    
    try:
        optimizer = SequenceOptimizer(model_manager)
        result = await optimizer.optimize(request)
        return result
    except Exception as e:
        logger.error(f"Sequence optimization failed: {e}")
        raise HTTPException(status_code=500, detail=f"Optimization failed: {e}")

@app.post("/predict-structure", response_model=PredictionResponse)
async def predict_structure(request: PredictionRequest):
    """Predict 3D structure from amino acid sequence"""
    if not model_manager:
        raise HTTPException(status_code=503, detail="Model manager not initialized")
    
    try:
        predictor = StructurePredictor(model_manager)
        result = await predictor.predict(request)
        return result
    except Exception as e:
        logger.error(f"Structure prediction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")

@app.post("/validate-sequence")
async def validate_sequence(sequence: str):
    """Validate a protein sequence against known principles"""
    try:
        # Basic validation
        if not sequence or not isinstance(sequence, str):
            raise ValueError("Invalid sequence format")
        
        # Check for valid amino acids
        valid_aa = set("ACDEFGHIKLMNPQRSTVWY")
        invalid_chars = set(sequence.upper()) - valid_aa
        
        if invalid_chars:
            return {
                "valid": False,
                "errors": [f"Invalid amino acids: {', '.join(invalid_chars)}"],
                "score": 0.0
            }
        
        # Additional validation logic would go here
        # For now, return basic validation
        return {
            "valid": True,
            "errors": [],
            "score": 0.85,  # Placeholder score
            "length": len(sequence),
            "composition": {aa: sequence.count(aa) for aa in valid_aa if aa in sequence}
        }
    
    except Exception as e:
        logger.error(f"Sequence validation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Validation failed: {e}")

@app.get("/models/{model_name}/info")
async def get_model_info(model_name: str):
    """Get detailed information about a specific model"""
    if not model_manager:
        raise HTTPException(status_code=503, detail="Model manager not initialized")
    
    try:
        info = await model_manager.get_model_info(model_name)
        return info
    except Exception as e:
        logger.error(f"Failed to get model info for {model_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get model info: {e}")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )