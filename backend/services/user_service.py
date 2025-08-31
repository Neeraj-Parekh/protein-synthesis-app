"""
Service layer for user management operations
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Dict, Any
from datetime import datetime

from models.user import UserDB, UserCreate, UserUpdate, UserRole, UserStatus, AuthUtils


class UserService:
    """Service class for user management operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def list_users(
        self, 
        skip: int = 0, 
        limit: int = 100, 
        role: Optional[UserRole] = None,
        status: Optional[UserStatus] = None
    ) -> List[UserDB]:
        """List users with optional filtering"""
        query = self.db.query(UserDB)
        
        if role:
            query = query.filter(UserDB.role == role.value)
        if status:
            query = query.filter(UserDB.status == status.value)
            
        return query.offset(skip).limit(limit).all()
    
    async def create_user(self, user_create: UserCreate) -> UserDB:
        """Create a new user"""
        # Check if user already exists
        existing_user = self.db.query(UserDB).filter(
            (UserDB.email == user_create.email) | 
            (UserDB.username == user_create.username)
        ).first()
        
        if existing_user:
            raise ValueError("User with this email or username already exists")
        
        # Create new user
        hashed_password = AuthUtils.hash_password(user_create.password)
        
        db_user = UserDB(
            email=user_create.email,
            username=user_create.username,
            hashed_password=hashed_password,
            full_name=user_create.full_name,
            role=user_create.role.value,
            preferences=user_create.preferences
        )
        
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        
        return db_user
    
    async def update_user(self, user_id: int, user_update: UserUpdate) -> Optional[UserDB]:
        """Update user information"""
        user = self.db.query(UserDB).filter(UserDB.id == user_id).first()
        if not user:
            return None
        
        update_data = user_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(user, field):
                if field == "role" and value:
                    setattr(user, field, value.value)
                else:
                    setattr(user, field, value)
        
        user.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    async def get_user_statistics(self) -> Dict[str, Any]:
        """Get comprehensive user statistics"""
        total_users = self.db.query(UserDB).count()
        
        # Count by role
        role_counts = {}
        for role in UserRole:
            count = self.db.query(UserDB).filter(UserDB.role == role.value).count()
            role_counts[role.value] = count
        
        # Count by status
        status_counts = {}
        for status in UserStatus:
            count = self.db.query(UserDB).filter(UserDB.status == status.value).count()
            status_counts[status.value] = count
        
        # Recent registrations (last 30 days)
        thirty_days_ago = datetime.utcnow().replace(day=1)  # Simplified for demo
        recent_registrations = self.db.query(UserDB).filter(
            UserDB.created_at >= thirty_days_ago
        ).count()
        
        # Active users (logged in last 30 days)
        active_users = self.db.query(UserDB).filter(
            UserDB.last_login >= thirty_days_ago
        ).count()
        
        return {
            "total_users": total_users,
            "role_distribution": role_counts,
            "status_distribution": status_counts,
            "recent_registrations": recent_registrations,
            "active_users": active_users,
            "generated_at": datetime.utcnow().isoformat()
        }
