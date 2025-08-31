"""
Protein management API endpoints

This module provides comprehensive protein data management including upload,
storage, retrieval, and structural analysis of protein molecules.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from datetime import datetime

from database import get_db
from models.protein import (
    ProteinDB, ProteinCreate, ProteinResponse, ProteinStructure
)
from services.protein_service import ProteinService

router = APIRouter(
    prefix="/proteins",
    tags=["Proteins"],
    responses={
        404: {"description": "Protein not found"},
        500: {"description": "Internal server error"}
    }
)

@router.post("/upload", response_model=ProteinResponse, summary="Upload Protein Structure")
async def upload_protein(
    file: UploadFile = File(..., description="PDB format protein structure file"),
    name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Upload and parse a protein structure file in PDB format.

    This endpoint accepts PDB files containing 3D protein structures, parses them,
    and stores the structural information in the database for further analysis.

    **Parameters:**
    - **file**: PDB format file containing protein structure
    - **name**: Optional custom name for the protein (defaults to filename)

    **Returns:**
    - Complete protein information including parsed structure data
    - Metadata about chains, residues, and atoms

    **Raises:**
    - 400: Invalid file format (only PDB supported)
    - 500: File processing error
    """
    if not file.filename or not file.filename.endswith('.pdb'):
        raise HTTPException(status_code=400, detail="Only PDB files are supported")
    
    try:
        content = await file.read()
        protein_service = ProteinService(db)
        
        protein = await protein_service.create_from_pdb(
            content.decode('utf-8'),
            name or (file.filename.replace('.pdb', '') if file.filename else 'unnamed_protein')
        )
        
        return protein
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@router.get("/", response_model=List[ProteinResponse], summary="List Proteins")
async def list_proteins(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Retrieve a paginated list of all proteins in the database.

    Returns protein metadata and basic information for all stored proteins,
    with support for pagination to handle large datasets.

    **Parameters:**
    - **skip**: Number of proteins to skip (for pagination)
    - **limit**: Maximum number of proteins to return (default: 100)

    **Returns:**
    - List of protein metadata and basic information
    """
    proteins = db.query(ProteinDB).offset(skip).limit(limit).all()
    return proteins

@router.get("/{protein_id}", response_model=ProteinResponse, summary="Get Protein Details")
async def get_protein(protein_id: str, db: Session = Depends(get_db)):
    """
    Retrieve detailed information about a specific protein.

    Returns complete protein metadata, sequence information, and structural
    properties for the requested protein.

    **Parameters:**
    - **protein_id**: Unique identifier of the protein

    **Returns:**
    - Complete protein information and metadata

    **Raises:**
    - 404: Protein not found
    """
    protein = db.query(ProteinDB).filter(ProteinDB.id == protein_id).first()
    if not protein:
        raise HTTPException(status_code=404, detail="Protein not found")
    return protein

@router.get("/{protein_id}/structure", response_model=ProteinStructure, summary="Get Protein Structure")
async def get_protein_structure(protein_id: str, db: Session = Depends(get_db)):
    """
    Retrieve detailed 3D structural data for a protein.

    Returns atomic coordinates, secondary structure assignments, and other
    structural information necessary for 3D visualization and analysis.

    **Parameters:**
    - **protein_id**: Unique identifier of the protein

    **Returns:**
    - Detailed structural data including atomic coordinates
    - Secondary structure assignments
    - Chain and residue information

    **Raises:**
    - 404: Protein structure not found
    """
    protein_service = ProteinService(db)
    structure = await protein_service.get_structure(protein_id)
    if not structure:
        raise HTTPException(status_code=404, detail="Protein structure not found")
    return structure

@router.delete("/{protein_id}", summary="Delete Protein")
async def delete_protein(protein_id: str, db: Session = Depends(get_db)):
    """
    Permanently delete a protein and all associated data.

    Removes the protein record and all related structural data from the database.
    This operation cannot be undone.

    **Parameters:**
    - **protein_id**: Unique identifier of the protein to delete

    **Returns:**
    - Success confirmation message

    **Raises:**
    - 404: Protein not found
    """
    protein = db.query(ProteinDB).filter(ProteinDB.id == protein_id).first()
    if not protein:
        raise HTTPException(status_code=404, detail="Protein not found")
    
    db.delete(protein)
    db.commit()
    return {"message": "Protein deleted successfully"}