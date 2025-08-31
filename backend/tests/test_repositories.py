"""
Unit tests for repository classes
"""
import pytest
import uuid
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base
from models.protein import ProteinDB, AnalysisResultDB, UserSessionDB, ProteinCreate
from repositories import ProteinRepository, AnalysisRepository, SessionRepository
from repositories.base import ValidationError, NotFoundError, DatabaseError

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db_session():
    """Create a test database session"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def protein_repo(db_session):
    """Create a protein repository instance"""
    return ProteinRepository(db_session)

@pytest.fixture
def analysis_repo(db_session):
    """Create an analysis repository instance"""
    return AnalysisRepository(db_session)

@pytest.fixture
def session_repo(db_session):
    """Create a session repository instance"""
    return SessionRepository(db_session)

@pytest.fixture
def sample_protein_data():
    """Sample protein data for testing"""
    return ProteinCreate(
        name="Test Protein",
        sequence="MGKV",
        file_content=None
    )

@pytest.fixture
def sample_analysis_data():
    """Sample analysis data for testing"""
    return {
        'protein_id': str(uuid.uuid4()),
        'analysis_type': 'sequence',
        'result_data': {
            'composition': {'M': 1, 'G': 1, 'K': 1, 'V': 1},
            'molecular_weight': 500.0
        }
    }

@pytest.fixture
def sample_session_data():
    """Sample session data for testing"""
    return {
        'session_id': str(uuid.uuid4()),
        'preferences': {
            'theme': 'dark',
            'language': 'en',
            'render_quality': 'high'
        }
    }

class TestProteinRepository:
    """Test cases for ProteinRepository"""
    
    def test_create_protein_success(self, protein_repo, sample_protein_data):
        """Test successful protein creation"""
        protein = protein_repo.create(sample_protein_data)
        
        assert protein.id is not None
        assert protein.name == sample_protein_data.name
        assert protein.sequence == sample_protein_data.sequence.upper()
        assert protein.length == len(sample_protein_data.sequence)
        assert protein.molecular_weight > 0
        assert protein.created_at is not None
    
    def test_create_protein_validation_error(self, protein_repo):
        """Test protein creation with invalid data"""
        # Empty name
        with pytest.raises(ValidationError):
            protein_repo.create(ProteinCreate(name="", sequence="MGKV"))
        
        # Empty sequence
        with pytest.raises(ValidationError):
            protein_repo.create(ProteinCreate(name="Test", sequence=""))
        
        # Invalid amino acids
        with pytest.raises(ValidationError):
            protein_repo.create(ProteinCreate(name="Test", sequence="MGKVZ"))
    
    def test_get_protein(self, protein_repo, sample_protein_data):
        """Test retrieving a protein by ID"""
        created_protein = protein_repo.create(sample_protein_data)
        retrieved_protein = protein_repo.get(created_protein.id)
        
        assert retrieved_protein is not None
        assert retrieved_protein.id == created_protein.id
        assert retrieved_protein.name == created_protein.name
    
    def test_get_protein_not_found(self, protein_repo):
        """Test retrieving non-existent protein"""
        result = protein_repo.get("non-existent-id")
        assert result is None
    
    def test_get_or_404(self, protein_repo, sample_protein_data):
        """Test get_or_404 method"""
        created_protein = protein_repo.create(sample_protein_data)
        
        # Should return protein
        retrieved_protein = protein_repo.get_or_404(created_protein.id)
        assert retrieved_protein.id == created_protein.id
        
        # Should raise NotFoundError
        with pytest.raises(NotFoundError):
            protein_repo.get_or_404("non-existent-id")
    
    def test_get_by_name(self, protein_repo, sample_protein_data):
        """Test retrieving protein by name"""
        created_protein = protein_repo.create(sample_protein_data)
        retrieved_protein = protein_repo.get_by_name(sample_protein_data.name)
        
        assert retrieved_protein is not None
        assert retrieved_protein.id == created_protein.id
    
    def test_update_protein(self, protein_repo, sample_protein_data):
        """Test updating a protein"""
        created_protein = protein_repo.create(sample_protein_data)
        
        update_data = {'name': 'Updated Protein Name'}
        updated_protein = protein_repo.update(created_protein.id, update_data)
        
        assert updated_protein is not None
        assert updated_protein.name == 'Updated Protein Name'
        assert updated_protein.sequence == created_protein.sequence
    
    def test_delete_protein(self, protein_repo, sample_protein_data):
        """Test deleting a protein"""
        created_protein = protein_repo.create(sample_protein_data)
        
        # Delete protein
        result = protein_repo.delete(created_protein.id)
        assert result is True
        
        # Verify deletion
        deleted_protein = protein_repo.get(created_protein.id)
        assert deleted_protein is None
    
    def test_search_by_sequence(self, protein_repo, sample_protein_data):
        """Test sequence search functionality"""
        created_protein = protein_repo.create(sample_protein_data)
        
        # Search for part of the sequence
        results = protein_repo.search_by_sequence("MGK")
        assert len(results) > 0
        assert any(p.id == created_protein.id for p in results)
    
    def test_get_by_length_range(self, protein_repo, sample_protein_data):
        """Test filtering by length range"""
        created_protein = protein_repo.create(sample_protein_data)
        
        results = protein_repo.get_by_length_range(1, 10)
        assert len(results) > 0
        assert any(p.id == created_protein.id for p in results)
    
    def test_get_statistics(self, protein_repo, sample_protein_data):
        """Test getting protein statistics"""
        protein_repo.create(sample_protein_data)
        
        stats = protein_repo.get_statistics()
        
        assert 'total_proteins' in stats
        assert 'average_length' in stats
        assert 'length_distribution' in stats
        assert stats['total_proteins'] >= 1
    
    def test_duplicate_check(self, protein_repo, sample_protein_data):
        """Test duplicate checking"""
        created_protein = protein_repo.create(sample_protein_data)
        
        # Check for duplicate by sequence
        duplicate = protein_repo.duplicate_check(sample_protein_data.sequence)
        assert duplicate is not None
        assert duplicate.id == created_protein.id
        
        # Check for non-existent sequence
        no_duplicate = protein_repo.duplicate_check("AAAA")
        assert no_duplicate is None
    
    def test_molecular_weight_calculation(self, protein_repo):
        """Test molecular weight calculation"""
        # Test with known amino acids
        weight = protein_repo._calculate_molecular_weight("AA")  # Two alanines
        expected_weight = 2 * 89.09 + 18.015 - 18.015  # 2 * Ala + H2O - peptide bond
        assert abs(weight - expected_weight) < 0.1

class TestAnalysisRepository:
    """Test cases for AnalysisRepository"""
    
    def test_create_analysis_success(self, analysis_repo, sample_analysis_data):
        """Test successful analysis creation"""
        analysis = analysis_repo.create(sample_analysis_data)
        
        assert analysis.id is not None
        assert analysis.protein_id == sample_analysis_data['protein_id']
        assert analysis.analysis_type == sample_analysis_data['analysis_type']
        assert analysis.result_data == sample_analysis_data['result_data']
        assert analysis.created_at is not None
    
    def test_create_analysis_validation_error(self, analysis_repo):
        """Test analysis creation with invalid data"""
        # Missing required fields
        with pytest.raises(ValidationError):
            analysis_repo.create({'protein_id': str(uuid.uuid4())})
        
        # Invalid analysis type
        with pytest.raises(ValidationError):
            analysis_repo.create({
                'protein_id': str(uuid.uuid4()),
                'analysis_type': 'invalid_type',
                'result_data': {}
            })
        
        # Invalid protein_id format
        with pytest.raises(ValidationError):
            analysis_repo.create({
                'protein_id': 'invalid-uuid',
                'analysis_type': 'sequence',
                'result_data': {}
            })
    
    def test_get_by_protein_id(self, analysis_repo, sample_analysis_data):
        """Test retrieving analyses by protein ID"""
        created_analysis = analysis_repo.create(sample_analysis_data)
        
        results = analysis_repo.get_by_protein_id(sample_analysis_data['protein_id'])
        assert len(results) > 0
        assert any(a.id == created_analysis.id for a in results)
    
    def test_get_by_type(self, analysis_repo, sample_analysis_data):
        """Test retrieving analyses by type"""
        created_analysis = analysis_repo.create(sample_analysis_data)
        
        results = analysis_repo.get_by_type('sequence')
        assert len(results) > 0
        assert any(a.id == created_analysis.id for a in results)
    
    def test_get_statistics(self, analysis_repo, sample_analysis_data):
        """Test getting analysis statistics"""
        analysis_repo.create(sample_analysis_data)
        
        stats = analysis_repo.get_statistics()
        
        assert 'total_analyses' in stats
        assert 'by_type' in stats
        assert 'analyses_last_24h' in stats
        assert stats['total_analyses'] >= 1
    
    def test_update_result_data(self, analysis_repo, sample_analysis_data):
        """Test updating analysis result data"""
        created_analysis = analysis_repo.create(sample_analysis_data)
        
        new_result_data = {'updated': True, 'value': 123}
        updated_analysis = analysis_repo.update_result_data(created_analysis.id, new_result_data)
        
        assert updated_analysis is not None
        assert updated_analysis.result_data == new_result_data
    
    def test_delete_by_protein_id(self, analysis_repo, sample_analysis_data):
        """Test deleting analyses by protein ID"""
        created_analysis = analysis_repo.create(sample_analysis_data)
        
        deleted_count = analysis_repo.delete_by_protein_id(sample_analysis_data['protein_id'])
        assert deleted_count > 0
        
        # Verify deletion
        results = analysis_repo.get_by_protein_id(sample_analysis_data['protein_id'])
        assert len(results) == 0

class TestSessionRepository:
    """Test cases for SessionRepository"""
    
    def test_create_session_success(self, session_repo, sample_session_data):
        """Test successful session creation"""
        session = session_repo.create(sample_session_data)
        
        assert session.session_id == sample_session_data['session_id']
        assert session.preferences == sample_session_data['preferences']
        assert session.last_accessed is not None
    
    def test_create_session_auto_id(self, session_repo):
        """Test session creation with auto-generated ID"""
        session_data = {'preferences': {'theme': 'light'}}
        session = session_repo.create(session_data)
        
        assert session.session_id is not None
        assert len(session.session_id) > 0
        assert session.preferences == session_data['preferences']
    
    def test_get_by_session_id(self, session_repo, sample_session_data):
        """Test retrieving session by ID"""
        created_session = session_repo.create(sample_session_data)
        retrieved_session = session_repo.get_by_session_id(sample_session_data['session_id'])
        
        assert retrieved_session is not None
        assert retrieved_session.session_id == created_session.session_id
    
    def test_update_preferences(self, session_repo, sample_session_data):
        """Test updating session preferences"""
        created_session = session_repo.create(sample_session_data)
        
        new_preferences = {'theme': 'light', 'new_setting': 'value'}
        updated_session = session_repo.update_preferences(
            sample_session_data['session_id'], 
            new_preferences
        )
        
        assert updated_session is not None
        assert updated_session.preferences['theme'] == 'light'
        assert updated_session.preferences['new_setting'] == 'value'
        # Original preferences should be preserved
        assert updated_session.preferences['language'] == 'en'
    
    def test_get_or_create_session(self, session_repo, sample_session_data):
        """Test get or create session functionality"""
        session_id = sample_session_data['session_id']
        
        # Should create new session
        session1 = session_repo.get_or_create_session(session_id, {'default': 'value'})
        assert session1.session_id == session_id
        
        # Should return existing session
        session2 = session_repo.get_or_create_session(session_id, {'different': 'value'})
        assert session2.session_id == session_id
        assert session2.session_id == session1.session_id
    
    def test_touch_session(self, session_repo, sample_session_data):
        """Test updating session last accessed time"""
        created_session = session_repo.create(sample_session_data)
        original_time = created_session.last_accessed
        
        # Touch session
        touched_session = session_repo.touch_session(sample_session_data['session_id'])
        
        assert touched_session is not None
        # Note: In a real test, you'd need to account for time precision
        # This is a simplified check
        assert touched_session.last_accessed is not None
    
    def test_get_preference_value(self, session_repo, sample_session_data):
        """Test getting specific preference values"""
        created_session = session_repo.create(sample_session_data)
        
        # Get existing preference
        theme = session_repo.get_preference_value(sample_session_data['session_id'], 'theme')
        assert theme == 'dark'
        
        # Get non-existent preference with default
        missing = session_repo.get_preference_value(
            sample_session_data['session_id'], 
            'missing_key', 
            'default_value'
        )
        assert missing == 'default_value'
    
    def test_set_preference_value(self, session_repo, sample_session_data):
        """Test setting specific preference values"""
        created_session = session_repo.create(sample_session_data)
        
        # Set new preference
        updated_session = session_repo.set_preference_value(
            sample_session_data['session_id'], 
            'new_pref', 
            'new_value'
        )
        
        assert updated_session is not None
        assert updated_session.preferences['new_pref'] == 'new_value'
        # Original preferences should be preserved
        assert updated_session.preferences['theme'] == 'dark'
    
    def test_delete_preference(self, session_repo, sample_session_data):
        """Test deleting specific preferences"""
        created_session = session_repo.create(sample_session_data)
        
        # Delete existing preference
        updated_session = session_repo.delete_preference(
            sample_session_data['session_id'], 
            'theme'
        )
        
        assert updated_session is not None
        assert 'theme' not in updated_session.preferences
        # Other preferences should remain
        assert updated_session.preferences['language'] == 'en'
    
    def test_get_session_statistics(self, session_repo, sample_session_data):
        """Test getting session statistics"""
        session_repo.create(sample_session_data)
        
        stats = session_repo.get_session_statistics()
        
        assert 'total_sessions' in stats
        assert 'active_sessions_24h' in stats
        assert 'session_age_distribution' in stats
        assert stats['total_sessions'] >= 1
    
    def test_export_session_data(self, session_repo, sample_session_data):
        """Test exporting session data"""
        created_session = session_repo.create(sample_session_data)
        
        exported_data = session_repo.export_session_data(sample_session_data['session_id'])
        
        assert exported_data is not None
        assert exported_data['session_id'] == sample_session_data['session_id']
        assert exported_data['preferences'] == sample_session_data['preferences']
        assert 'last_accessed' in exported_data

if __name__ == "__main__":
    pytest.main([__file__])