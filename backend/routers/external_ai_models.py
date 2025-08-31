from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Dict, Any, Optional
import logging
from services.ollama_service import ollama_service
from routers.auth import get_current_user
from models.user import UserDB

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/models", response_model=List[Dict[str, Any]])
async def get_available_models(current_user: UserDB = Depends(get_current_user)):
    """Get list of all available AI models from external storage"""
    try:
        models = ollama_service.get_available_models()
        
        # Add status information
        for model in models:
            model["status"] = "loaded" if ollama_service._is_model_loaded(model["name"]) else "available"
            model["ollama_running"] = ollama_service.is_ollama_running()
        
        return models
    except Exception as e:
        logger.error(f"Error getting available models: {e}")
        raise HTTPException(status_code=500, detail="Failed to get available models")

@router.post("/models/{model_name}/load")
async def load_model(
    model_name: str,
    background_tasks: BackgroundTasks,
    current_user: UserDB = Depends(get_current_user)
):
    """Load a specific model from external storage"""
    try:
        # Find the model in available models
        available_models = ollama_service.get_available_models()
        target_model = next((m for m in available_models if m["name"] == model_name), None)
        
        if not target_model:
            raise HTTPException(status_code=404, detail=f"Model {model_name} not found")
        
        if not target_model["available"]:
            raise HTTPException(status_code=400, detail=f"Model {model_name} is not available")
        
        # Check if already loaded
        if ollama_service._is_model_loaded(model_name):
            return {"message": f"Model {model_name} is already loaded", "status": "loaded"}
        
        # Load model in background
        background_tasks.add_task(load_model_background, model_name)
        
        return {
            "message": f"Loading model {model_name} in background",
            "status": "loading",
            "model_path": target_model["path"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading model {model_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load model: {str(e)}")

async def load_model_background(model_name: str):
    """Background task to load model"""
    try:
        success = ollama_service.load_model(model_name)
        if success:
            logger.info(f"Successfully loaded model {model_name}")
        else:
            logger.error(f"Failed to load model {model_name}")
    except Exception as e:
        logger.error(f"Background loading failed for {model_name}: {e}")

@router.get("/models/status")
async def get_models_status(current_user: UserDB = Depends(get_current_user)):
    """Get current status of models and Ollama service"""
    try:
        ollama_running = ollama_service.is_ollama_running()
        available_models = ollama_service.get_available_models()
        
        loaded_models = []
        if ollama_running:
            loaded_models = ollama_service.get_loaded_models()
        
        return {
            "ollama_running": ollama_running,
            "total_models": len(available_models),
            "available_models": len([m for m in available_models if m["available"]]),
            "loaded_models": loaded_models,
            "external_storage_path": str(ollama_service.external_models_path),
            "external_storage_accessible": ollama_service.external_models_path.exists()
        }
        
    except Exception as e:
        logger.error(f"Error getting models status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get models status")

@router.post("/generate/protein")
async def generate_protein_with_ai(
    request: Dict[str, Any],
    current_user: UserDB = Depends(get_current_user)
):
    """Generate protein sequence using AI models from external storage"""
    try:
        prompt = request.get("prompt", "")
        model_name = request.get("model_name")
        max_length = request.get("max_length", 500)
        
        if not prompt:
            raise HTTPException(status_code=400, detail="Prompt is required")
        
        # Check if Ollama is running, try to start if not
        if not ollama_service.is_ollama_running():
            logger.info("Ollama not running, attempting to start...")
            if not ollama_service.start_ollama_service():
                raise HTTPException(
                    status_code=503, 
                    detail="Ollama service is not running and failed to start. Please start Ollama manually."
                )
        
        # Generate protein sequence
        result = await ollama_service.generate_protein_sequence(
            prompt=prompt,
            model_name=model_name,
            max_length=max_length
        )
        
        if result["success"]:
            return {
                "sequence": result["sequence"],
                "raw_response": result.get("raw_response", ""),
                "model_used": result["model_used"],
                "metadata": result["metadata"],
                "generated_by": "external_ai_model"
            }
        else:
            return {
                "sequence": result["fallback_sequence"],
                "error": result["error"],
                "model_used": result.get("model_used", "fallback"),
                "generated_by": "fallback",
                "warning": "AI generation failed, using fallback sequence"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating protein with AI: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate protein: {str(e)}")

@router.get("/external-storage/info")
async def get_external_storage_info(current_user: UserDB = Depends(get_current_user)):
    """Get information about external storage and available models"""
    try:
        storage_path = ollama_service.external_models_path
        
        info = {
            "path": str(storage_path),
            "exists": storage_path.exists(),
            "accessible": False,
            "total_size": 0,
            "model_count": 0,
            "model_types": {},
            "protein_models": [],
            "ollama_models": []
        }
        
        if storage_path.exists():
            try:
                info["accessible"] = True
                
                # Check protein models
                protein_models_path = storage_path / "protein-models"
                if protein_models_path.exists():
                    for model_dir in protein_models_path.iterdir():
                        if model_dir.is_dir() and model_dir.name != "tools":
                            size = ollama_service._calculate_dir_size(model_dir)
                            info["protein_models"].append({
                                "name": model_dir.name,
                                "path": str(model_dir),
                                "size": size
                            })
                            info["total_size"] += size
                
                # Check Ollama models
                manifest_path = storage_path / "manifests" / "registry.ollama.ai" / "library"
                if manifest_path.exists():
                    for model_dir in manifest_path.iterdir():
                        if model_dir.is_dir():
                            size = ollama_service._calculate_dir_size(model_dir)
                            info["ollama_models"].append({
                                "name": model_dir.name,
                                "path": str(model_dir),
                                "size": size
                            })
                            info["total_size"] += size
                
                info["model_count"] = len(info["protein_models"]) + len(info["ollama_models"])
                info["model_types"] = {
                    "protein_models": len(info["protein_models"]),
                    "ollama_models": len(info["ollama_models"])
                }
                        
            except Exception as e:
                info["error"] = f"Error accessing storage: {str(e)}"
                logger.error(f"Error accessing external storage: {e}")
        
        return info
        
    except Exception as e:
        logger.error(f"Error getting external storage info: {e}")
        raise HTTPException(status_code=500, detail="Failed to get storage info")

@router.post("/ollama/start")
async def start_ollama_service(current_user: UserDB = Depends(get_current_user)):
    """Start Ollama service with external models"""
    try:
        if ollama_service.is_ollama_running():
            return {"message": "Ollama service is already running", "status": "running"}
        
        success = ollama_service.start_ollama_service()
        if success:
            return {"message": "Ollama service started successfully", "status": "started"}
        else:
            raise HTTPException(status_code=500, detail="Failed to start Ollama service")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting Ollama service: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start Ollama: {str(e)}")
