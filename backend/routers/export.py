"""
Export and data management API endpoints

This module provides comprehensive data export capabilities for proteins,
analysis results, and visualizations in various formats.
"""
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from database import get_db
from services.export_service import ExportService

router = APIRouter(
    prefix="/export",
    tags=["Export"],
    responses={
        404: {"description": "Export data not found"},
        500: {"description": "Internal server error"}
    }
)

class ExportRequest(BaseModel):
    """Request model for protein data export"""
    protein_ids: List[str] = []
    format: str = "pdb"  # "pdb", "fasta", "json", "png", "svg"
    options: Optional[dict] = None

@router.post("/proteins", summary="Export Protein Data")
async def export_proteins(
    request: ExportRequest,
    db: Session = Depends(get_db)
):
    """
    Export protein data in various formats.

    Supports multiple export formats including PDB, FASTA, JSON for structural
    data, and PNG/SVG for visualizations. Can export single proteins or batches.

    **Parameters:**
    - **request**: Export configuration including protein IDs and format

    **Supported Formats:**
    - **pdb**: Protein Data Bank format for 3D structures
    - **fasta**: FASTA format for sequences
    - **json**: JSON format with complete protein data
    - **png/svg**: Image formats for 3D visualizations

    **Returns:**
    - File response with exported data
    - Appropriate content headers for the format

    **Raises:**
    - 500: Export failed due to service or data issues
    """
    export_service = ExportService(db)
    try:
        result = await export_service.export_proteins(
            request.protein_ids,
            request.format,
            request.options or {}
        )
        
        if request.format in ["png", "svg"]:
            return Response(
                content=result["data"],
                media_type=result["media_type"],
                headers={"Content-Disposition": f"attachment; filename={result['filename']}"}
            )
        else:
            return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@router.post("/analysis", summary="Export Analysis Results")
async def export_analysis(
    protein_id: str,
    analysis_type: str,
    format: str = "json",
    db: Session = Depends(get_db)
):
    """
    Export analysis results for a specific protein.

    Exports the results of various analysis types (sequence analysis, properties,
    secondary structure, etc.) in the requested format.

    **Parameters:**
    - **protein_id**: Unique identifier of the protein
    - **analysis_type**: Type of analysis to export
    - **format**: Export format (json, csv, txt, etc.)

    **Returns:**
    - Analysis results in the specified format
    - Formatted data ready for external tools or reports

    **Raises:**
    - 500: Analysis export failed
    """
    export_service = ExportService(db)
    try:
        result = await export_service.export_analysis(protein_id, analysis_type, format)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis export failed: {str(e)}")

@router.post("/visualization", summary="Export 3D Visualization")
async def export_visualization(
    protein_id: str,
    view_settings: dict,
    format: str = "png",
    resolution: int = 1920,
    db: Session = Depends(get_db)
):
    """
    Export 3D protein visualization as an image.

    Generates high-quality images of protein structures with customizable
    viewing settings, colors, and rendering options.

    **Parameters:**
    - **protein_id**: Unique identifier of the protein
    - **view_settings**: Visualization settings (colors, styles, camera position)
    - **format**: Image format (png, svg, jpg)
    - **resolution**: Image resolution in pixels (width)

    **Returns:**
    - High-quality visualization image
    - Configurable rendering options

    **Raises:**
    - 500: Visualization export failed
    """
    export_service = ExportService(db)
    try:
        result = await export_service.export_visualization(
            protein_id,
            view_settings,
            format,
            resolution
        )
        
        return Response(
            content=result["data"],
            media_type=result["media_type"],
            headers={"Content-Disposition": f"attachment; filename={result['filename']}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Visualization export failed: {str(e)}")

@router.get("/session/{session_id}", summary="Export Complete Session")
async def export_session(session_id: str, db: Session = Depends(get_db)):
    """
    Export a complete analysis session with all data and results.

    Creates a comprehensive archive containing all proteins, analyses,
    visualizations, and metadata from a user session.

    **Parameters:**
    - **session_id**: Unique identifier of the analysis session

    **Returns:**
    - Complete session archive
    - All proteins and analysis results
    - Metadata and session information

    **Raises:**
    - 500: Session export failed
    """
    export_service = ExportService(db)
    try:
        result = await export_service.export_session(session_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Session export failed: {str(e)}")