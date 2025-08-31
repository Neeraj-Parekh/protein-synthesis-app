"""
Unit tests for Enhanced Connection Manager
"""
import pytest
import asyncio
import httpx
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timedelta

from services.connection_config import ConnectionConfig
from services.enhanced_connection_manager import EnhancedConnectionManager, ConnectionMetrics


class TestConnectionConfig:
    """Test ConnectionConfig class"""
    
    def test_default_config(self):
        """Test default configuration values"""
        config = ConnectionConfig()
        assert config.base_url == "http://localhost:8001"
        assert config.timeout == 60.0
        assert config.max_retries == 5
        assert config.retry_backoff_factor == 2.0
        assert config.max_retry_delay == 60.0
        assert config.connection_pool_size == 10
    
    def test_from_environment(self):
        """Test configuration from environment variables"""
        with patch.dict('os.environ', {
            'AI_SERVICE_URL': 'http://test:8002',
            'AI_SERVICE_TIMEOUT': '30.0',
            'AI_SERVICE_MAX_RETRIES': '3'
        }):
            config = ConnectionConfig.from_environment()
            assert config.base_url == 'http://test:8002'
            assert config.timeout == 30.0
            assert config.max_retries == 3
    
    def test_config_validation(self):
        """Test configuration validation"""
        config = ConnectionConfig(timeout=-1)
        with pytest.raises(ValueError, match="Timeout must be positive"):
            config.validate()
        
        config = ConnectionConfig(max_retries=-1)
        with pytest.raises(ValueError, match="Max retries must be non-negative"):
            config.validate()
        
        config = ConnectionConfig(retry_backoff_factor=0.5)
        with pytest.raises(ValueError, match="Backoff factor must be greater than 1"):
            config.validate()


class TestConnectionMetrics:
    """Test ConnectionMetrics class"""
    
    def test_initial_metrics(self):
        """Test initial metrics state"""
        metrics = ConnectionMetrics()
        assert metrics.total_requests == 0
        assert metrics.successful_requests == 0
        assert metrics.failed_requests == 0
        assert metrics.success_rate == 0.0
        assert metrics.error_rate == 1.0
        assert metrics.average_response_time == 0.0
    
    def test_record_success(self):
        """Test recording successful requests"""
        metrics = ConnectionMetrics()
        metrics.record_success(0.5)
        metrics.record_success(1.0)
        
        assert metrics.total_requests == 2
        assert metrics.successful_requests == 2
        assert metrics.failed_requests == 0
        assert metrics.success_rate == 1.0
        assert metrics.error_rate == 0.0
        assert metrics.average_response_time == 0.75
    
    def test_record_failure(self):
        """Test recording failed requests"""
        metrics = ConnectionMetrics()
        metrics.record_failure("Connection error", 0.1)
        metrics.record_failure("Timeout", 2.0)
        
        assert metrics.total_requests == 2
        assert metrics.successful_requests == 0
        assert metrics.failed_requests == 2
        assert metrics.success_rate == 0.0
        assert metrics.error_rate == 1.0
        assert metrics.average_response_time == 1.05
        assert len(metrics.error_history) == 2
    
    def test_mixed_requests(self):
        """Test mixed successful and failed requests"""
        metrics = ConnectionMetrics()
        metrics.record_success(0.5)
        metrics.record_failure("Error", 1.0)
        metrics.record_success(1.5)
        
        assert metrics.total_requests == 3
        assert metrics.successful_requests == 2
        assert metrics.failed_requests == 1
        assert metrics.success_rate == 2/3
        assert metrics.error_rate == 1/3
        assert metrics.average_response_time == 1.0
    
    def test_recent_errors(self):
        """Test getting recent errors"""
        metrics = ConnectionMetrics()
        
        # Add old error
        old_error = {
            'error': 'Old error',
            'timestamp': datetime.now() - timedelta(minutes=10),
            'response_time': 1.0
        }
        metrics.error_history.append(old_error)
        
        # Add recent error
        metrics.record_failure("Recent error", 0.5)
        
        recent_errors = metrics.get_recent_errors(minutes=5)
        assert len(recent_errors) == 1
        assert recent_errors[0]['error'] == "Recent error"


