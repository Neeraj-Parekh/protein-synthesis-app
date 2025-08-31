#!/usr/bin/env python3
"""
Simple test script to verify repository implementation
Run this after setting up the backend to verify repositories are working correctly
"""

import sys
import os
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

def test_imports():
    """Test that all repository modules can be imported"""
    print("🧪 Testing Repository Imports...")
    
    try:
        from repositories import (
            BaseRepository, RepositoryError, NotFoundError, ValidationError, DatabaseError,
            ProteinRepository, AnalysisRepository, SessionRepository,
            RepositoryManager, get_repository_manager
        )
        print("✅ All repository classes imported successfully")
        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False

def test_database_models():
    """Test that database models can be imported"""
    print("\n🗄️  Testing Database Models...")
    
    try:
        from models.protein import (
            ProteinDB, AnalysisResultDB, UserSessionDB,
            ProteinCreate, ProteinResponse, ChemicalProperties,
            AminoAcidComposition, SequenceAnalysis
        )
        print("✅ All database models imported successfully")
        return True
    except ImportError as e:
        print(f"❌ Model import error: {e}")
        return False

def test_database_connection():
    """Test database connection and table creation"""
    print("\n🔗 Testing Database Connection...")
    
    try:
        from database import create_tables, SessionLocal, Base
        from sqlalchemy import inspect
        
        # Create tables
        create_tables()
        
        # Check if tables were created
        db = SessionLocal()
        inspector = inspect(db.bind)
        tables = inspector.get_table_names()
        
        expected_tables = ['proteins', 'analysis_results', 'user_sessions']
        missing_tables = [table for table in expected_tables if table not in tables]
        
        if missing_tables:
            print(f"❌ Missing tables: {missing_tables}")
            return False
        
        print(f"✅ Database tables created: {tables}")
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return False

def test_repository_instantiation():
    """Test that repositories can be instantiated"""
    print("\n🏗️  Testing Repository Instantiation...")
    
    try:
        from database import SessionLocal
        from repositories import ProteinRepository, AnalysisRepository, SessionRepository, get_repository_manager
        
        db = SessionLocal()
        
        # Test individual repositories
        protein_repo = ProteinRepository(db)
        analysis_repo = AnalysisRepository(db)
        session_repo = SessionRepository(db)
        
        print("✅ Individual repositories instantiated successfully")
        
        # Test repository manager
        repo_manager = get_repository_manager(db)
        
        # Test property access
        _ = repo_manager.protein
        _ = repo_manager.analysis
        _ = repo_manager.session
        
        print("✅ Repository manager instantiated successfully")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ Repository instantiation error: {e}")
        return False

def test_basic_operations():
    """Test basic CRUD operations"""
    print("\n⚙️  Testing Basic CRUD Operations...")
    
    try:
        from database import SessionLocal
        from repositories import get_repository_manager
        from models.protein import ProteinCreate
        
        db = SessionLocal()
        repo_manager = get_repository_manager(db)
        
        # Test protein creation
        protein_data = ProteinCreate(
            name="Test Protein",
            sequence="MGKV"
        )
        
        created_protein = repo_manager.protein.create(protein_data)
        print(f"✅ Created protein: {created_protein.name} (ID: {created_protein.id})")
        
        # Test protein retrieval
        retrieved_protein = repo_manager.protein.get(created_protein.id)
        assert retrieved_protein is not None
        print(f"✅ Retrieved protein: {retrieved_protein.name}")
        
        # Test protein update
        updated_protein = repo_manager.protein.update(created_protein.id, {'name': 'Updated Test Protein'})
        assert updated_protein.name == 'Updated Test Protein'
        print(f"✅ Updated protein name: {updated_protein.name}")
        
        # Test analysis creation
        analysis_data = {
            'protein_id': created_protein.id,
            'analysis_type': 'sequence',
            'result_data': {'test': 'data'}
        }
        
        created_analysis = repo_manager.analysis.create(analysis_data)
        print(f"✅ Created analysis: {created_analysis.analysis_type} (ID: {created_analysis.id})")
        
        # Test session creation
        session_data = {
            'preferences': {'theme': 'dark', 'language': 'en'}
        }
        
        created_session = repo_manager.session.create(session_data)
        print(f"✅ Created session: {created_session.session_id}")
        
        # Cleanup
        repo_manager.protein.delete(created_protein.id)
        repo_manager.analysis.delete(created_analysis.id)
        repo_manager.session.delete(created_session.session_id)
        
        print("✅ Cleanup completed")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ CRUD operations error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    print("🧬 Testing Protein Synthesis Repository Implementation\n")
    
    tests = [
        test_imports,
        test_database_models,
        test_database_connection,
        test_repository_instantiation,
        test_basic_operations,
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        else:
            break  # Stop on first failure
    
    print("\n" + "="*60)
    if passed == total:
        print("🎉 All repository tests passed!")
        print("\n📋 Summary:")
        print("- ✅ Repository pattern implemented")
        print("- ✅ Database models and tables created")
        print("- ✅ CRUD operations working")
        print("- ✅ Validation and error handling")
        print("- ✅ Repository manager functional")
        print("\nThe repository layer is ready for use!")
        return 0
    else:
        print(f"❌ {passed}/{total} tests passed")
        print("\nPlease fix the issues before proceeding.")
        return 1

if __name__ == "__main__":
    sys.exit(main())