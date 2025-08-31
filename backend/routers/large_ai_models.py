"""
Router for Ollama-based Large AI Models
Provides endpoints for ESM3, RFdiffusion, and OpenFold models
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
import logging

from services.ollama_ai_service import ollama_service
from models.user import UserDB
from routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/large-models", tags=["Large AI Models"])

# Request Models
class SequenceAnalysisRequest(BaseModel):
    sequence: str = Field(..., description="Protein sequence to analyze")
    model: str = Field(default="esm3", description="Model to use (esm3, openfold, rfdiffusion)")
    options: Optional[Dict[str, Any]] = Field(default=None, description="Additional model options")

class StructurePredictionRequest(BaseModel):
    sequence: str = Field(..., description="Protein sequence for structure prediction")
    model: str = Field(default="openfold", description="Model to use for prediction")
    confidence_threshold: float = Field(default=0.7, description="Minimum confidence threshold")

class ProteinDesignRequest(BaseModel):
    target_function: str = Field(..., description="Target protein function")
    constraints: Optional[Dict[str, Any]] = Field(default=None, description="Design constraints")
    length_range: Optional[List[int]] = Field(default=None, description="[min_length, max_length]")

# Response Models
class ModelStatus(BaseModel):
    model_name: str
    available: bool
    loaded: bool
    capabilities: List[str]
    max_sequence_length: int

class AnalysisResponse(BaseModel):
    success: bool
    model_used: str
    result: Dict[str, Any]
    processing_time: Optional[float] = None
    confidence: Optional[float] = None

@router.get("/health")
async def check_health():
    """Check if Ollama service is running and accessible"""
    try:
        is_healthy = await ollama_service.check_ollama_health()
        available_models = await ollama_service.list_available_models()
        
        return {
            "status": "healthy" if is_healthy else "unhealthy",
            "ollama_running": is_healthy,
            "available_models": len(available_models),
            "models": [m.get("name", "unknown") for m in available_models]
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@router.get("/models")
async def list_models():
    """List all available large AI models and their capabilities"""
    try:
        model_info = ollama_service.get_model_info()
        ollama_models = await ollama_service.list_available_models()
        
        # Add loading status to model info
        loaded_models = {m.get("name", "").split(":")[0] for m in ollama_models}
        
        for key, info in model_info.items():
            ollama_name = ollama_service.models[key].ollama_name
            info["loaded"] = ollama_name in loaded_models
            info["available"] = True
        
        return {
            "models": model_info,
            "ollama_status": len(ollama_models) > 0
        }
    except Exception as e:
        logger.error(f"Failed to list models: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list models: {str(e)}")

@router.post("/models/{model_key}/load")
async def load_model(
    model_key: str,
    current_user: UserDB = Depends(get_current_user)
):
    """Load a specific model into Ollama"""
    try:
        if model_key not in ollama_service.models:
            raise HTTPException(status_code=404, detail=f"Model {model_key} not found")
        
        success = await ollama_service.ensure_model_loaded(model_key)
        
        if success:
            return {
                "success": True,
                "message": f"Model {model_key} loaded successfully",
                "model": ollama_service.models[model_key].name
            }
        else:
            raise HTTPException(status_code=500, detail=f"Failed to load model {model_key}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading model {model_key}: {e}")
        raise HTTPException(status_code=500, detail=f"Error loading model: {str(e)}")

@router.post("/analyze-sequence", response_model=AnalysisResponse)
async def analyze_sequence(
    request: SequenceAnalysisRequest,
    current_user: UserDB = Depends(get_current_user)
):
    """Analyze protein sequence using large AI models"""
    try:
        if not request.sequence or len(request.sequence.strip()) == 0:
            raise HTTPException(status_code=400, detail="Sequence cannot be empty")
        
        # Validate sequence (basic check for amino acids)
        valid_aa = set("ACDEFGHIKLMNPQRSTVWY")
        if not all(aa.upper() in valid_aa for aa in request.sequence.replace("X", "")):
            raise HTTPException(status_code=400, detail="Invalid amino acid sequence")
        
        # Perform analysis
        async with ollama_service:
            result = await ollama_service.analyze_protein_sequence(
                request.sequence, 
                request.model
            )
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return AnalysisResponse(
            success=True,
            model_used=request.model,
            result=result,
            processing_time=result.get("total_duration", 0) / 1000000000  # Convert to seconds
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sequence analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.post("/predict-structure", response_model=AnalysisResponse)
async def predict_structure(
    request: StructurePredictionRequest,
    current_user: UserDB = Depends(get_current_user)
):
    """Predict protein structure using large AI models"""
    try:
        if not request.sequence or len(request.sequence.strip()) == 0:
            raise HTTPException(status_code=400, detail="Sequence cannot be empty")
        
        # Validate sequence
        valid_aa = set("ACDEFGHIKLMNPQRSTVWY")
        if not all(aa.upper() in valid_aa for aa in request.sequence.replace("X", "")):
            raise HTTPException(status_code=400, detail="Invalid amino acid sequence")
        
        # Perform structure prediction
        async with ollama_service:
            result = await ollama_service.predict_structure(
                request.sequence,
                request.model
            )
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return AnalysisResponse(
            success=True,
            model_used=request.model,
            result=result,
            processing_time=result.get("total_duration", 0) / 1000000000
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Structure prediction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@router.post("/design-protein", response_model=AnalysisResponse)
async def design_protein(
    request: ProteinDesignRequest,
    current_user: UserDB = Depends(get_current_user)
):
    """Design a new protein using RFdiffusion"""
    try:
        if not request.target_function or len(request.target_function.strip()) == 0:
            raise HTTPException(status_code=400, detail="Target function cannot be empty")
        
        # Add length constraints if provided
        constraints = request.constraints or {}
        if request.length_range:
            constraints["length_range"] = request.length_range
        
        # Perform protein design
        async with ollama_service:
            result = await ollama_service.design_protein(
                request.target_function,
                constraints
            )
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return AnalysisResponse(
            success=True,
            model_used="rfdiffusion",
            result=result,
            processing_time=result.get("total_duration", 0) / 1000000000
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Protein design failed: {e}")
        raise HTTPException(status_code=500, detail=f"Design failed: {str(e)}")

@router.post("/custom-prompt")
async def custom_prompt(
    model_key: str,
    prompt: str,
    options: Optional[Dict[str, Any]] = None,
    current_user: UserDB = Depends(get_current_user)
):
    """Send a custom prompt to any available model"""
    try:
        if model_key not in ollama_service.models:
            raise HTTPException(status_code=404, detail=f"Model {model_key} not found")
        
        if not prompt or len(prompt.strip()) == 0:
            raise HTTPException(status_code=400, detail="Prompt cannot be empty")
        
        # Send custom prompt
        async with ollama_service:
            result = await ollama_service.generate_response(
                model_key,
                prompt,
                **(options or {})
            )
        
        if result and "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return {
            "success": True,
            "model": model_key,
            "response": result.get("response", "") if result else "",
            "processing_time": result.get("total_duration", 0) / 1000000000 if result else 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Custom prompt failed: {e}")
        raise HTTPException(status_code=500, detail=f"Custom prompt failed: {str(e)}")

@router.get("/models/{model_key}/status")
async def get_model_status(model_key: str):
    """Get detailed status of a specific model"""
    try:
        if model_key not in ollama_service.models:
            raise HTTPException(status_code=404, detail=f"Model {model_key} not found")
        
        model_config = ollama_service.models[model_key]
        ollama_models = await ollama_service.list_available_models()
        
        is_loaded = any(
            m.get("name", "").startswith(model_config.ollama_name) 
            for m in ollama_models
        )
        
        return ModelStatus(
            model_name=model_config.name,
            available=True,
            loaded=is_loaded,
            capabilities=model_config.capabilities,
            max_sequence_length=model_config.max_sequence_length
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get model status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")
