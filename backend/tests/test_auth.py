"""
Unit tests for authentication functionality
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import os
import sys

# Add the backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from main import app
from routers.auth import verify_password, get_password_hash, create_access_token

client = TestClient(app)

class TestPasswordUtils:
    """Test password hashing and verification"""
    
    def test_password_hashing(self):
        """Test password hashing works correctly"""
        password = "test_password_123"
        hashed = get_password_hash(password)
        
        assert hashed != password
        assert verify_password(password, hashed) is True
        assert verify_password("wrong_password", hashed) is False
    
    def test_password_hash_different_each_time(self):
        """Test that password hashing produces different results each time"""
        password = "test_password_123"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)
        
        assert hash1 != hash2
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True

class TestTokenGeneration:
    """Test JWT token generation"""
    
    @patch.dict(os.environ, {"JWT_SECRET_KEY": "test_secret_key"})
    def test_create_access_token(self):
        """Test JWT token creation"""
        data = {"sub": "test@example.com"}
        token = create_access_token(data)
        
        assert isinstance(token, str)
        assert len(token) > 0
        assert "." in token  # JWT tokens contain dots

class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    def test_health_endpoint(self):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
    
    def test_register_missing_fields(self):
        """Test registration with missing required fields"""
        response = client.post("/auth/register", json={})
        assert response.status_code == 422
    
    def test_register_invalid_email(self):
        """Test registration with invalid email format"""
        response = client.post("/auth/register", json={
            "email": "invalid_email",
            "password": "password123",
            "full_name": "Test User"
        })
        assert response.status_code == 422
    
    def test_login_missing_credentials(self):
        """Test login with missing credentials"""
        response = client.post("/auth/login", json={})
        assert response.status_code == 422
    
    @patch('routers.auth.send_verification_email')
    def test_register_success(self, mock_send_email):
        """Test successful user registration"""
        mock_send_email.return_value = None
        
        response = client.post("/auth/register", json={
            "email": "test@example.com",
            "password": "password123",
            "full_name": "Test User"
        })
        
        # Should succeed or return conflict if user exists
        assert response.status_code in [200, 201, 409]
    
    def test_login_nonexistent_user(self):
        """Test login with non-existent user"""
        response = client.post("/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "password123"
        })
        assert response.status_code == 401

class TestEmailFunctions:
    """Test email sending functions"""
    
    @patch.dict(os.environ, {
        "SMTP_SERVER": "smtp.gmail.com",
        "SMTP_PORT": "587",
        "SMTP_USERNAME": "test@example.com",
        "SMTP_PASSWORD": "test_password"
    })
    @patch('smtplib.SMTP')
    def test_send_verification_email_success(self, mock_smtp):
        """Test successful verification email sending"""
        from routers.auth import send_verification_email
        
        mock_server = MagicMock()
        mock_smtp.return_value = mock_server
        
        # Should not raise an exception
        send_verification_email("test@example.com", "test_token")
        
        mock_smtp.assert_called_once()
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once()
        mock_server.send_message.assert_called_once()
        mock_server.quit.assert_called_once()
    
    def test_send_verification_email_missing_config(self):
        """Test verification email with missing SMTP configuration"""
        from routers.auth import send_verification_email
        
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValueError, match="SMTP credentials not configured"):
                send_verification_email("test@example.com", "test_token")
    
    @patch.dict(os.environ, {
        "SMTP_SERVER": "smtp.gmail.com",
        "SMTP_PORT": "587",
        "SMTP_USERNAME": "test@example.com",
        "SMTP_PASSWORD": "test_password"
    })
    @patch('smtplib.SMTP')
    def test_send_password_reset_email_success(self, mock_smtp):
        """Test successful password reset email sending"""
        from routers.auth import send_password_reset_email
        
        mock_server = MagicMock()
        mock_smtp.return_value = mock_server
        
        # Should not raise an exception
        send_password_reset_email("test@example.com", "test_token")
        
        mock_smtp.assert_called_once()
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once()
        mock_server.send_message.assert_called_once()
        mock_server.quit.assert_called_once()

if __name__ == "__main__":
    pytest.main([__file__])
