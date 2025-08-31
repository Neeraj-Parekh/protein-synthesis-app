"""
Protein repository for database operations
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
import uuid
import logging
from datetime import datetime

from .base import BaseRepository, NotFoundError, ValidationError, DatabaseError
from models.protein import ProteinDB, ProteinCreate, ProteinResponse
import re

logger = logging.getLogger(__name__)

class ProteinRepository(BaseRepository[ProteinDB, ProteinCreate, Dict[str, Any]]):
    """
    Repository for protein data operations
    """
    
    def __init__(self, db: Session):
        super().__init__(db, ProteinDB)
    
    def validate_create_data(self, obj_in: ProteinCreate) -> None:
        """
        Validate protein data before creation
        """
        # Validate protein name
        if not obj_in.name or len(obj_in.name.strip()) == 0:
            raise ValidationError("Protein name cannot be empty")
        
        if len(obj_in.name) > 255:
            raise ValidationError("Protein name too long (maximum 255 characters)")
        
        # Validate sequence
        if not obj_in.sequence or len(obj_in.sequence.strip()) == 0:
            raise ValidationError("Protein sequence cannot be empty")
        
        # Check for valid amino acid characters
        valid_amino_acids = set('ACDEFGHIKLMNPQRSTVWYXU')  # Including X for unknown, U for selenocysteine
        sequence_upper = obj_in.sequence.upper().strip()
        invalid_chars = set(sequence_upper) - valid_amino_acids
        
        if invalid_chars:
            raise ValidationError(f"Invalid amino acid characters found: {', '.join(invalid_chars)}")
        
        # Check sequence length constraints
        if len(sequence_upper) > 50000:  # Reasonable upper limit
            raise ValidationError("Protein sequence too long (maximum 50,000 residues)")
        
        if len(sequence_upper) < 1:
            raise ValidationError("Protein sequence too short (minimum 1 residue)")
    
    def validate_update_data(self, obj_in: Dict[str, Any]) -> None:
        """
        Validate protein data before update
        """
        if 'name' in obj_in:
            if not obj_in['name'] or len(obj_in['name'].strip()) == 0:
                raise ValidationError("Protein name cannot be empty")
            
            if len(obj_in['name']) > 255:
                raise ValidationError("Protein name too long (maximum 255 characters)")
        
        if 'sequence' in obj_in:
            if not obj_in['sequence'] or len(obj_in['sequence'].strip()) == 0:
                raise ValidationError("Protein sequence cannot be empty")
            
            # Validate sequence characters
            valid_amino_acids = set('ACDEFGHIKLMNPQRSTVWYXU')
            sequence_upper = obj_in['sequence'].upper().strip()
            invalid_chars = set(sequence_upper) - valid_amino_acids
            
            if invalid_chars:
                raise ValidationError(f"Invalid amino acid characters found: {', '.join(invalid_chars)}")
            
            # Check sequence length
            if len(sequence_upper) > 50000:
                raise ValidationError("Protein sequence too long (maximum 50,000 residues)")
    
    def create(self, obj_in: ProteinCreate) -> ProteinDB:
        """
        Create a new protein with validation and automatic ID generation
        """
        # Validate input data
        self.validate_create_data(obj_in)
        
        # Calculate molecular weight and length
        sequence = obj_in.sequence.upper().strip()
        molecular_weight = self._calculate_molecular_weight(sequence)
        length = len(sequence)
        
        # Create protein data
        protein_data = {
            'name': obj_in.name.strip(),
            'sequence': sequence,
            'molecular_weight': molecular_weight,
            'length': length,
            'extra_metadata': {}
        }
        
        try:
            db_obj = ProteinDB(**protein_data)
            self.db.add(db_obj)
            self.db.commit()
            self.db.refresh(db_obj)
            
            logger.info(f"Created protein '{obj_in.name}' with ID: {db_obj.id}")
            return db_obj
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating protein: {e}")
            raise DatabaseError(f"Failed to create protein: {str(e)}")
    
    def get_by_name(self, name: str) -> Optional[ProteinDB]:
        """
        Get protein by name
        """
        try:
            return self.db.query(ProteinDB).filter(ProteinDB.name == name).first()
        except Exception as e:
            logger.error(f"Error retrieving protein by name '{name}': {e}")
            raise DatabaseError(f"Failed to retrieve protein by name: {str(e)}")
    
    def search_by_sequence(self, sequence: str, similarity_threshold: float = 0.8) -> List[ProteinDB]:
        """
        Search proteins by sequence similarity (basic implementation)
        """
        try:
            # For now, implement exact substring matching
            # In a production system, you'd use specialized sequence alignment tools
            sequence_upper = sequence.upper().strip()
            
            # Find proteins containing the sequence as a substring
            results = self.db.query(ProteinDB).filter(
                ProteinDB.sequence.contains(sequence_upper)
            ).limit(50).all()
            
            logger.debug(f"Sequence search for '{sequence[:20]}...' returned {len(results)} results")
            return results
            
        except Exception as e:
            logger.error(f"Error searching proteins by sequence: {e}")
            raise DatabaseError(f"Failed to search proteins by sequence: {str(e)}")
    
    def get_by_length_range(self, min_length: int, max_length: int) -> List[ProteinDB]:
        """
        Get proteins within a specific length range
        """
        try:
            return self.db.query(ProteinDB).filter(
                and_(
                    ProteinDB.length >= min_length,
                    ProteinDB.length <= max_length
                )
            ).all()
        except Exception as e:
            logger.error(f"Error retrieving proteins by length range: {e}")
            raise DatabaseError(f"Failed to retrieve proteins by length range: {str(e)}")
    
    def get_by_molecular_weight_range(self, min_weight: float, max_weight: float) -> List[ProteinDB]:
        """
        Get proteins within a specific molecular weight range
        """
        try:
            return self.db.query(ProteinDB).filter(
                and_(
                    ProteinDB.molecular_weight >= min_weight,
                    ProteinDB.molecular_weight <= max_weight
                )
            ).all()
        except Exception as e:
            logger.error(f"Error retrieving proteins by molecular weight range: {e}")
            raise DatabaseError(f"Failed to retrieve proteins by molecular weight range: {str(e)}")
    
    def get_recent(self, limit: int = 10) -> List[ProteinDB]:
        """
        Get recently created proteins
        """
        try:
            return self.db.query(ProteinDB).order_by(
                ProteinDB.created_at.desc()
            ).limit(limit).all()
        except Exception as e:
            logger.error(f"Error retrieving recent proteins: {e}")
            raise DatabaseError(f"Failed to retrieve recent proteins: {str(e)}")
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get protein database statistics
        """
        try:
            stats = {}
            
            # Total count
            stats['total_proteins'] = self.db.query(ProteinDB).count()
            
            # Average length
            avg_length = self.db.query(func.avg(ProteinDB.length)).scalar()
            stats['average_length'] = round(avg_length, 2) if avg_length else 0
            
            # Length distribution
            stats['length_distribution'] = {
                'short': self.db.query(ProteinDB).filter(ProteinDB.length < 100).count(),
                'medium': self.db.query(ProteinDB).filter(
                    and_(ProteinDB.length >= 100, ProteinDB.length < 500)
                ).count(),
                'long': self.db.query(ProteinDB).filter(ProteinDB.length >= 500).count(),
            }
            
            # Average molecular weight
            avg_weight = self.db.query(func.avg(ProteinDB.molecular_weight)).scalar()
            stats['average_molecular_weight'] = round(avg_weight, 2) if avg_weight else 0
            
            # Recent activity
            stats['proteins_last_24h'] = self.db.query(ProteinDB).filter(
                ProteinDB.created_at >= func.datetime('now', '-1 day')
            ).count()
            
            logger.debug(f"Retrieved protein statistics: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"Error retrieving protein statistics: {e}")
            raise DatabaseError(f"Failed to retrieve protein statistics: {str(e)}")
    
    def update_metadata(self, protein_id: str, metadata: Dict[str, Any]) -> Optional[ProteinDB]:
        """
        Update protein metadata
        """
        try:
            protein = self.get(protein_id)
            if not protein:
                return None
            
            # Merge with existing metadata
            current_metadata = protein.extra_metadata or {}
            current_metadata.update(metadata)
            
            protein.extra_metadata = current_metadata
            self.db.commit()
            self.db.refresh(protein)
            
            logger.info(f"Updated metadata for protein {protein_id}")
            return protein
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating protein metadata: {e}")
            raise DatabaseError(f"Failed to update protein metadata: {str(e)}")
    
    def duplicate_check(self, sequence: str, name: str = None) -> Optional[ProteinDB]:
        """
        Check for duplicate proteins by sequence and optionally name
        """
        try:
            sequence_upper = sequence.upper().strip()
            query = self.db.query(ProteinDB).filter(ProteinDB.sequence == sequence_upper)
            
            if name:
                query = query.filter(ProteinDB.name == name.strip())
            
            return query.first()
            
        except Exception as e:
            logger.error(f"Error checking for duplicate proteins: {e}")
            raise DatabaseError(f"Failed to check for duplicate proteins: {str(e)}")
    
    def _calculate_molecular_weight(self, sequence: str) -> float:
        """
        Calculate approximate molecular weight of protein sequence
        """
        # Amino acid molecular weights (average isotopic masses)
        aa_weights = {
            'A': 89.09, 'R': 174.20, 'N': 132.12, 'D': 133.10, 'C': 121.15,
            'E': 147.13, 'Q': 146.15, 'G': 75.07, 'H': 155.16, 'I': 131.17,
            'L': 131.17, 'K': 146.19, 'M': 149.21, 'F': 165.19, 'P': 115.13,
            'S': 105.09, 'T': 119.12, 'W': 204.23, 'Y': 181.19, 'V': 117.15,
            'X': 110.0, 'U': 168.05  # X = unknown, U = selenocysteine
        }
        
        total_weight = 0.0
        for aa in sequence.upper():
            total_weight += aa_weights.get(aa, 110.0)  # Default weight for unknown
        
        # Add water molecule weight and subtract water for peptide bonds
        water_weight = 18.015
        total_weight += water_weight  # N-terminus
        total_weight -= (len(sequence) - 1) * water_weight  # Peptide bonds
        
        return round(total_weight, 2)
    
    def validate_sequence_format(self, sequence: str) -> bool:
        """
        Validate if sequence contains only valid amino acid characters
        """
        valid_pattern = re.compile(r'^[ACDEFGHIKLMNPQRSTVWYXU]+$', re.IGNORECASE)
        return bool(valid_pattern.match(sequence.strip()))
    
    def get_amino_acid_composition(self, protein_id: str) -> Dict[str, Any]:
        """
        Calculate amino acid composition for a protein
        """
        try:
            protein = self.get_or_404(protein_id)
            sequence = protein.sequence
            
            # Count amino acids
            composition = {}
            for aa in sequence:
                composition[aa] = composition.get(aa, 0) + 1
            
            # Calculate percentages
            total_residues = len(sequence)
            percentages = {aa: (count / total_residues) * 100 
                          for aa, count in composition.items()}
            
            return {
                'composition': composition,
                'percentages': percentages,
                'total_residues': total_residues
            }
            
        except Exception as e:
            logger.error(f"Error calculating amino acid composition: {e}")
            raise DatabaseError(f"Failed to calculate amino acid composition: {str(e)}")
    
    def cleanup_old_proteins(self, days_old: int = 30) -> int:
        """
        Clean up proteins older than specified days (for maintenance)
        """
        try:
            deleted_count = self.db.query(ProteinDB).filter(
                ProteinDB.created_at < func.datetime('now', f'-{days_old} days')
            ).delete()
            
            self.db.commit()
            logger.info(f"Cleaned up {deleted_count} proteins older than {days_old} days")
            return deleted_count
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error cleaning up old proteins: {e}")
            raise DatabaseError(f"Failed to clean up old proteins: {str(e)}")