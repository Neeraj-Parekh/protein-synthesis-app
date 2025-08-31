"""
Protein analysis API endpoints

This module provides comprehensive protein analysis capabilities including
sequence analysis, chemical property calculations, and structural comparisons.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from database import get_db
from models.protein import SequenceAnalysis, ChemicalProperties
from services.analysis_service import AnalysisService

router = APIRouter(
    prefix="/analysis",
    tags=["Analysis"],
    responses={
        404: {"description": "Analysis not found"},
        500: {"description": "Internal server error"}
    }
)

@router.get("/{protein_id}/sequence", response_model=SequenceAnalysis, summary="Analyze Protein Sequence")
async def analyze_sequence(protein_id: str, db: Session = Depends(get_db)):
    """
    Perform comprehensive sequence analysis on a protein.

    Analyzes amino acid composition, sequence patterns, motifs, and other
    sequence-derived properties that provide insights into protein function
    and characteristics.

    **Parameters:**
    - **protein_id**: Unique identifier of the protein to analyze

    **Returns:**
    - Amino acid composition and frequencies
    - Sequence motifs and patterns
    - Physicochemical properties
    - Sequence complexity metrics

    **Raises:**
    - 500: Analysis failed due to service or data issues
    """
    analysis_service = AnalysisService(db)
    try:
        result = await analysis_service.analyze_sequence(protein_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.get("/{protein_id}/properties", response_model=ChemicalProperties, summary="Calculate Chemical Properties")
async def get_chemical_properties(protein_id: str, db: Session = Depends(get_db)):
    """
    Calculate detailed chemical and biophysical properties of a protein.

    Computes molecular weight, isoelectric point, extinction coefficients,
    instability index, and other physicochemical properties.

    **Parameters:**
    - **protein_id**: Unique identifier of the protein

    **Returns:**
    - Molecular weight and formula
    - Isoelectric point (pI)
    - Extinction coefficients
    - Instability and aliphatic indices
    - Grand average of hydropathicity (GRAVY)

    **Raises:**
    - 500: Property calculation failed
    """
    analysis_service = AnalysisService(db)
    try:
        properties = await analysis_service.calculate_properties(protein_id)
        return properties
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Property calculation failed: {str(e)}")

@router.get("/{protein_id}/secondary-structure", summary="Identify Secondary Structure")
async def get_secondary_structure(protein_id: str, db: Session = Depends(get_db)):
    """
    Identify and classify secondary structure elements in the protein.

    Uses algorithms to predict alpha helices, beta sheets, turns, and coils
    from the protein sequence and/or structure.

    **Parameters:**
    - **protein_id**: Unique identifier of the protein

    **Returns:**
    - Secondary structure assignments for each residue
    - Helix and sheet content percentages
    - Structural motif identification

    **Raises:**
    - 500: Secondary structure analysis failed
    """
    analysis_service = AnalysisService(db)
    try:
        structure = await analysis_service.identify_secondary_structure(protein_id)
        return structure
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Secondary structure analysis failed: {str(e)}")

@router.post("/compare", summary="Compare Multiple Proteins")
async def compare_proteins(
    protein_ids: List[str],
    comparison_type: str = "sequence",
    db: Session = Depends(get_db)
):
    """
    Compare multiple proteins using sequence or structural alignment.

    Performs pairwise or multiple sequence alignment, calculates similarity
    scores, and identifies conserved regions and differences.

    **Parameters:**
    - **protein_ids**: List of protein IDs to compare (minimum 2)
    - **comparison_type**: Type of comparison ("sequence" or "structure")

    **Returns:**
    - Alignment results with scores
    - Similarity matrices
    - Conserved region identification
    - Difference highlighting

    **Raises:**
    - 400: Invalid comparison type or insufficient proteins
    - 500: Comparison failed
    """
    if len(protein_ids) < 2:
        raise HTTPException(status_code=400, detail="At least 2 proteins required for comparison")
    
    analysis_service = AnalysisService(db)
    try:
        if comparison_type == "sequence":
            result = await analysis_service.compare_sequences(protein_ids)
        elif comparison_type == "structure":
            result = await analysis_service.compare_structures(protein_ids)
        else:
            raise HTTPException(status_code=400, detail="Invalid comparison type")
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")