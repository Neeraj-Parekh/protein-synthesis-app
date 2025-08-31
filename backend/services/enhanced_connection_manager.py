"""
Enhanced connection manager with retry logic, connection pooling, and detailed logging
"""
import asyncio
import logging
import time
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import httpx
import json

from .connection_config import ConnectionConfig


# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ConnectionMetrics:
    """Track connection performance metrics"""
    
    def __init__(self):
        self.total_requests = 0
        self.successful_requests = 0
        self.failed_requests = 0
        self.total_response_time = 0.0
        self.last_updated = datetime.now()
        self.error_history = []
    
    def record_success(self, response_time: float):
        """Record successful request"""
        self.total_requests += 1
        self.successful_requests += 1
        self.total_response_time += response_time
        self.last_updated = datetime.now()
    
    def record_failure(self, error: str, response_time: float = 0.0):
        """Record failed request"""
        self.total_requests += 1
        self.failed_requests += 1
        self.total_response_time += response_time
        self.error_history.append({
            'error': error,
            'timestamp': datetime.now(),
            'response_time': response_time
        })
        # Keep only last 100 errors
        if len(self.error_history) > 100:
            self.error_history.pop(0)
        self.last_updated = datetime.now()
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate"""
        if self.total_requests == 0:
            return 0.0
        return self.successful_requests / self.total_requests
    
    @property
    def error_rate(self) -> float:
        """Calculate error rate"""
        return 1.0 - self.success_rate
    
    @property
    def average_response_time(self) -> float:
        """Calculate average response time"""
        if self.total_requests == 0:
            return 0.0
        return self.total_response_time / self.total_requests
    
    def get_recent_errors(self, minutes: int = 5) -> list:
        """Get errors from the last N minutes"""
        cutoff = datetime.now() - timedelta(minutes=minutes)
        return [
            error for error in self.error_history
            if error['timestamp'] > cutoff
        ]


class EnhancedConnectionManager:
    """Advanced connection management with retry, pooling, and detailed logging"""
    
    def __init__(self, config: Optional[ConnectionConfig] = None):
        self.config = config or ConnectionConfig.from_environment()
        self.config.validate()
        
        # Initialize HTTP client with connection pooling
        limits = httpx.Limits(
            max_keepalive_connections=self.config.connection_pool_size,
            max_connections=self.config.connection_pool_size * 2
        )
        
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(self.config.timeout),
            limits=limits
        )
        
        self.metrics = ConnectionMetrics()
        self._request_id_counter = 0
        
        logger.info(f"Enhanced connection manager initialized with config: {self.config}")
    
    def _get_next_request_id(self) -> str:
        """Generate unique request ID for tracking"""
        self._request_id_counter += 1
        return f"req_{int(time.time())}_{self._request_id_counter}"
    
    def _log_request(self, request_id: str, method: str, endpoint: str, attempt: int, **kwargs):
        """Log request details in structured format"""
        log_data = {
            'request_id': request_id,
            'method': method,
            'endpoint': endpoint,
            'attempt': attempt,
            'base_url': self.config.base_url,
            'timestamp': datetime.now().isoformat()
        }
        
        # Add request body size if present
        if 'json' in kwargs:
            try:
                body_size = len(json.dumps(kwargs['json']))
                log_data['request_body_size'] = body_size
            except:
                pass
        
        logger.info(f"Making request: {json.dumps(log_data)}")
    
    def _log_response(self, request_id: str, response: httpx.Response, response_time: float):
        """Log response details in structured format"""
        log_data = {
            'request_id': request_id,
            'status_code': response.status_code,
            'response_time_ms': round(response_time * 1000, 2),
            'response_size': len(response.content) if response.content else 0,
            'timestamp': datetime.now().isoformat()
        }
        
        logger.info(f"Response received: {json.dumps(log_data)}")
    
    def _log_error(self, request_id: str, error: Exception, attempt: int, response_time: float):
        """Log error details in structured format"""
        log_data = {
            'request_id': request_id,
            'error_type': type(error).__name__,
            'error_message': str(error),
            'attempt': attempt,
            'response_time_ms': round(response_time * 1000, 2),
            'timestamp': datetime.now().isoformat()
        }
        
        # Add additional context for HTTP errors
        if isinstance(error, httpx.HTTPStatusError):
            log_data['status_code'] = error.response.status_code
            log_data['response_text'] = error.response.text[:500]  # Truncate long responses
        
        logger.error(f"Request failed: {json.dumps(log_data)}")
    
    async def make_request(self, method: str, endpoint: str, **kwargs) -> httpx.Response:
        """
        Make HTTP request with comprehensive retry logic and logging
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint path
            **kwargs: Additional arguments for httpx request
            
        Returns:
            httpx.Response: The successful response
            
        Raises:
            httpx.RequestError: If all retry attempts fail
        """
        request_id = self._get_next_request_id()
        url = f"{self.config.base_url}{endpoint}"
        
        last_exception = None
        
        for attempt in range(1, self.config.max_retries + 1):
            start_time = time.time()
            
            try:
                # Log the request attempt
                self._log_request(request_id, method, endpoint, attempt, **kwargs)
                
                # Make the HTTP request
                response = await self.client.request(method, url, **kwargs)
                response_time = time.time() - start_time
                
                # Log successful response
                self._log_response(request_id, response, response_time)
                
                # Check for HTTP errors
                response.raise_for_status()
                
                # Record success metrics
                self.metrics.record_success(response_time)
                
                logger.info(f"Request {request_id} succeeded on attempt {attempt}")
                return response
                
            except (httpx.RequestError, httpx.HTTPStatusError) as e:
                response_time = time.time() - start_time
                last_exception = e
                
                # Log the error
                self._log_error(request_id, e, attempt, response_time)
                
                # Record failure metrics
                self.metrics.record_failure(str(e), response_time)
                
                # If this was the last attempt, don't wait
                if attempt == self.config.max_retries:
                    logger.error(f"Request {request_id} failed after {attempt} attempts")
                    break
                
                # Calculate delay with exponential backoff
                delay = min(
                    self.config.retry_backoff_factor ** (attempt - 1),
                    self.config.max_retry_delay
                )
                
                logger.warning(
                    f"Request {request_id} attempt {attempt} failed: {e}. "
                    f"Retrying in {delay:.2f}s..."
                )
                
                await asyncio.sleep(delay)
        
        # All attempts failed
        logger.error(f"Request {request_id} failed after all {self.config.max_retries} attempts")
        raise last_exception
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Perform health check on the AI service
        
        Returns:
            Dict containing health status information
        """
        try:
            start_time = time.time()
            response = await self.make_request('GET', '/health')
            response_time = time.time() - start_time
            
            health_data = response.json()
            
            return {
                'status': 'healthy',
                'response_time': response_time,
                'service_info': health_data,
                'connection_metrics': {
                    'success_rate': self.metrics.success_rate,
                    'average_response_time': self.metrics.average_response_time,
                    'total_requests': self.metrics.total_requests
                },
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'error_type': type(e).__name__,
                'connection_metrics': {
                    'success_rate': self.metrics.success_rate,
                    'average_response_time': self.metrics.average_response_time,
                    'total_requests': self.metrics.total_requests,
                    'recent_errors': self.metrics.get_recent_errors()
                },
                'timestamp': datetime.now().isoformat()
            }
    
    def get_connection_metrics(self) -> Dict[str, Any]:
        """Get detailed connection performance metrics"""
        return {
            'total_requests': self.metrics.total_requests,
            'successful_requests': self.metrics.successful_requests,
            'failed_requests': self.metrics.failed_requests,
            'success_rate': self.metrics.success_rate,
            'error_rate': self.metrics.error_rate,
            'average_response_time': self.metrics.average_response_time,
            'recent_errors': self.metrics.get_recent_errors(),
            'last_updated': self.metrics.last_updated.isoformat(),
            'config': {
                'base_url': self.config.base_url,
                'max_retries': self.config.max_retries,
                'timeout': self.config.timeout,
                'connection_pool_size': self.config.connection_pool_size
            }
        }
    
    async def close(self):
        """Close the HTTP client and cleanup resources"""
        await self.client.aclose()
        logger.info("Enhanced connection manager closed")
    
    async def __aenter__(self):
        """Async context manager entry"""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()