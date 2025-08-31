"""
Connection configuration for AI service connectivity
"""
from dataclasses import dataclass
from typing import Optional
import os


@dataclass
class ConnectionConfig:
    """Configuration for AI service connections"""
    base_url: str = "http://localhost:8001"
    timeout: float = 60.0
    max_retries: int = 5
    retry_backoff_factor: float = 2.0
    max_retry_delay: float = 60.0
    connection_pool_size: int = 10
    circuit_breaker_threshold: int = 5
    circuit_breaker_timeout: int = 60
    health_check_interval: int = 30
    enable_service_discovery: bool = True
    fallback_enabled: bool = True
    
    @classmethod
    def from_environment(cls) -> 'ConnectionConfig':
        """Create configuration from environment variables"""
        return cls(
            base_url=os.getenv('AI_SERVICE_URL', 'http://localhost:8001'),
            timeout=float(os.getenv('AI_SERVICE_TIMEOUT', '60.0')),
            max_retries=int(os.getenv('AI_SERVICE_MAX_RETRIES', '5')),
            retry_backoff_factor=float(os.getenv('AI_SERVICE_BACKOFF_FACTOR', '2.0')),
            max_retry_delay=float(os.getenv('AI_SERVICE_MAX_RETRY_DELAY', '60.0')),
            connection_pool_size=int(os.getenv('AI_SERVICE_POOL_SIZE', '10')),
            circuit_breaker_threshold=int(os.getenv('AI_SERVICE_CB_THRESHOLD', '5')),
            circuit_breaker_timeout=int(os.getenv('AI_SERVICE_CB_TIMEOUT', '60')),
            health_check_interval=int(os.getenv('AI_SERVICE_HEALTH_INTERVAL', '30')),
            enable_service_discovery=os.getenv('AI_SERVICE_DISCOVERY', 'true').lower() == 'true',
            fallback_enabled=os.getenv('AI_SERVICE_FALLBACK', 'true').lower() == 'true'
        )
    
    def validate(self) -> None:
        """Validate configuration parameters"""
        if self.timeout <= 0:
            raise ValueError("Timeout must be positive")
        if self.max_retries < 0:
            raise ValueError("Max retries must be non-negative")
        if self.retry_backoff_factor <= 1:
            raise ValueError("Backoff factor must be greater than 1")
        if self.max_retry_delay <= 0:
            raise ValueError("Max retry delay must be positive")
        if self.connection_pool_size <= 0:
            raise ValueError("Connection pool size must be positive")
        if self.circuit_breaker_threshold <= 0:
            raise ValueError("Circuit breaker threshold must be positive")
        if self.circuit_breaker_timeout <= 0:
            raise ValueError("Circuit breaker timeout must be positive")
        if self.health_check_interval <= 0:
            raise ValueError("Health check interval must be positive")