#!/usr/bin/env python3
"""
Create default users for Protein Synthesis Web Application
"""
import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from database import get_db
from models.user import UserDB, UserRole, UserStatus, AuthUtils
from sqlalchemy.orm import Session
import secrets
from datetime import datetime

def create_default_users():
    """Create default users for testing and demo"""
    
    default_users = [
        {
            "username": "admin",
            "email": "admin@protein-synthesis.local",
            "password": "admin123",
            "full_name": "System Administrator",
            "role": UserRole.ADMIN,
            "status": UserStatus.ACTIVE
        },
        {
            "username": "researcher",
            "email": "researcher@protein-synthesis.local", 
            "password": "research123",
            "full_name": "Dr. Protein Researcher",
            "role": UserRole.RESEARCHER,
            "status": UserStatus.ACTIVE
        },
        {
            "username": "student",
            "email": "student@protein-synthesis.local",
            "password": "student123",
            "full_name": "Student User",
            "role": UserRole.STUDENT,
            "status": UserStatus.ACTIVE
        },
        {
            "username": "demo",
            "email": "demo@protein-synthesis.local",
            "password": "demo123",
            "full_name": "Demo User",
            "role": UserRole.GUEST,
            "status": UserStatus.ACTIVE
        }
    ]
    
    # Get database session
    db_gen = get_db()
    db: Session = next(db_gen)
    
    try:
        created_users = []
        
        for user_data in default_users:
            # Check if user already exists
            existing_user = db.query(UserDB).filter(
                (UserDB.email == user_data["email"]) | 
                (UserDB.username == user_data["username"])
            ).first()
            
            if existing_user:
                print(f"⚠️  User {user_data['username']} already exists, skipping...")
                continue
            
            # Create new user with proper field names
            new_user = UserDB(
                username=user_data["username"],
                email=user_data["email"],
                full_name=user_data["full_name"],
                hashed_password=AuthUtils.hash_password(user_data["password"]),
                role=user_data["role"].value,
                status=user_data["status"].value,
                is_verified=True,  # Auto-verify for demo users
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            db.add(new_user)
            created_users.append(user_data)
        
        # Commit all changes
        db.commit()
        
        print("🎉 Default users created successfully!")
        print("=====================================")
        print()
        
        for user in created_users:
            print(f"👤 {user['role'].value.upper()} USER:")
            print(f"   Username: {user['username']}")
            print(f"   Email: {user['email']}")
            print(f"   Password: {user['password']}")
            print(f"   Role: {user['role'].value}")
            print()
        
        print("🔗 Login URL: http://localhost:5173")
        print("📖 API Docs: http://localhost:8001/docs")
        print()
        print("💡 You can use any of these credentials to log into the application!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating users: {e}")
        raise
    finally:
        db.close()

def main():
    """Main function"""
    try:
        print("🧬 Creating default users for Protein Synthesis App...")
        print("====================================================")
        create_default_users()
        
    except Exception as e:
        print(f"❌ Failed to create default users: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
