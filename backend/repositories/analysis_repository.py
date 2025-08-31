"""
Analysis repository for storing and retrieving protein analysis results
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
import uuid
import json
import logging
from datetime import datetime, timedelta

from .base import BaseRepository, NotFoundError, ValidationError, DatabaseError
from models.protein import AnalysisResultDB

logger = logging.getLogger(__name__)

class AnalysisRepository(BaseRepository[AnalysisResultDB, Dict[str, Any], Dict[str, Any]]):
    """
    Repository for protein analysis results
    """
    
    def __init__(self, db: Session):
        super().__init__(db, AnalysisResultDB)
    
    def validate_create_data(self, obj_in: Dict[str, Any]) -> None:
        """
        Validate analysis data before creation
        """
        required_fields = ['protein_id', 'analysis_type', 'result_data']
        
        for field in required_fields:
            if field not in obj_in or obj_in[field] is None:
                raise ValidationError(f"Field '{field}' is required")
        
        # Validate analysis type
        valid_types = ['sequence', 'structure', 'comparison', 'generation', 'chemical_properties']
        if obj_in['analysis_type'] not in valid_types:
            raise ValidationError(f"Invalid analysis type. Must be one of: {', '.join(valid_types)}")
        
        # Validate protein_id format (should be UUID)
        try:
            uuid.UUID(obj_in['protein_id'])
        except ValueError:
            raise ValidationError("Invalid protein_id format")
        
        # Validate result_data is serializable
        try:
            json.dumps(obj_in['result_data'])
        except (TypeError, ValueError) as e:
            raise ValidationError(f"Result data is not JSON serializable: {str(e)}")
    
    def validate_update_data(self, obj_in: Dict[str, Any]) -> None:
        """
        Validate analysis data before update
        """
        if 'analysis_type' in obj_in:
            valid_types = ['sequence', 'structure', 'comparison', 'generation', 'chemical_properties']
            if obj_in['analysis_type'] not in valid_types:
                raise ValidationError(f"Invalid analysis type. Must be one of: {', '.join(valid_types)}")
        
        if 'protein_id' in obj_in:
            try:
                uuid.UUID(obj_in['protein_id'])
            except ValueError:
                raise ValidationError("Invalid protein_id format")
        
        if 'result_data' in obj_in:
            try:
                json.dumps(obj_in['result_data'])
            except (TypeError, ValueError) as e:
                raise ValidationError(f"Result data is not JSON serializable: {str(e)}")
    
    def create(self, obj_in: Dict[str, Any]) -> AnalysisResultDB:
        """
        Create a new analysis result with validation and automatic ID generation
        """
        # Validate input data
        self.validate_create_data(obj_in)
        
        # Generate unique ID
        analysis_id = str(uuid.uuid4())
        
        # Create analysis data
        analysis_data = {
            'id': analysis_id,
            'protein_id': obj_in['protein_id'],
            'analysis_type': obj_in['analysis_type'],
            'result_data': obj_in['result_data']
        }
        
        try:
            db_obj = AnalysisResultDB(**analysis_data)
            self.db.add(db_obj)
            self.db.commit()
            self.db.refresh(db_obj)
            
            logger.info(f"Created analysis result '{obj_in['analysis_type']}' for protein {obj_in['protein_id']}")
            return db_obj
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating analysis result: {e}")
            raise DatabaseError(f"Failed to create analysis result: {str(e)}")
    
    def get_by_protein_id(self, protein_id: str, analysis_type: Optional[str] = None) -> List[AnalysisResultDB]:
        """
        Get all analysis results for a specific protein
        """
        try:
            query = self.db.query(AnalysisResultDB).filter(AnalysisResultDB.protein_id == protein_id)
            
            if analysis_type:
                query = query.filter(AnalysisResultDB.analysis_type == analysis_type)
            
            results = query.order_by(desc(AnalysisResultDB.created_at)).all()
            
            logger.debug(f"Retrieved {len(results)} analysis results for protein {protein_id}")
            return results
            
        except Exception as e:
            logger.error(f"Error retrieving analysis results for protein {protein_id}: {e}")
            raise DatabaseError(f"Failed to retrieve analysis results: {str(e)}")
    
    def get_by_type(self, analysis_type: str, limit: int = 100) -> List[AnalysisResultDB]:
        """
        Get analysis results by type
        """
        try:
            results = self.db.query(AnalysisResultDB).filter(
                AnalysisResultDB.analysis_type == analysis_type
            ).order_by(desc(AnalysisResultDB.created_at)).limit(limit).all()
            
            logger.debug(f"Retrieved {len(results)} analysis results of type '{analysis_type}'")
            return results
            
        except Exception as e:
            logger.error(f"Error retrieving analysis results by type '{analysis_type}': {e}")
            raise DatabaseError(f"Failed to retrieve analysis results by type: {str(e)}")
    
    def get_recent(self, hours: int = 24, limit: int = 50) -> List[AnalysisResultDB]:
        """
        Get recent analysis results
        """
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            
            results = self.db.query(AnalysisResultDB).filter(
                AnalysisResultDB.created_at >= cutoff_time
            ).order_by(desc(AnalysisResultDB.created_at)).limit(limit).all()
            
            logger.debug(f"Retrieved {len(results)} recent analysis results from last {hours} hours")
            return results
            
        except Exception as e:
            logger.error(f"Error retrieving recent analysis results: {e}")
            raise DatabaseError(f"Failed to retrieve recent analysis results: {str(e)}")
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get analysis statistics
        """
        try:
            stats = {}
            
            # Total count
            stats['total_analyses'] = self.db.query(AnalysisResultDB).count()
            
            # Count by type
            type_counts = self.db.query(
                AnalysisResultDB.analysis_type,
                func.count(AnalysisResultDB.id)
            ).group_by(AnalysisResultDB.analysis_type).all()
            
            stats['by_type'] = {analysis_type: count for analysis_type, count in type_counts}
            
            # Recent activity
            stats['analyses_last_24h'] = self.db.query(AnalysisResultDB).filter(
                AnalysisResultDB.created_at >= func.datetime('now', '-1 day')
            ).count()
            
            stats['analyses_last_week'] = self.db.query(AnalysisResultDB).filter(
                AnalysisResultDB.created_at >= func.datetime('now', '-7 days')
            ).count()
            
            # Most analyzed proteins
            protein_counts = self.db.query(
                AnalysisResultDB.protein_id,
                func.count(AnalysisResultDB.id)
            ).group_by(AnalysisResultDB.protein_id).order_by(
                desc(func.count(AnalysisResultDB.id))
            ).limit(10).all()
            
            stats['most_analyzed_proteins'] = [
                {'protein_id': protein_id, 'analysis_count': count}
                for protein_id, count in protein_counts
            ]
            
            logger.debug(f"Retrieved analysis statistics: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"Error retrieving analysis statistics: {e}")
            raise DatabaseError(f"Failed to retrieve analysis statistics: {str(e)}")
    
    def delete_by_protein_id(self, protein_id: str) -> int:
        """
        Delete all analysis results for a specific protein
        """
        try:
            deleted_count = self.db.query(AnalysisResultDB).filter(
                AnalysisResultDB.protein_id == protein_id
            ).delete()
            
            self.db.commit()
            logger.info(f"Deleted {deleted_count} analysis results for protein {protein_id}")
            return deleted_count
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting analysis results for protein {protein_id}: {e}")
            raise DatabaseError(f"Failed to delete analysis results: {str(e)}")
    
    def cleanup_old_analyses(self, days_old: int = 90) -> int:
        """
        Clean up analysis results older than specified days
        """
        try:
            deleted_count = self.db.query(AnalysisResultDB).filter(
                AnalysisResultDB.created_at < func.datetime('now', f'-{days_old} days')
            ).delete()
            
            self.db.commit()
            logger.info(f"Cleaned up {deleted_count} analysis results older than {days_old} days")
            return deleted_count
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error cleaning up old analysis results: {e}")
            raise DatabaseError(f"Failed to clean up old analysis results: {str(e)}")
    
    def get_analysis_history(self, protein_id: str, analysis_type: str) -> List[AnalysisResultDB]:
        """
        Get analysis history for a specific protein and analysis type
        """
        try:
            results = self.db.query(AnalysisResultDB).filter(
                and_(
                    AnalysisResultDB.protein_id == protein_id,
                    AnalysisResultDB.analysis_type == analysis_type
                )
            ).order_by(desc(AnalysisResultDB.created_at)).all()
            
            logger.debug(f"Retrieved {len(results)} analysis history entries for protein {protein_id}, type {analysis_type}")
            return results
            
        except Exception as e:
            logger.error(f"Error retrieving analysis history: {e}")
            raise DatabaseError(f"Failed to retrieve analysis history: {str(e)}")
    
    def update_result_data(self, analysis_id: str, result_data: Dict[str, Any]) -> Optional[AnalysisResultDB]:
        """
        Update the result data for an analysis
        """
        try:
            # Validate result data is serializable
            json.dumps(result_data)
            
            analysis = self.get(analysis_id)
            if not analysis:
                return None
            
            analysis.result_data = result_data
            self.db.commit()
            self.db.refresh(analysis)
            
            logger.info(f"Updated result data for analysis {analysis_id}")
            return analysis
            
        except json.JSONEncodeError as e:
            raise ValidationError(f"Result data is not JSON serializable: {str(e)}")
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating analysis result data: {e}")
            raise DatabaseError(f"Failed to update analysis result data: {str(e)}")
    
    def search_by_result_content(self, search_term: str, analysis_type: Optional[str] = None) -> List[AnalysisResultDB]:
        """
        Search analysis results by content in result_data (basic text search)
        """
        try:
            # Note: This is a basic implementation. For production, you'd want to use
            # full-text search capabilities or specialized search engines
            query = self.db.query(AnalysisResultDB)
            
            if analysis_type:
                query = query.filter(AnalysisResultDB.analysis_type == analysis_type)
            
            # Convert result_data to text and search
            # This is database-specific; adjust for your database
            results = query.filter(
                func.json_extract(AnalysisResultDB.result_data, '$').like(f'%{search_term}%')
            ).limit(50).all()
            
            logger.debug(f"Search for '{search_term}' returned {len(results)} analysis results")
            return results
            
        except Exception as e:
            logger.error(f"Error searching analysis results: {e}")
            raise DatabaseError(f"Failed to search analysis results: {str(e)}")
    
    def get_latest_by_protein_and_type(self, protein_id: str, analysis_type: str) -> Optional[AnalysisResultDB]:
        """
        Get the most recent analysis result for a specific protein and type
        """
        try:
            result = self.db.query(AnalysisResultDB).filter(
                and_(
                    AnalysisResultDB.protein_id == protein_id,
                    AnalysisResultDB.analysis_type == analysis_type
                )
            ).order_by(desc(AnalysisResultDB.created_at)).first()
            
            if result:
                logger.debug(f"Retrieved latest {analysis_type} analysis for protein {protein_id}")
            else:
                logger.debug(f"No {analysis_type} analysis found for protein {protein_id}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error retrieving latest analysis: {e}")
            raise DatabaseError(f"Failed to retrieve latest analysis: {str(e)}")