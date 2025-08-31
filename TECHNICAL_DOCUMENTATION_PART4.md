## AI/ML INTEGRATION AND MODEL MANAGEMENT

### Model Manager Architecture

#### 1. Advanced Model Management System
```python
# services/model_manager.py - Comprehensive AI model management
import asyncio
import torch
import psutil
import logging
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass
from enum import Enum
from contextlib import asynccontextmanager
from transformers import AutoModel, AutoTokenizer, pipeline
import threading
import time
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

class ModelStatus(Enum):
    UNLOADED = "unloaded"
    LOADING = "loading"
    LOADED = "loaded"
    ERROR = "error"
    UNLOADING = "unloading"

@dataclass
class ModelInfo:
    name: str
    model_type: str
    model_path: str
    memory_usage: int
    gpu_memory: int
    status: ModelStatus
    last_used: Optional[float]
    load_time: Optional[float]
    error_message: Optional[str]
    capabilities: List[str]

class ModelManager:
    """Advanced model management with memory optimization and caching"""
    
    def __init__(self, max_memory_gb: float = 8.0, max_models: int = 3):
        self.max_memory_bytes = int(max_memory_gb * 1024 * 1024 * 1024)
        self.max_models = max_models
        self.models: Dict[str, Any] = {}
        self.tokenizers: Dict[str, Any] = {}
        self.model_info: Dict[str, ModelInfo] = {}
        self.executor = ThreadPoolExecutor(max_workers=2)
        self.lock = asyncio.Lock()
        
        # Model configurations
        self.model_configs = {
            'protgpt2': {
                'model_path': 'nferruz/ProtGPT2',
                'model_type': 'generation',
                'capabilities': ['sequence_generation', 'completion'],
                'memory_estimate': 2000000000,  # 2GB
                'gpu_memory_estimate': 1500000000,  # 1.5GB
            },
            'esm2_650m': {
                'model_path': 'facebook/esm2_t33_650M_UR50D',
                'model_type': 'embedding',
                'capabilities': ['embeddings', 'structure_prediction'],
                'memory_estimate': 3000000000,  # 3GB
                'gpu_memory_estimate': 2500000000,  # 2.5GB
            },
            'protflash': {
                'model_path': './models/protflash',
                'model_type': 'generation',
                'capabilities': ['fast_generation', 'optimization'],
                'memory_estimate': 800000000,  # 800MB
                'gpu_memory_estimate': 600000000,  # 600MB
            }
        }
        
        # Performance monitoring
        self.usage_stats = {}
        self.performance_metrics = {}
        
    async def initialize(self):
        """Initialize model manager and load default models"""
        logger.info("Initializing Model Manager...")
        
        # Check system resources
        await self._check_system_resources()
        
        # Initialize model info
        for model_name, config in self.model_configs.items():
            self.model_info[model_name] = ModelInfo(
                name=model_name,
                model_type=config['model_type'],
                model_path=config['model_path'],
                memory_usage=0,
                gpu_memory=0,
                status=ModelStatus.UNLOADED,
                last_used=None,
                load_time=None,
                error_message=None,
                capabilities=config['capabilities']
            )
        
        # Load priority models
        priority_models = ['protgpt2']  # Load most commonly used model first
        for model_name in priority_models:
            try:
                await self.load_model(model_name)
            except Exception as e:
                logger.warning(f"Failed to load priority model {model_name}: {e}")
        
        # Start background monitoring
        asyncio.create_task(self._monitor_models())
        
        logger.info("Model Manager initialized successfully")
    
    async def load_model(self, model_name: str, force: bool = False) -> bool:
        """Load a model with memory management and error handling"""
        async with self.lock:
            if model_name not in self.model_configs:
                raise ValueError(f"Unknown model: {model_name}")
            
            model_info = self.model_info[model_name]
            
            # Check if already loaded
            if model_info.status == ModelStatus.LOADED and not force:
                model_info.last_used = time.time()
                return True
            
            # Check if currently loading
            if model_info.status == ModelStatus.LOADING:
                return False
            
            try:
                model_info.status = ModelStatus.LOADING
                logger.info(f"Loading model: {model_name}")
                
                # Check memory availability
                await self._ensure_memory_available(model_name)
                
                # Load model in thread pool to avoid blocking
                start_time = time.time()
                model, tokenizer = await asyncio.get_event_loop().run_in_executor(
                    self.executor,
                    self._load_model_sync,
                    model_name
                )
                
                load_time = time.time() - start_time
                
                # Store model and update info
                self.models[model_name] = model
                self.tokenizers[model_name] = tokenizer
                
                model_info.status = ModelStatus.LOADED
                model_info.load_time = load_time
                model_info.last_used = time.time()
                model_info.memory_usage = self._get_model_memory_usage(model)
                model_info.gpu_memory = self._get_gpu_memory_usage(model)
                model_info.error_message = None
                
                logger.info(f"Model {model_name} loaded successfully in {load_time:.2f}s")
                return True
                
            except Exception as e:
                model_info.status = ModelStatus.ERROR
                model_info.error_message = str(e)
                logger.error(f"Failed to load model {model_name}: {e}")
                return False
    
    def _load_model_sync(self, model_name: str) -> tuple:
        """Synchronous model loading (runs in thread pool)"""
        config = self.model_configs[model_name]
        
        if config['model_type'] == 'generation':
            # Load generation model
            model = AutoModel.from_pretrained(
                config['model_path'],
                torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                device_map="auto" if torch.cuda.is_available() else None,
                trust_remote_code=True,
            )
            tokenizer = AutoTokenizer.from_pretrained(config['model_path'])
            
        elif config['model_type'] == 'embedding':
            # Load embedding model
            model = AutoModel.from_pretrained(
                config['model_path'],
                torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            )
            tokenizer = AutoTokenizer.from_pretrained(config['model_path'])
            
        else:
            raise ValueError(f"Unknown model type: {config['model_type']}")
        
        # Move to GPU if available
        if torch.cuda.is_available():
            model = model.cuda()
        
        return model, tokenizer
    
    async def unload_model(self, model_name: str) -> bool:
        """Unload a model to free memory"""
        async with self.lock:
            if model_name not in self.models:
                return True
            
            try:
                model_info = self.model_info[model_name]
                model_info.status = ModelStatus.UNLOADING
                
                # Clear model from memory
                del self.models[model_name]
                del self.tokenizers[model_name]
                
                # Force garbage collection
                import gc
                gc.collect()
                
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                
                model_info.status = ModelStatus.UNLOADED
                model_info.memory_usage = 0
                model_info.gpu_memory = 0
                
                logger.info(f"Model {model_name} unloaded successfully")
                return True
                
            except Exception as e:
                logger.error(f"Failed to unload model {model_name}: {e}")
                return False
    
    async def _ensure_memory_available(self, model_name: str):
        """Ensure sufficient memory is available for loading a model"""
        config = self.model_configs[model_name]
        required_memory = config['memory_estimate']
        
        # Check system memory
        available_memory = psutil.virtual_memory().available
        if available_memory < required_memory * 1.2:  # 20% buffer
            # Try to free memory by unloading least recently used models
            await self._free_memory(required_memory)
        
        # Check GPU memory if using CUDA
        if torch.cuda.is_available():
            gpu_memory = torch.cuda.get_device_properties(0).total_memory
            gpu_used = torch.cuda.memory_allocated(0)
            gpu_available = gpu_memory - gpu_used
            
            required_gpu = config['gpu_memory_estimate']
            if gpu_available < required_gpu * 1.2:
                await self._free_gpu_memory(required_gpu)
    
    async def _free_memory(self, required_bytes: int):
        """Free memory by unloading least recently used models"""
        # Sort models by last used time
        loaded_models = [
            (name, info) for name, info in self.model_info.items()
            if info.status == ModelStatus.LOADED
        ]
        loaded_models.sort(key=lambda x: x[1].last_used or 0)
        
        freed_memory = 0
        for model_name, model_info in loaded_models:
            if freed_memory >= required_bytes:
                break
            
            logger.info(f"Unloading {model_name} to free memory")
            await self.unload_model(model_name)
            freed_memory += model_info.memory_usage
    
    async def get_model(self, model_name: str, auto_load: bool = True) -> Optional[Any]:
        """Get a loaded model, optionally loading it if not available"""
        if model_name not in self.model_configs:
            raise ValueError(f"Unknown model: {model_name}")
        
        if model_name in self.models:
            # Update last used time
            self.model_info[model_name].last_used = time.time()
            return self.models[model_name]
        
        if auto_load:
            success = await self.load_model(model_name)
            if success:
                return self.models[model_name]
        
        return None
    
    async def get_tokenizer(self, model_name: str) -> Optional[Any]:
        """Get tokenizer for a model"""
        if model_name in self.tokenizers:
            return self.tokenizers[model_name]
        return None
    
    async def _monitor_models(self):
        """Background task to monitor model usage and performance"""
        while True:
            try:
                await asyncio.sleep(60)  # Check every minute
                
                current_time = time.time()
                
                # Check for unused models (unload after 30 minutes of inactivity)
                for model_name, model_info in self.model_info.items():
                    if (model_info.status == ModelStatus.LOADED and 
                        model_info.last_used and 
                        current_time - model_info.last_used > 1800):  # 30 minutes
                        
                        logger.info(f"Unloading inactive model: {model_name}")
                        await self.unload_model(model_name)
                
                # Update performance metrics
                await self._update_performance_metrics()
                
            except Exception as e:
                logger.error(f"Error in model monitoring: {e}")
    
    async def get_status(self) -> Dict[str, Any]:
        """Get comprehensive status of all models"""
        return {
            model_name: {
                'status': info.status.value,
                'memory_usage_mb': info.memory_usage // (1024 * 1024),
                'gpu_memory_mb': info.gpu_memory // (1024 * 1024),
                'last_used': info.last_used,
                'load_time': info.load_time,
                'error_message': info.error_message,
                'capabilities': info.capabilities,
            }
            for model_name, info in self.model_info.items()
        }
```