class TestEnhancedConnectionManager:
    """Test EnhancedConnectionManager class"""
    
    @pytest.fixture
    def config(self):
        """Test configuration"""
        return ConnectionConfig(
            base_url="http://test:8001",
            timeout=10.0,
            max_retries=3,
            retry_backoff_factor=2.0,
            max_retry_delay=5.0
        )
    
    @pytest.fixture
    def manager(self, config):
        """Test connection manager"""
        return EnhancedConnectionManager(config)
    
    @pytest.mark.asyncio
    async def test_successful_request(self, manager):
        """Test successful HTTP request"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = b'{"result": "success"}'
        mock_response.raise_for_status = MagicMock()
        
        with patch.object(manager.client, 'request', return_value=mock_response) as mock_request:
            response = await manager.make_request('GET', '/test')
            
            assert response == mock_response
            mock_request.assert_called_once_with('GET', 'http://test:8001/test')
            assert manager.metrics.total_requests == 1
            assert manager.metrics.successful_requests == 1
    
    @pytest.mark.asyncio
    async def test_retry_on_failure(self, manager):
        """Test retry logic on request failure"""
        # Mock first two attempts to fail, third to succeed
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        
        side_effects = [
            httpx.RequestError("Connection failed"),
            httpx.RequestError("Connection failed"),
            mock_response
        ]
        
        with patch.object(manager.client, 'request', side_effect=side_effects):
            with patch('asyncio.sleep') as mock_sleep:  # Speed up test
                response = await manager.make_request('GET', '/test')
                
                assert response == mock_response
                assert manager.metrics.total_requests == 3
                assert manager.metrics.successful_requests == 1
                assert manager.metrics.failed_requests == 2
                
                # Check that sleep was called with exponential backoff
                assert mock_sleep.call_count == 2
                mock_sleep.assert_any_call(1.0)  # First retry delay
                mock_sleep.assert_any_call(2.0)  # Second retry delay
    
    @pytest.mark.asyncio
    async def test_max_retries_exceeded(self, manager):
        """Test behavior when max retries are exceeded"""
        error = httpx.RequestError("Connection failed")
        
        with patch.object(manager.client, 'request', side_effect=error):
            with patch('asyncio.sleep'):  # Speed up test
                with pytest.raises(httpx.RequestError):
                    await manager.make_request('GET', '/test')
                
                assert manager.metrics.total_requests == 3  # max_retries = 3
                assert manager.metrics.successful_requests == 0
                assert manager.metrics.failed_requests == 3
    
    @pytest.mark.asyncio
    async def test_http_status_error_retry(self, manager):
        """Test retry on HTTP status errors"""
        # Mock 500 error response
        mock_error_response = MagicMock()
        mock_error_response.status_code = 500
        mock_error_response.text = "Internal Server Error"
        
        # Mock successful response
        mock_success_response = MagicMock()
        mock_success_response.status_code = 200
        mock_success_response.raise_for_status = MagicMock()
        
        side_effects = [
            httpx.HTTPStatusError("Server error", request=MagicMock(), response=mock_error_response),
            mock_success_response
        ]
        
        with patch.object(manager.client, 'request', side_effect=side_effects):
            with patch('asyncio.sleep'):  # Speed up test
                response = await manager.make_request('GET', '/test')
                
                assert response == mock_success_response
                assert manager.metrics.total_requests == 2
                assert manager.metrics.successful_requests == 1
                assert manager.metrics.failed_requests == 1
    
    @pytest.mark.asyncio
    async def test_exponential_backoff_delay(self, manager):
        """Test exponential backoff delay calculation"""
        error = httpx.RequestError("Connection failed")
        
        with patch.object(manager.client, 'request', side_effect=error):
            with patch('asyncio.sleep') as mock_sleep:
                with pytest.raises(httpx.RequestError):
                    await manager.make_request('GET', '/test')
                
                # Check exponential backoff: 1, 2, 4 (but capped at max_retry_delay=5)
                expected_delays = [1.0, 2.0]  # Only 2 sleeps for 3 attempts
                actual_delays = [call[0][0] for call in mock_sleep.call_args_list]
                assert actual_delays == expected_delays
    
    @pytest.mark.asyncio
    async def test_max_retry_delay_cap(self):
        """Test that retry delay is capped at max_retry_delay"""
        config = ConnectionConfig(
            max_retries=5,
            retry_backoff_factor=2.0,
            max_retry_delay=3.0  # Low cap for testing
        )
        manager = EnhancedConnectionManager(config)
        
        error = httpx.RequestError("Connection failed")
        
        with patch.object(manager.client, 'request', side_effect=error):
            with patch('asyncio.sleep') as mock_sleep:
                with pytest.raises(httpx.RequestError):
                    await manager.make_request('GET', '/test')
                
                # Delays should be: 1, 2, 3, 3 (capped at 3.0)
                expected_delays = [1.0, 2.0, 3.0, 3.0]
                actual_delays = [call[0][0] for call in mock_sleep.call_args_list]
                assert actual_delays == expected_delays
    
    @pytest.mark.asyncio
    async def test_health_check_success(self, manager):
        """Test successful health check"""
        mock_response = MagicMock()
        mock_response.json.return_value = {"status": "healthy", "models": ["protgpt2"]}
        
        with patch.object(manager, 'make_request', return_value=mock_response):
            health = await manager.health_check()
            
            assert health['status'] == 'healthy'
            assert 'response_time' in health
            assert 'service_info' in health
            assert 'connection_metrics' in health
    
    @pytest.mark.asyncio
    async def test_health_check_failure(self, manager):
        """Test health check failure"""
        error = httpx.RequestError("Connection failed")
        
        with patch.object(manager, 'make_request', side_effect=error):
            health = await manager.health_check()
            
            assert health['status'] == 'unhealthy'
            assert health['error'] == 'Connection failed'
            assert health['error_type'] == 'RequestError'
            assert 'connection_metrics' in health
    
    def test_get_connection_metrics(self, manager):
        """Test getting connection metrics"""
        # Add some test data
        manager.metrics.record_success(0.5)
        manager.metrics.record_failure("Test error", 1.0)
        
        metrics = manager.get_connection_metrics()
        
        assert metrics['total_requests'] == 2
        assert metrics['successful_requests'] == 1
        assert metrics['failed_requests'] == 1
        assert metrics['success_rate'] == 0.5
        assert metrics['error_rate'] == 0.5
        assert 'config' in metrics
        assert metrics['config']['base_url'] == 'http://test:8001'
    
    @pytest.mark.asyncio
    async def test_context_manager(self, config):
        """Test async context manager functionality"""
        async with EnhancedConnectionManager(config) as manager:
            assert isinstance(manager, EnhancedConnectionManager)
            # Manager should be usable within context
            metrics = manager.get_connection_metrics()
            assert metrics['total_requests'] == 0
        
        # After context exit, client should be closed
        # We can't easily test this without accessing private attributes
    
    def test_request_id_generation(self, manager):
        """Test unique request ID generation"""
        id1 = manager._get_next_request_id()
        id2 = manager._get_next_request_id()
        
        assert id1 != id2
        assert id1.startswith('req_')
        assert id2.startswith('req_')


if __name__ == "__main__":
    pytest.main([__file__])