"""
AI model API endpoints for protein generation and optimization
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from database import get_db
from services.ai_service import AIService

router = APIRouter(
    prefix="/ai",
    tags=["AI Models"],
    responses={
        404: {"description": "Not found"},
        500: {"description": "Internal server error"}
    }
)

class GenerationConstraints(BaseModel):
    """Constraints for protein sequence generation"""
    length: Optional[tuple[int, int]] = Field(None, description="Minimum and maximum sequence length")
    composition: Optional[Dict[str, float]] = Field(None, description="Amino acid composition constraints")
    properties: Optional[Dict[str, float]] = Field(None, description="Desired biophysical properties")
    template: Optional[str] = Field(None, description="Template sequence for homology modeling")
    model: str = Field("protflash", description="AI model to use for generation")

class OptimizationRequest(BaseModel):
    """Request for protein sequence optimization"""
    sequence: str = Field(..., description="Input protein sequence to optimize")
    objectives: List[str] = Field(..., description="Optimization objectives (stability, activity, etc.)")
    model: str = Field("protgpt2", description="AI model to use for optimization")

class SequenceRequest(BaseModel):
    """Request model for sequence-based operations"""
    sequence: str = Field(..., description="Protein sequence")

class StabilityRequest(BaseModel):
    """Request model for stability analysis"""
    sequence: str = Field(..., description="Protein sequence to analyze")
    temperature: float = Field(37.0, description="Temperature in Celsius")
    ph: float = Field(7.0, description="pH value")

class DesignRequirements(BaseModel):
    """Requirements for de novo protein design"""
    function: str = Field("enzyme", description="Desired protein function")
    length: Optional[int] = Field(None, description="Target sequence length")
    constraints: Optional[Dict[str, Any]] = Field(None, description="Additional design constraints")
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from database import get_db
from services.ai_service import AIService

router = APIRouter(
    prefix="/ai",
    tags=["AI Models"],
    responses={
        404: {"description": "Not found"},
        500: {"description": "Internal server error"}
    }
)

class GenerationConstraints(BaseModel):
    """Constraints for protein sequence generation"""
    length: Optional[tuple[int, int]] = Field(None, description="Minimum and maximum sequence length")
    composition: Optional[Dict[str, float]] = Field(None, description="Amino acid composition constraints")
    properties: Optional[Dict[str, float]] = Field(None, description="Desired biophysical properties")
    template: Optional[str] = Field(None, description="Template sequence for homology modeling")
    model: str = Field("protflash", description="AI model to use for generation")

class OptimizationRequest(BaseModel):
    """Request for protein sequence optimization"""
    sequence: str = Field(..., description="Input protein sequence to optimize")
    objectives: List[str] = Field(..., description="Optimization objectives (stability, activity, etc.)")
    model: str = Field("protgpt2", description="AI model to use for optimization")

class DesignRequirements(BaseModel):
    """Requirements for de novo protein design"""
    function: str = Field("enzyme", description="Desired protein function")
    length: Optional[int] = Field(None, description="Target sequence length")
    constraints: Optional[Dict[str, Any]] = Field(None, description="Additional design constraints")

@router.post("/generate", summary="Generate Novel Protein Sequence")
async def generate_protein(
    constraints: GenerationConstraints,
    db: Session = Depends(get_db)
):
    """
    Generate a novel protein sequence using advanced AI models.

    This endpoint uses state-of-the-art language models trained on protein sequences
    to generate new protein sequences that meet specified constraints and properties.

    **Parameters:**
    - **constraints**: Generation constraints including length, composition, and properties

    **Returns:**
    - Generated protein sequence with predicted properties
    - Confidence scores and validation metrics

    **Raises:**
    - 500: Generation failed due to model or service issues
    """
    ai_service = AIService()
    try:
        result = await ai_service.generate_protein(constraints.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@router.post("/optimize", summary="Optimize Protein Sequence")
async def optimize_sequence(
    request: OptimizationRequest,
    db: Session = Depends(get_db)
):
    """
    Optimize an existing protein sequence for improved properties.

    Uses AI models to modify the input sequence while maintaining functionality
    but improving desired characteristics like stability, activity, or expression.

    **Parameters:**
    - **request**: Optimization request with sequence and objectives

    **Returns:**
    - Optimized sequence with predicted improvements
    - Comparison metrics between original and optimized sequences

    **Raises:**
    - 500: Optimization failed due to model or service issues
    """
    ai_service = AIService()
    try:
        result = await ai_service.optimize_sequence(
            request.sequence,
            request.objectives,
            request.model
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")

class SequenceRequest(BaseModel):
    """Request model for sequence-based operations"""
    sequence: str = Field(..., description="Protein sequence in single-letter code")

@router.post("/predict-structure", summary="Predict 3D Protein Structure")
async def predict_structure(
    request: SequenceRequest,
    db: Session = Depends(get_db)
):
    """
    Predict 3D structure from amino acid sequence using AI models.

    Employs deep learning models trained on known protein structures to predict
    the three-dimensional conformation of the input sequence.

    **Parameters:**
    - **sequence**: Amino acid sequence in single-letter code

    **Returns:**
    - Predicted 3D structure in PDB format
    - Confidence scores for structural elements
    - Quality metrics (pLDDT, PAE, etc.)

    **Raises:**
    - 500: Structure prediction failed
    """
    ai_service = AIService()
    try:
        result = await ai_service.predict_structure(request.sequence)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Structure prediction failed: {str(e)}")

class SequenceValidationRequest(BaseModel):
    """Request model for sequence validation"""
    sequence: str = Field(..., description="Protein sequence to validate")

@router.post("/validate", summary="Validate Protein Sequence")
async def validate_sequence(
    request: SequenceValidationRequest,
    db: Session = Depends(get_db)
):
    """
    Validate a protein sequence against biophysical and biochemical principles.

    Checks sequence for validity, potential issues, and adherence to natural
    protein design principles.

    **Parameters:**
    - **sequence**: Amino acid sequence to validate

    **Returns:**
    - Validation results with scores and warnings
    - Suggested improvements if issues found

    **Raises:**
    - 500: Validation failed
    """
    ai_service = AIService()
    try:
        result = await ai_service.validate_sequence(request.sequence)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")

@router.get("/models/status", summary="Get AI Model Status")
async def get_model_status():
    """
    Get the current status of loaded AI models.

    Provides information about model availability, memory usage, and performance
    metrics for all active AI models in the service.

    **Returns:**
    - Status of each loaded model
    - Memory usage and performance metrics
    - Model version information

    **Raises:**
    - 500: Status check failed
    """
    ai_service = AIService()
    try:
        status = await ai_service.get_model_status()
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")

@router.post("/analyze-properties", summary="Analyze Protein Properties")
async def analyze_properties(
    request: SequenceRequest,
    db: Session = Depends(get_db)
):
    """
    Analyze biochemical and biophysical properties of a protein sequence.

    Computes various molecular properties including molecular weight, isoelectric point,
    hydrophobicity, secondary structure propensity, and other relevant metrics.

    **Parameters:**
    - **sequence**: Amino acid sequence to analyze

    **Returns:**
    - Comprehensive property analysis
    - Predicted secondary structure
    - Solubility and stability predictions

    **Raises:**
    - 500: Property analysis failed
    """
    ai_service = AIService()
    try:
        result = await ai_service.analyze_properties(request.sequence)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Property analysis failed: {str(e)}")

@router.post("/predict-function", summary="Predict Protein Function")
async def predict_function(
    request: SequenceRequest,
    db: Session = Depends(get_db)
):
    """
    Predict the biological function of a protein from its sequence.

    Uses machine learning models trained on functional annotations to predict
    the most likely biological roles and molecular functions.

    **Parameters:**
    - **sequence**: Amino acid sequence for function prediction

    **Returns:**
    - Predicted molecular functions
    - Biological process predictions
    - Confidence scores for each prediction

    **Raises:**
    - 500: Function prediction failed
    """
    ai_service = AIService()
    try:
        result = await ai_service.predict_function(request.sequence)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Function prediction failed: {str(e)}")

@router.post("/analyze-stability", summary="Analyze Protein Stability")
async def analyze_stability(
    request: StabilityRequest,
    db: Session = Depends(get_db)
):
    """
    Analyze protein stability under different environmental conditions.

    Predicts thermal stability, pH stability, and overall conformational stability
    using AI models trained on experimental stability data.

    **Parameters:**
    - **sequence**: Amino acid sequence to analyze
    - **temperature**: Environmental temperature in Celsius
    - **ph**: Environmental pH value

    **Returns:**
    - Stability predictions and scores
    - Melting temperature estimates
    - pH stability profile

    **Raises:**
    - 500: Stability analysis failed
    """
    ai_service = AIService()
    try:
        result = await ai_service.analyze_stability(request.sequence, request.temperature, request.ph)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stability analysis failed: {str(e)}")

@router.post("/design-protein", summary="Design Protein from Requirements")
async def design_protein(
    requirements: DesignRequirements,
    db: Session = Depends(get_db)
):
    """
    Design a novel protein based on functional requirements.

    Uses inverse protein design approaches to create sequences that are optimized
    for specific biological functions and applications.

    **Parameters:**
    - **requirements**: Design specifications including function and constraints

    **Returns:**
    - Designed protein sequence
    - Predicted structure and properties
    - Validation and optimization metrics

    **Raises:**
    - 500: Protein design failed
    """
    ai_service = AIService()
    try:
        result = await ai_service.design_protein(requirements.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Protein design failed: {str(e)}")