"""
Model Manager for AI Service
Handles loading, unloading, and management of AI models
"""

import asyncio
import logging
import psutil
import torch
from typing import Dict, Optional, Any
from pathlib import Path
import json
import time

from models.responses import ModelStatusResponse

logger = logging.getLogger(__name__)

class ModelManager:
    """Manages AI models with memory optimization and caching"""
    
    def __init__(self, model_path: str = "./models", max_memory_gb: float = 4.0):
        self.model_path = Path(model_path)
        self.max_memory_bytes = max_memory_gb * 1024 * 1024 * 1024
        self.loaded_models: Dict[str, Any] = {}
        self.model_usage: Dict[str, float] = {}
        self.model_configs: Dict[str, Dict] = {}
        
        # Supported models
        self.supported_models = {
            "protflash": {
                "path": "protflash",
                "type": "transformer",
                "memory_estimate": 1.5 * 1024 * 1024 * 1024,  # 1.5GB
                "description": "Lightweight protein language model"
            },
            "protgpt2": {
                "path": "protgpt2", 
                "type": "gpt2",
                "memory_estimate": 2.0 * 1024 * 1024 * 1024,  # 2GB
                "description": "GPT-2 based protein generation model"
            },
            "geneverse": {
                "path": "geneverse",
                "type": "fine_tuned",
                "memory_estimate": 1.0 * 1024 * 1024 * 1024,  # 1GB
                "description": "Parameter-efficient fine-tuned model"
            }
        }
    
    async def initialize(self):
        """Initialize the model manager"""
        logger.info("Initializing Model Manager...")
        
        # Create model directory if it doesn't exist
        self.model_path.mkdir(parents=True, exist_ok=True)
        
        # Load model configurations
        await self._load_model_configs()
        
        # Pre-load default model (protflash) if available
        try:
            await self.load_model("protflash")
        except Exception as e:
            logger.warning(f"Could not pre-load protflash model: {e}")
        
        logger.info("Model Manager initialized")
    
    async def _load_model_configs(self):
        """Load model configurations from files"""
        for model_name in self.supported_models:
            config_path = self.model_path / model_name / "config.json"
            if config_path.exists():
                try:
                    with open(config_path, 'r') as f:
                        self.model_configs[model_name] = json.load(f)
                except Exception as e:
                    logger.warning(f"Could not load config for {model_name}: {e}")
                    self.model_configs[model_name] = {}
            else:
                self.model_configs[model_name] = {}
    
    async def load_model(self, model_name: str) -> bool:
        """Load a specific model into memory"""
        if model_name not in self.supported_models:
            raise ValueError(f"Unsupported model: {model_name}")
        
        if model_name in self.loaded_models:
            logger.info(f"Model {model_name} already loaded")
            self.model_usage[model_name] = time.time()
            return True
        
        # Check memory constraints
        estimated_memory = self.supported_models[model_name]["memory_estimate"]
        current_memory = self.get_memory_usage()
        
        if current_memory + estimated_memory > self.max_memory_bytes:
            logger.info("Memory limit would be exceeded, unloading least used model")
            await self._unload_least_used_model()
        
        try:
            logger.info(f"Loading model: {model_name}")
            model_path = self.model_path / model_name
            
            if not model_path.exists():
                # Create placeholder model for development
                logger.warning(f"Model path {model_path} not found, creating placeholder")
                await self._create_placeholder_model(model_name, model_path)
            
            # Load the actual model (placeholder implementation)
            model = await self._load_model_implementation(model_name, model_path)
            
            self.loaded_models[model_name] = model
            self.model_usage[model_name] = time.time()
            
            logger.info(f"Successfully loaded model: {model_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load model {model_name}: {e}")
            raise
    
    async def _create_placeholder_model(self, model_name: str, model_path: Path):
        """Create a placeholder model for development"""
        model_path.mkdir(parents=True, exist_ok=True)
        
        # Create basic config
        config = {
            "model_name": model_name,
            "model_type": self.supported_models[model_name]["type"],
            "vocab_size": 20,  # 20 amino acids
            "max_length": 1000,
            "created": time.time(),
            "placeholder": True
        }
        
        config_path = model_path / "config.json"
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)
        
        logger.info(f"Created placeholder model at {model_path}")
    
    async def _load_model_implementation(self, model_name: str, model_path: Path):
        """Load the actual model implementation"""
        # This is a placeholder implementation
        # In a real implementation, you would load the actual model files
        
        class PlaceholderModel:
            def __init__(self, name: str, path: Path):
                self.name = name
                self.path = path
                self.config = {}
                
                # Load config if exists
                config_path = path / "config.json"
                if config_path.exists():
                    with open(config_path, 'r') as f:
                        self.config = json.load(f)
            
            async def generate(self, prompt: str = "", max_length: int = 100, **kwargs):
                """Generate protein sequence"""
                # Placeholder generation logic
                amino_acids = "ACDEFGHIKLMNPQRSTVWY"
                import random
                sequence = ''.join(random.choices(amino_acids, k=max_length))
                return {
                    "sequence": sequence,
                    "confidence": 0.85,
                    "model": self.name
                }
            
            async def optimize(self, sequence: str, objectives: list, **kwargs):
                """Optimize protein sequence"""
                # Placeholder optimization logic
                optimized = sequence  # In real implementation, this would be optimized
                return {
                    "original_sequence": sequence,
                    "optimized_sequence": optimized,
                    "improvements": [
                        {
                            "objective": obj,
                            "score_improvement": 0.1,
                            "confidence": 0.8
                        } for obj in objectives
                    ]
                }
            
            def get_memory_usage(self):
                """Get model memory usage"""
                return self.config.get("memory_estimate", 1024 * 1024 * 1024)  # 1GB default
        
        return PlaceholderModel(model_name, model_path)
    
    async def unload_model(self, model_name: str):
        """Unload a model from memory"""
        if model_name in self.loaded_models:
            del self.loaded_models[model_name]
            if model_name in self.model_usage:
                del self.model_usage[model_name]
            
            # Force garbage collection
            import gc
            gc.collect()
            
            logger.info(f"Unloaded model: {model_name}")
        else:
            logger.warning(f"Model {model_name} was not loaded")
    
    async def _unload_least_used_model(self):
        """Unload the least recently used model"""
        if not self.model_usage:
            return
        
        least_used = min(self.model_usage.items(), key=lambda x: x[1])
        await self.unload_model(least_used[0])
    
    def get_model(self, model_name: str):
        """Get a loaded model"""
        if model_name not in self.loaded_models:
            raise ValueError(f"Model {model_name} is not loaded")
        
        self.model_usage[model_name] = time.time()
        return self.loaded_models[model_name]
    
    def get_memory_usage(self) -> int:
        """Get current memory usage in bytes"""
        process = psutil.Process()
        return process.memory_info().rss
    
    async def get_status(self) -> Dict[str, ModelStatusResponse]:
        """Get status of all models"""
        status = {}
        
        for model_name in self.supported_models:
            is_loaded = model_name in self.loaded_models
            last_used = self.model_usage.get(model_name, 0)
            
            status[model_name] = ModelStatusResponse(
                name=model_name,
                loaded=is_loaded,
                memory_usage=self.supported_models[model_name]["memory_estimate"] if is_loaded else 0,
                last_used=last_used,
                description=self.supported_models[model_name]["description"]
            )
        
        return status
    
    async def get_model_info(self, model_name: str) -> Dict[str, Any]:
        """Get detailed information about a model"""
        if model_name not in self.supported_models:
            raise ValueError(f"Unknown model: {model_name}")
        
        info = self.supported_models[model_name].copy()
        info.update(self.model_configs.get(model_name, {}))
        info["loaded"] = model_name in self.loaded_models
        
        if model_name in self.loaded_models:
            info["last_used"] = self.model_usage.get(model_name, 0)
        
        return info
    
    async def cleanup(self):
        """Cleanup all loaded models"""
        logger.info("Cleaning up Model Manager...")
        
        for model_name in list(self.loaded_models.keys()):
            await self.unload_model(model_name)
        
        logger.info("Model Manager cleanup complete")