#### 2. Protein Generation Service
```python
# services/protein_generator.py - AI-powered protein generation
import asyncio
import torch
import numpy as np
from typing import Dict, List, Optional, AsyncGenerator, Callable
from dataclasses import dataclass
import logging
from transformers import GenerationConfig
import re

logger = logging.getLogger(__name__)

@dataclass
class GenerationConstraints:
    length_range: Optional[tuple[int, int]] = None
    composition: Optional[Dict[str, float]] = None
    properties: Optional[Dict[str, float]] = None
    template: Optional[str] = None
    forbidden_patterns: Optional[List[str]] = None
    required_motifs: Optional[List[str]] = None

@dataclass
class GenerationOptions:
    model: str = "protgpt2"
    temperature: float = 0.8
    top_p: float = 0.9
    top_k: int = 50
    num_return_sequences: int = 1
    max_length: int = 512
    do_sample: bool = True
    repetition_penalty: float = 1.1
    length_penalty: float = 1.0

@dataclass
class GeneratedProtein:
    sequence: str
    confidence_score: float
    validation_score: float
    properties: Dict[str, float]
    generation_metadata: Dict[str, Any]

class ProteinGenerator:
    """Advanced protein generation with constraints and validation"""
    
    def __init__(self, model_manager):
        self.model_manager = model_manager
        self.amino_acids = "ACDEFGHIKLMNPQRSTVWY"
        self.amino_acid_properties = self._load_amino_acid_properties()
        
    def _load_amino_acid_properties(self) -> Dict[str, Dict[str, float]]:
        """Load amino acid properties for constraint checking"""
        return {
            'A': {'hydrophobicity': 1.8, 'charge': 0, 'size': 89.1, 'polarity': 0},
            'R': {'hydrophobicity': -4.5, 'charge': 1, 'size': 174.2, 'polarity': 1},
            'N': {'hydrophobicity': -3.5, 'charge': 0, 'size': 132.1, 'polarity': 1},
            'D': {'hydrophobicity': -3.5, 'charge': -1, 'size': 133.1, 'polarity': 1},
            'C': {'hydrophobicity': 2.5, 'charge': 0, 'size': 121.0, 'polarity': 0},
            'Q': {'hydrophobicity': -3.5, 'charge': 0, 'size': 146.1, 'polarity': 1},
            'E': {'hydrophobicity': -3.5, 'charge': -1, 'size': 147.1, 'polarity': 1},
            'G': {'hydrophobicity': -0.4, 'charge': 0, 'size': 75.1, 'polarity': 0},
            'H': {'hydrophobicity': -3.2, 'charge': 0.1, 'size': 155.2, 'polarity': 1},
            'I': {'hydrophobicity': 4.5, 'charge': 0, 'size': 131.2, 'polarity': 0},
            'L': {'hydrophobicity': 3.8, 'charge': 0, 'size': 131.2, 'polarity': 0},
            'K': {'hydrophobicity': -3.9, 'charge': 1, 'size': 146.2, 'polarity': 1},
            'M': {'hydrophobicity': 1.9, 'charge': 0, 'size': 149.2, 'polarity': 0},
            'F': {'hydrophobicity': 2.8, 'charge': 0, 'size': 165.2, 'polarity': 0},
            'P': {'hydrophobicity': -1.6, 'charge': 0, 'size': 115.1, 'polarity': 0},
            'S': {'hydrophobicity': -0.8, 'charge': 0, 'size': 105.1, 'polarity': 1},
            'T': {'hydrophobicity': -0.7, 'charge': 0, 'size': 119.1, 'polarity': 1},
            'W': {'hydrophobicity': -0.9, 'charge': 0, 'size': 204.2, 'polarity': 0},
            'Y': {'hydrophobicity': -1.3, 'charge': 0, 'size': 181.2, 'polarity': 1},
            'V': {'hydrophobicity': 4.2, 'charge': 0, 'size': 117.1, 'polarity': 0},
        }
    
    async def generate_protein(
        self,
        constraints: GenerationConstraints,
        options: GenerationOptions,
        progress_callback: Optional[Callable[[float, str], None]] = None
    ) -> GeneratedProtein:
        """Generate a protein sequence with constraints"""
        
        if progress_callback:
            progress_callback(0.1, "Loading model...")
        
        # Get model and tokenizer
        model = await self.model_manager.get_model(options.model)
        tokenizer = await self.model_manager.get_tokenizer(options.model)
        
        if not model or not tokenizer:
            raise RuntimeError(f"Failed to load model: {options.model}")
        
        if progress_callback:
            progress_callback(0.2, "Preparing generation...")
        
        # Prepare generation configuration
        generation_config = GenerationConfig(
            temperature=options.temperature,
            top_p=options.top_p,
            top_k=options.top_k,
            do_sample=options.do_sample,
            max_length=options.max_length,
            repetition_penalty=options.repetition_penalty,
            length_penalty=options.length_penalty,
            pad_token_id=tokenizer.pad_token_id,
            eos_token_id=tokenizer.eos_token_id,
        )
        
        # Generate multiple candidates
        candidates = []
        for i in range(max(options.num_return_sequences, 5)):  # Generate at least 5 candidates
            if progress_callback:
                progress_callback(0.3 + (i / 10) * 0.4, f"Generating candidate {i+1}...")
            
            candidate = await self._generate_single_sequence(
                model, tokenizer, generation_config, constraints, options
            )
            
            if candidate:
                candidates.append(candidate)
        
        if not candidates:
            raise RuntimeError("Failed to generate any valid sequences")
        
        if progress_callback:
            progress_callback(0.8, "Validating and scoring...")
        
        # Score and rank candidates
        scored_candidates = []
        for candidate in candidates:
            score = await self._score_sequence(candidate, constraints)
            scored_candidates.append((candidate, score))
        
        # Select best candidate
        scored_candidates.sort(key=lambda x: x[1], reverse=True)
        best_sequence, best_score = scored_candidates[0]
        
        if progress_callback:
            progress_callback(0.9, "Calculating properties...")
        
        # Calculate properties
        properties = await self._calculate_properties(best_sequence)
        
        if progress_callback:
            progress_callback(1.0, "Complete!")
        
        return GeneratedProtein(
            sequence=best_sequence,
            confidence_score=best_score,
            validation_score=await self._validate_sequence(best_sequence),
            properties=properties,
            generation_metadata={
                'model': options.model,
                'temperature': options.temperature,
                'candidates_generated': len(candidates),
                'constraints': constraints.__dict__,
                'generation_time': time.time(),
            }
        )
    
    async def _generate_single_sequence(
        self,
        model,
        tokenizer,
        generation_config: GenerationConfig,
        constraints: GenerationConstraints,
        options: GenerationOptions
    ) -> Optional[str]:
        """Generate a single protein sequence"""
        
        # Prepare prompt based on constraints
        prompt = self._create_prompt(constraints)
        
        try:
            # Tokenize input
            inputs = tokenizer(prompt, return_tensors="pt")
            if torch.cuda.is_available():
                inputs = {k: v.cuda() for k, v in inputs.items()}
            
            # Generate sequence
            with torch.no_grad():
                outputs = model.generate(
                    **inputs,
                    generation_config=generation_config,
                    num_return_sequences=1,
                )
            
            # Decode and clean sequence
            generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
            sequence = self._extract_sequence(generated_text, prompt)
            
            # Validate sequence
            if self._is_valid_sequence(sequence, constraints):
                return sequence
            
        except Exception as e:
            logger.warning(f"Generation failed: {e}")
        
        return None
    
    def _create_prompt(self, constraints: GenerationConstraints) -> str:
        """Create generation prompt based on constraints"""
        prompt = "<|startoftext|>"
        
        if constraints.template:
            # Use template as starting point
            prompt += constraints.template[:50]  # Use first 50 residues as prompt
        else:
            # Create generic protein start
            prompt += "M"  # Most proteins start with methionine
        
        return prompt
    
    def _extract_sequence(self, generated_text: str, prompt: str) -> str:
        """Extract clean protein sequence from generated text"""
        # Remove prompt
        sequence = generated_text[len(prompt):].strip()
        
        # Clean sequence - keep only valid amino acids
        sequence = re.sub(r'[^ACDEFGHIKLMNPQRSTVWY]', '', sequence.upper())
        
        return sequence
    
    def _is_valid_sequence(self, sequence: str, constraints: GenerationConstraints) -> bool:
        """Validate sequence against constraints"""
        if not sequence or len(sequence) < 10:
            return False
        
        # Check length constraints
        if constraints.length_range:
            min_len, max_len = constraints.length_range
            if not (min_len <= len(sequence) <= max_len):
                return False
        
        # Check forbidden patterns
        if constraints.forbidden_patterns:
            for pattern in constraints.forbidden_patterns:
                if pattern in sequence:
                    return False
        
        # Check required motifs
        if constraints.required_motifs:
            for motif in constraints.required_motifs:
                if motif not in sequence:
                    return False
        
        # Check composition constraints
        if constraints.composition:
            composition = self._calculate_composition(sequence)
            for aa, target_freq in constraints.composition.items():
                actual_freq = composition.get(aa, 0)
                if abs(actual_freq - target_freq) > 0.1:  # 10% tolerance
                    return False
        
        return True
    
    async def _score_sequence(self, sequence: str, constraints: GenerationConstraints) -> float:
        """Score sequence based on constraints and properties"""
        score = 1.0
        
        # Length score
        if constraints.length_range:
            min_len, max_len = constraints.length_range
            target_len = (min_len + max_len) / 2
            length_score = 1.0 - abs(len(sequence) - target_len) / target_len
            score *= max(0.1, length_score)
        
        # Composition score
        if constraints.composition:
            composition = self._calculate_composition(sequence)
            composition_score = 1.0
            for aa, target_freq in constraints.composition.items():
                actual_freq = composition.get(aa, 0)
                composition_score *= max(0.1, 1.0 - abs(actual_freq - target_freq))
            score *= composition_score
        
        # Properties score
        if constraints.properties:
            properties = await self._calculate_properties(sequence)
            properties_score = 1.0
            for prop, target_value in constraints.properties.items():
                if prop in properties:
                    actual_value = properties[prop]
                    properties_score *= max(0.1, 1.0 - abs(actual_value - target_value) / max(abs(target_value), 1.0))
            score *= properties_score
        
        return score
    
    def _calculate_composition(self, sequence: str) -> Dict[str, float]:
        """Calculate amino acid composition"""
        composition = {}
        total = len(sequence)
        
        for aa in self.amino_acids:
            count = sequence.count(aa)
            composition[aa] = count / total if total > 0 else 0
        
        return composition
    
    async def _calculate_properties(self, sequence: str) -> Dict[str, float]:
        """Calculate sequence properties"""
        properties = {}
        
        # Basic properties
        properties['length'] = len(sequence)
        properties['molecular_weight'] = sum(
            self.amino_acid_properties[aa]['size'] for aa in sequence
        )
        
        # Hydrophobicity
        hydrophobicity_values = [
            self.amino_acid_properties[aa]['hydrophobicity'] for aa in sequence
        ]
        properties['hydrophobicity'] = np.mean(hydrophobicity_values)
        properties['hydrophobicity_std'] = np.std(hydrophobicity_values)
        
        # Charge
        charge_values = [
            self.amino_acid_properties[aa]['charge'] for aa in sequence
        ]
        properties['net_charge'] = sum(charge_values)
        properties['charge_density'] = properties['net_charge'] / len(sequence)
        
        # Polarity
        polar_count = sum(
            1 for aa in sequence 
            if self.amino_acid_properties[aa]['polarity'] > 0
        )
        properties['polarity'] = polar_count / len(sequence)
        
        # Complexity (Shannon entropy)
        composition = self._calculate_composition(sequence)
        entropy = -sum(
            freq * np.log2(freq) for freq in composition.values() if freq > 0
        )
        properties['complexity'] = entropy / np.log2(20)  # Normalized
        
        return properties
    
    async def _validate_sequence(self, sequence: str) -> float:
        """Validate sequence using various criteria"""
        score = 1.0
        
        # Check for unusual patterns
        # Penalize long repeats
        max_repeat = max(
            len(match.group()) for match in re.finditer(r'(.)\1+', sequence)
        ) if re.search(r'(.)\1+', sequence) else 1
        
        if max_repeat > 5:
            score *= 0.5
        
        # Check for realistic composition
        composition = self._calculate_composition(sequence)
        
        # Penalize sequences with extreme amino acid frequencies
        for aa, freq in composition.items():
            if freq > 0.3:  # No amino acid should be >30%
                score *= 0.7
            if freq > 0.5:  # Severely penalize >50%
                score *= 0.3
        
        # Check for presence of essential amino acids
        essential_aas = ['M', 'W', 'F', 'Y']  # Should have some of these
        if not any(composition[aa] > 0.01 for aa in essential_aas):
            score *= 0.8
        
        return score
```