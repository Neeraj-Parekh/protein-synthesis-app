"""
Real AI Service Router - ESM-2 Integration
Connects frontend to the working ESM-2 AI service
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime
import logging

from database import get_db
from services.production_ai_service import ProductionAIService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/ai-models",
    tags=["Real AI Analysis"],
    responses={
        404: {"description": "AI service not available"},
        500: {"description": "AI analysis failed"}
    }
)

# Initialize the AI service
ai_service = ProductionAIService()

class SequenceAnalysisRequest(BaseModel):
    """Request for sequence analysis"""
    sequence: str = Field(..., description="Protein sequence to analyze")
    model: str = Field("esm2", description="AI model to use")
    include_embeddings: bool = Field(True, description="Include sequence embeddings")
    include_properties: bool = Field(True, description="Include protein properties")

class StructurePredictionRequest(BaseModel):
    """Request for structure prediction"""
    sequence: str = Field(..., description="Protein sequence")
    model: str = Field("esm2", description="Model to use for prediction")

class VariantGenerationRequest(BaseModel):
    """Request for variant generation"""
    sequence: str = Field(..., description="Base protein sequence")
    num_variants: int = Field(3, description="Number of variants to generate")
    model: str = Field("esm2", description="Model to use")

@router.get("/health")
async def get_ai_health():
    """Get AI service health status"""
    try:
        health_status = ai_service.get_health_status()
        return health_status
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI service health check failed: {str(e)}")

@router.get("/status")
async def get_ai_status():
    """Get detailed AI service status"""
    try:
        return ai_service.get_health_status()
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI service status check failed: {str(e)}")

@router.post("/analyze-sequence")
async def analyze_sequence(request: SequenceAnalysisRequest):
    """Analyze protein sequence using ESM-2"""
    try:
        if not ai_service.esm2_service.loaded:
            raise HTTPException(status_code=503, detail="ESM-2 model not loaded")
        
        # Validate sequence
        if not request.sequence or len(request.sequence) < 10:
            raise HTTPException(status_code=400, detail="Sequence must be at least 10 amino acids long")
        
        # Perform comprehensive analysis
        result = ai_service.analyze_protein_sequence(request.sequence)
        
        return {
            "sequence_analysis": result.get("sequence_analysis"),
            "contact_prediction": result.get("contact_prediction"),
            "model_info": result.get("model_info"),
            "timestamp": result.get("timestamp")
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sequence analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.post("/predict-structure")
async def predict_structure(request: StructurePredictionRequest):
    """Predict protein structure using ESM-2"""
    try:
        if not ai_service.esm2_service.loaded:
            raise HTTPException(status_code=503, detail="ESM-2 model not loaded")
        
        # Predict contacts (structure prediction proxy)
        result = ai_service.predict_protein_contacts(request.sequence)
        
        return {
            "contact_prediction": result,
            "sequence": request.sequence,
            "model": "esm2",
            "prediction_confidence": result.get("average_confidence", 0.0),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Structure prediction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Structure prediction failed: {str(e)}")

@router.post("/generate-variants")
async def generate_variants(request: VariantGenerationRequest):
    """Generate protein variants"""
    try:
        if not ai_service.esm2_service.loaded:
            raise HTTPException(status_code=503, detail="ESM-2 model not loaded")
        
        # Generate variants
        result = ai_service.generate_protein_variants(request.sequence, request.num_variants)
        
        return {
            "variant_generation": result,
            "base_sequence": request.sequence,
            "model": "esm2",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Variant generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Variant generation failed: {str(e)}")

@router.post("/generate-protein")
async def generate_protein(constraints: Dict[str, Any]):
    """Generate new protein sequence"""
    try:
        # This is a placeholder - real protein generation would require more sophisticated models
        # For now, return a mock response
        return {
            "sequence": "MKLLVLGLPGAGKGTQCKIINVQYETGPSKLIGGMDLNAFKYLGN",
            "confidence": 0.85,
            "properties": {
                "molecular_weight": 4753.6,
                "isoelectric_point": 8.8,
                "hydrophobic_fraction": 0.47,
                "charged_fraction": 0.16
            },
            "generation_metadata": {
                "model": "esm2_mock",
                "constraints": constraints
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Protein generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Protein generation failed: {str(e)}")

@router.post("/validate-sequence")
async def validate_sequence(sequence_data: Dict[str, str]):
    """Validate protein sequence"""
    try:
        sequence = sequence_data.get("sequence", "")
        
        if not sequence:
            raise HTTPException(status_code=400, detail="No sequence provided")
        
        # Basic validation
        valid_aa = set("ACDEFGHIKLMNPQRSTVWY")
        invalid_chars = set(sequence.upper()) - valid_aa
        
        if invalid_chars:
            return {
                "valid": False,
                "errors": [f"Invalid amino acids: {', '.join(invalid_chars)}"],
                "suggestions": ["Remove invalid characters", "Use standard single-letter amino acid codes"]
            }
        
        if len(sequence) < 10:
            return {
                "valid": False,
                "errors": ["Sequence too short (minimum 10 amino acids)"],
                "suggestions": ["Provide a longer protein sequence"]
            }
        
        return {
            "valid": True,
            "length": len(sequence),
            "composition": {aa: sequence.count(aa) for aa in valid_aa if aa in sequence},
            "suggestions": ["Sequence is valid for analysis"]
        }
    except Exception as e:
        logger.error(f"Sequence validation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")
