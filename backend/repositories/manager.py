"""
Repository manager for handling database connections and repository instances
"""
from typing import Optional
from sqlalchemy.orm import Session
import logging

from .protein_repository import ProteinRepository
from .analysis_repository import AnalysisRepository
from .session_repository import SessionRepository

logger = logging.getLogger(__name__)

class RepositoryManager:
    """
    Manager class for handling repository instances and database connections
    """
    
    def __init__(self, db: Session):
        self.db = db
        self._protein_repo: Optional[ProteinRepository] = None
        self._analysis_repo: Optional[AnalysisRepository] = None
        self._session_repo: Optional[SessionRepository] = None
    
    @property
    def protein(self) -> ProteinRepository:
        """Get protein repository instance"""
        if self._protein_repo is None:
            self._protein_repo = ProteinRepository(self.db)
        return self._protein_repo
    
    @property
    def analysis(self) -> AnalysisRepository:
        """Get analysis repository instance"""
        if self._analysis_repo is None:
            self._analysis_repo = AnalysisRepository(self.db)
        return self._analysis_repo
    
    @property
    def session(self) -> SessionRepository:
        """Get session repository instance"""
        if self._session_repo is None:
            self._session_repo = SessionRepository(self.db)
        return self._session_repo
    
    def close(self):
        """Close database connection"""
        if self.db:
            self.db.close()
            logger.debug("Database connection closed")
    
    def commit(self):
        """Commit current transaction"""
        try:
            self.db.commit()
            logger.debug("Transaction committed")
        except Exception as e:
            logger.error(f"Error committing transaction: {e}")
            self.db.rollback()
            raise
    
    def rollback(self):
        """Rollback current transaction"""
        try:
            self.db.rollback()
            logger.debug("Transaction rolled back")
        except Exception as e:
            logger.error(f"Error rolling back transaction: {e}")
            raise
    
    def refresh(self, instance):
        """Refresh instance from database"""
        try:
            self.db.refresh(instance)
            logger.debug(f"Refreshed instance: {type(instance).__name__}")
        except Exception as e:
            logger.error(f"Error refreshing instance: {e}")
            raise

def get_repository_manager(db: Session) -> RepositoryManager:
    """
    Factory function to create repository manager
    """
    return RepositoryManager(db)