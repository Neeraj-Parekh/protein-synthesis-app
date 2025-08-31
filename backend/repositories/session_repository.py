"""
Session repository for managing user sessions and preferences
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
import uuid
import json
import logging
from datetime import datetime, timedelta

from .base import BaseRepository, NotFoundError, ValidationError, DatabaseError
from models.protein import UserSessionDB

logger = logging.getLogger(__name__)

class SessionRepository(BaseRepository[UserSessionDB, Dict[str, Any], Dict[str, Any]]):
    """
    Repository for user session management
    """
    
    def __init__(self, db: Session):
        super().__init__(db, UserSessionDB)
    
    def validate_create_data(self, obj_in: Dict[str, Any]) -> None:
        """
        Validate session data before creation
        """
        # Session ID is optional - will be generated if not provided
        if 'session_id' in obj_in and obj_in['session_id']:
            if not isinstance(obj_in['session_id'], str) or len(obj_in['session_id']) == 0:
                raise ValidationError("Session ID must be a non-empty string")
        
        # Validate preferences is serializable if provided
        if 'preferences' in obj_in and obj_in['preferences'] is not None:
            try:
                json.dumps(obj_in['preferences'])
            except (TypeError, ValueError) as e:
                raise ValidationError(f"Preferences data is not JSON serializable: {str(e)}")
    
    def validate_update_data(self, obj_in: Dict[str, Any]) -> None:
        """
        Validate session data before update
        """
        if 'preferences' in obj_in and obj_in['preferences'] is not None:
            try:
                json.dumps(obj_in['preferences'])
            except (TypeError, ValueError) as e:
                raise ValidationError(f"Preferences data is not JSON serializable: {str(e)}")
    
    def create(self, obj_in: Dict[str, Any]) -> UserSessionDB:
        """
        Create a new session with validation and automatic ID generation
        """
        # Validate input data
        self.validate_create_data(obj_in)
        
        # Generate session ID if not provided
        session_id = obj_in.get('session_id') or str(uuid.uuid4())
        
        # Create session data
        session_data = {
            'session_id': session_id,
            'preferences': obj_in.get('preferences', {}),
        }
        
        try:
            db_obj = UserSessionDB(**session_data)
            self.db.add(db_obj)
            self.db.commit()
            self.db.refresh(db_obj)
            
            logger.info(f"Created session with ID: {session_id}")
            return db_obj
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating session: {e}")
            raise DatabaseError(f"Failed to create session: {str(e)}")
    
    def get_by_session_id(self, session_id: str) -> Optional[UserSessionDB]:
        """
        Get session by session ID
        """
        try:
            return self.db.query(UserSessionDB).filter(
                UserSessionDB.session_id == session_id
            ).first()
        except Exception as e:
            logger.error(f"Error retrieving session {session_id}: {e}")
            raise DatabaseError(f"Failed to retrieve session: {str(e)}")
    
    def update_preferences(self, session_id: str, preferences: Dict[str, Any]) -> Optional[UserSessionDB]:
        """
        Update session preferences
        """
        try:
            # Validate preferences are serializable
            json.dumps(preferences)
            
            session = self.get_by_session_id(session_id)
            if not session:
                return None
            
            # Merge with existing preferences
            current_preferences = session.preferences or {}
            current_preferences.update(preferences)
            
            session.preferences = current_preferences
            session.last_accessed = func.now()
            
            self.db.commit()
            self.db.refresh(session)
            
            logger.info(f"Updated preferences for session {session_id}")
            return session
            
        except json.JSONEncodeError as e:
            raise ValidationError(f"Preferences data is not JSON serializable: {str(e)}")
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating session preferences: {e}")
            raise DatabaseError(f"Failed to update session preferences: {str(e)}")
    
    def touch_session(self, session_id: str) -> Optional[UserSessionDB]:
        """
        Update last accessed time for a session
        """
        try:
            session = self.get_by_session_id(session_id)
            if not session:
                return None
            
            session.last_accessed = func.now()
            self.db.commit()
            self.db.refresh(session)
            
            logger.debug(f"Updated last accessed time for session {session_id}")
            return session
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error touching session {session_id}: {e}")
            raise DatabaseError(f"Failed to update session access time: {str(e)}")
    
    def get_or_create_session(self, session_id: str, default_preferences: Optional[Dict[str, Any]] = None) -> UserSessionDB:
        """
        Get existing session or create new one if it doesn't exist
        """
        try:
            session = self.get_by_session_id(session_id)
            
            if session:
                # Update last accessed time
                self.touch_session(session_id)
                return session
            else:
                # Create new session
                session_data = {
                    'session_id': session_id,
                    'preferences': default_preferences or {}
                }
                return self.create(session_data)
                
        except Exception as e:
            logger.error(f"Error getting or creating session {session_id}: {e}")
            raise DatabaseError(f"Failed to get or create session: {str(e)}")
    
    def get_active_sessions(self, hours: int = 24) -> List[UserSessionDB]:
        """
        Get sessions that have been active within the specified hours
        """
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            
            sessions = self.db.query(UserSessionDB).filter(
                UserSessionDB.last_accessed >= cutoff_time
            ).order_by(desc(UserSessionDB.last_accessed)).all()
            
            logger.debug(f"Retrieved {len(sessions)} active sessions from last {hours} hours")
            return sessions
            
        except Exception as e:
            logger.error(f"Error retrieving active sessions: {e}")
            raise DatabaseError(f"Failed to retrieve active sessions: {str(e)}")
    
    def cleanup_old_sessions(self, days_old: int = 30) -> int:
        """
        Clean up sessions older than specified days
        """
        try:
            cutoff_time = datetime.utcnow() - timedelta(days=days_old)
            
            deleted_count = self.db.query(UserSessionDB).filter(
                UserSessionDB.last_accessed < cutoff_time
            ).delete()
            
            self.db.commit()
            logger.info(f"Cleaned up {deleted_count} sessions older than {days_old} days")
            return deleted_count
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error cleaning up old sessions: {e}")
            raise DatabaseError(f"Failed to clean up old sessions: {str(e)}")
    
    def get_session_statistics(self) -> Dict[str, Any]:
        """
        Get session statistics
        """
        try:
            stats = {}
            
            # Total sessions
            stats['total_sessions'] = self.db.query(UserSessionDB).count()
            
            # Active sessions (last 24 hours)
            stats['active_sessions_24h'] = len(self.get_active_sessions(24))
            
            # Active sessions (last week)
            stats['active_sessions_week'] = len(self.get_active_sessions(24 * 7))
            
            # Session age distribution
            now = datetime.utcnow()
            stats['session_age_distribution'] = {
                'last_hour': self.db.query(UserSessionDB).filter(
                    UserSessionDB.last_accessed >= now - timedelta(hours=1)
                ).count(),
                'last_day': self.db.query(UserSessionDB).filter(
                    UserSessionDB.last_accessed >= now - timedelta(days=1)
                ).count(),
                'last_week': self.db.query(UserSessionDB).filter(
                    UserSessionDB.last_accessed >= now - timedelta(days=7)
                ).count(),
                'last_month': self.db.query(UserSessionDB).filter(
                    UserSessionDB.last_accessed >= now - timedelta(days=30)
                ).count(),
            }
            
            logger.debug(f"Retrieved session statistics: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"Error retrieving session statistics: {e}")
            raise DatabaseError(f"Failed to retrieve session statistics: {str(e)}")
    
    def get_preference_value(self, session_id: str, preference_key: str, default_value: Any = None) -> Any:
        """
        Get a specific preference value for a session
        """
        try:
            session = self.get_by_session_id(session_id)
            if not session or not session.preferences:
                return default_value
            
            return session.preferences.get(preference_key, default_value)
            
        except Exception as e:
            logger.error(f"Error retrieving preference {preference_key} for session {session_id}: {e}")
            raise DatabaseError(f"Failed to retrieve preference: {str(e)}")
    
    def set_preference_value(self, session_id: str, preference_key: str, value: Any) -> Optional[UserSessionDB]:
        """
        Set a specific preference value for a session
        """
        try:
            # Validate value is serializable
            json.dumps(value)
            
            session = self.get_by_session_id(session_id)
            if not session:
                return None
            
            # Update specific preference
            preferences = session.preferences or {}
            preferences[preference_key] = value
            
            session.preferences = preferences
            session.last_accessed = func.now()
            
            self.db.commit()
            self.db.refresh(session)
            
            logger.debug(f"Set preference {preference_key} for session {session_id}")
            return session
            
        except json.JSONEncodeError as e:
            raise ValidationError(f"Preference value is not JSON serializable: {str(e)}")
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error setting preference {preference_key} for session {session_id}: {e}")
            raise DatabaseError(f"Failed to set preference: {str(e)}")
    
    def delete_preference(self, session_id: str, preference_key: str) -> Optional[UserSessionDB]:
        """
        Delete a specific preference for a session
        """
        try:
            session = self.get_by_session_id(session_id)
            if not session or not session.preferences:
                return session
            
            preferences = session.preferences.copy()
            if preference_key in preferences:
                del preferences[preference_key]
                
                session.preferences = preferences
                session.last_accessed = func.now()
                
                self.db.commit()
                self.db.refresh(session)
                
                logger.debug(f"Deleted preference {preference_key} for session {session_id}")
            
            return session
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting preference {preference_key} for session {session_id}: {e}")
            raise DatabaseError(f"Failed to delete preference: {str(e)}")
    
    def export_session_data(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Export all session data for backup or migration
        """
        try:
            session = self.get_by_session_id(session_id)
            if not session:
                return None
            
            return {
                'session_id': session.session_id,
                'preferences': session.preferences,
                'last_accessed': session.last_accessed.isoformat() if session.last_accessed else None
            }
            
        except Exception as e:
            logger.error(f"Error exporting session data for {session_id}: {e}")
            raise DatabaseError(f"Failed to export session data: {str(e)}")