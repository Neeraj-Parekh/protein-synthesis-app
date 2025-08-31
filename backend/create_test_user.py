#!/usr/bin/env python3
"""
Create a test user for authentication testing
"""
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from database import get_db
from models.user import UserDB
from passlib.context import CryptContext
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_test_user():
    """Create a test user for authentication testing"""
    db = next(get_db())
    
    try:
        # Check if test user already exists
        existing_user = db.query(UserDB).filter(UserDB.email == "test@example.com").first()
        if existing_user:
            print("✅ Test user already exists: test@example.com")
            print(f"   Username: {existing_user.username}")
            print(f"   Email: {existing_user.email}")
            return
        
        # Create test user
        hashed_password = pwd_context.hash("password123")
        test_user = UserDB(
            username="testuser",
            email="test@example.com",
            hashed_password=hashed_password,
            status="active",
            full_name="Test User"
        )
        
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        
        print("✅ Test user created successfully!")
        print(f"   Username: {test_user.username}")
        print(f"   Email: {test_user.email}")
        print(f"   Password: password123")
        print("\nYou can now log in with these credentials.")
        
    except Exception as e:
        print(f"❌ Error creating test user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_user()
