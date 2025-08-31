#!/usr/bin/env python3
"""
Database initialization script for Protein Synthesis Web Application
"""
import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from database import init_database, engine
from models.protein import Base as ProteinBase
from models.user import Base as UserBase

def main():
    """Initialize the database with tables and sample data"""
    try:
        print("Initializing database...")
        
        # Create database directory if it doesn't exist
        db_path = Path("protein_synthesis.db")
        db_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Initialize database
        init_database()
        
        print(f"✅ Database initialized successfully at {db_path.absolute()}")
        print("📊 Tables created:")
        
        # List created tables
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        for table in tables:
            print(f"   - {table}")
            
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()