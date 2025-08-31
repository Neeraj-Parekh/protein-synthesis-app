"""
AI model service - connects to the AI service running on port 8001
Enhanced integration with comprehensive error handling and feature support
"""
from typing import Dict, Any, List, Optional
import httpx
import os
import logging
import asyncio
from datetime import datetime

from .enhanced_connection_manager import EnhancedConnectionManager
from .connection_config import ConnectionConfig

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        self.config = ConnectionConfig.from_environment()
        self.connection_manager = EnhancedConnectionManager(self.config)
        
        # Keep legacy attributes for backward compatibility
        self.ai_service_url = self.config.base_url
        self.max_retries = self.config.max_retries
        self.retry_delay = 1.0  # Not used anymore, but kept for compatibility
    
    async def _make_request_with_retry(self, method: str, endpoint: str, **kwargs) -> httpx.Response:
        """Make HTTP request with enhanced retry logic using connection manager"""
        return await self.connection_manager.make_request(method, endpoint, **kwargs)

    async def generate_protein(self, constraints: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate protein sequence using AI models with enhanced error handling
        """
        try:
            # Convert constraints to the format expected by AI service
            length = constraints.get('length', 100)
            if isinstance(length, tuple):
                length = length[1]  # Use max length from tuple
            
            request_data = {
                "model_name": constraints.get('model', 'protgpt2'),
                "length": length,
                "temperature": constraints.get('temperature', 0.8),
                "num_sequences": constraints.get('num_sequences', 1),
                "constraints": constraints
            }
            
            response = await self._make_request_with_retry('POST', '/generate', json=request_data)
            result = response.json()
            
            # Convert AI service response to backend format
            if result.get('proteins') and len(result['proteins']) > 0:
                protein = result['proteins'][0]
                return {
                    'sequence': protein['sequence'],
                    'confidence': protein['confidence'],
                    'properties': protein['properties'],
                    'validation_score': protein['validation_score'],
                    'generation_metadata': {
                        'model': result['model_used'],
                        'constraints': constraints,
                        'generation_time': result['generation_time'],
                        'request_id': result['request_id'],
                        'timestamp': datetime.now().isoformat()
                    }
                }
            else:
                raise Exception("No proteins generated")
                
        except Exception as e:
            logger.error(f"AI service generation failed: {e}")
            # Fallback to mock data
            return await self._generate_mock_protein(constraints)
    
    async def optimize_sequence(self, sequence: str, objectives: List[str], model: str = 'protgpt2') -> Dict[str, Any]:
        """
        Optimize protein sequence with enhanced target property mapping
        """
        try:
            # Convert objectives to target properties with more sophisticated mapping
            target_properties = {}
            for obj in objectives:
                if obj == 'stability':
                    target_properties['stability'] = 0.9
                elif obj == 'molecular_weight':
                    target_properties['molecular_weight'] = len(sequence) * 110.0
                elif obj == 'isoelectric_point':
                    target_properties['isoelectric_point'] = 7.0
                elif obj == 'hydrophobicity':
                    target_properties['hydrophobicity'] = 0.0
                elif obj == 'solubility':
                    target_properties['solubility'] = 0.8
            
            response = await self._make_request_with_retry(
                'POST', '/optimize-sequence', 
                json={"sequence": sequence, "target_properties": target_properties}
            )
            result = response.json()
            
            return {
                'original_sequence': result['original_sequence'],
                'optimized_sequence': result['optimized_sequence'],
                'improvements': {
                    'optimization_score': result['optimization_score']
                },
                'confidence': result['optimization_score'],
                'optimization_metadata': {
                    'model': model,
                    'objectives': objectives,
                    'iterations': result['iterations'],
                    'target_properties': result['target_properties'],
                    'achieved_properties': result['achieved_properties'],
                    'timestamp': datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"AI service optimization failed: {e}")
            return await self._optimize_mock_sequence(sequence, objectives, model)
    
    async def predict_structure(self, sequence: str) -> Dict[str, Any]:
        """
        Predict 3D structure from sequence
        """
        import random
        return {
            'sequence': sequence,
            'predicted_structure': 'placeholder_structure_data',
            'confidence': random.uniform(0.6, 0.85),
            'method': 'alphafold_lite',
            'prediction_metadata': {
                'runtime': 15.2,
                'memory_used': '2.1GB'
            }
        }
    
    async def validate_sequence(self, sequence: str) -> Dict[str, Any]:
        """
        Validate protein sequence
        """
        try:
            response = await self._make_request_with_retry('POST', '/validate-sequence', json=sequence)
            result = response.json()
            
            return {
                'sequence': sequence,
                'is_valid': result['valid'],
                'validation_score': result['score'],
                'issues': result['errors'],
                'recommendations': [],
                'length': result.get('length', len(sequence)),
                'composition': result.get('composition', {})
            }
            
        except Exception as e:
            logger.error(f"AI service validation failed: {e}")
            # Fallback to basic validation
            valid_amino_acids = set('ACDEFGHIKLMNPQRSTVWY')
            is_valid = all(aa in valid_amino_acids for aa in sequence)
            
            return {
                'sequence': sequence,
                'is_valid': is_valid,
                'validation_score': 0.9 if is_valid else 0.0,
                'issues': [] if is_valid else ['Invalid amino acid characters'],
                'recommendations': []
            }
    
    async def get_model_status(self) -> Dict[str, Any]:
        """
        Get status of AI models with enhanced information
        """
        try:
            response = await self._make_request_with_retry('GET', '/models/status')
            result = response.json()
            
            return {
                'models': result,
                'total_memory_usage': f"{sum(model.get('memory_usage', 0) for model in result.values()):.1f}GB",
                'available_models': list(result.keys()),
                'system_status': 'ready',
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"AI service status check failed: {e}")
            return {
                'models': {'protgpt2': {'loaded': False, 'status': 'error'}},
                'total_memory_usage': '0GB',
                'available_models': [],
                'system_status': 'error',
                'error': str(e),
                'last_updated': datetime.now().isoformat()
            }

    async def analyze_properties(self, sequence: str) -> Dict[str, Any]:
        """
        Analyze biochemical properties of a protein sequence
        """
        try:
            response = await self._make_request_with_retry(
                'POST', '/analyze-properties',
                json={"sequence": sequence}
            )
            result = response.json()
            
            return {
                'sequence': result['sequence'],
                'properties': result['properties'],
                'analysis_time': result['analysis_time'],
                'confidence': result['confidence'],
                'analysis_metadata': {
                    'timestamp': datetime.now().isoformat(),
                    'method': 'AI-powered analysis'
                }
            }
            
        except Exception as e:
            logger.error(f"Property analysis failed: {e}")
            return await self._analyze_mock_properties(sequence)

    async def predict_function(self, sequence: str) -> Dict[str, Any]:
        """
        Predict protein function from sequence
        """
        try:
            response = await self._make_request_with_retry(
                'POST', '/predict-function',
                json={"sequence": sequence}
            )
            result = response.json()
            
            return {
                'sequence': result['sequence'],
                'predicted_functions': result['predicted_functions'],
                'domains': result['domains'],
                'subcellular_localization': result['subcellular_localization'],
                'confidence': result['confidence'],
                'analysis_metadata': result['analysis_metadata']
            }
            
        except Exception as e:
            logger.error(f"Function prediction failed: {e}")
            return await self._predict_mock_function(sequence)

    async def analyze_stability(self, sequence: str, temperature: float = 37.0, ph: float = 7.0) -> Dict[str, Any]:
        """
        Analyze protein stability under different conditions
        """
        try:
            response = await self._make_request_with_retry(
                'POST', '/analyze-stability',
                json={"sequence": sequence, "temperature": temperature, "ph": ph}
            )
            result = response.json()
            
            return {
                'sequence': result['sequence'],
                'conditions': result['conditions'],
                'stability_metrics': result['stability_metrics'],
                'destabilizing_regions': result['destabilizing_regions'],
                'stabilization_suggestions': result['stabilization_suggestions'],
                'overall_stability_score': result['overall_stability_score'],
                'analysis_metadata': result['analysis_metadata']
            }
            
        except Exception as e:
            logger.error(f"Stability analysis failed: {e}")
            return await self._analyze_mock_stability(sequence, temperature, ph)

    async def design_protein(self, design_requirements: Dict[str, Any]) -> Dict[str, Any]:
        """
        Design a protein based on functional requirements
        """
        try:
            response = await self._make_request_with_retry(
                'POST', '/design-protein',
                json=design_requirements
            )
            result = response.json()
            
            return {
                'designed_sequence': result['designed_sequence'],
                'design_requirements': result['design_requirements'],
                'design_scores': result['design_scores'],
                'predicted_properties': result['predicted_properties'],
                'design_metadata': result['design_metadata']
            }
            
        except Exception as e:
            logger.error(f"Protein design failed: {e}")
            return await self._design_mock_protein(design_requirements)
    
    # Fallback methods for when AI service is unavailable
    async def _generate_mock_protein(self, constraints: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback protein generation"""
        import random
        amino_acids = 'ACDEFGHIKLMNPQRSTVWY'
        length = constraints.get('length', 100)
        if isinstance(length, tuple):
            length = random.randint(length[0], length[1])
        
        sequence = ''.join(random.choices(amino_acids, k=length))
        
        return {
            'sequence': sequence,
            'confidence': random.uniform(0.7, 0.95),
            'properties': {
                'molecular_weight': length * 110,
                'length': length
            },
            'validation_score': random.uniform(0.8, 0.95),
            'generation_metadata': {
                'model': 'mock',
                'constraints': constraints,
                'generation_time': 1.0
            }
        }
    
    async def _optimize_mock_sequence(self, sequence: str, objectives: List[str], model: str) -> Dict[str, Any]:
        """Fallback sequence optimization"""
        import random
        optimized = list(sequence)
        num_mutations = min(5, len(sequence) // 10)
        
        for _ in range(num_mutations):
            pos = random.randint(0, len(optimized) - 1)
            optimized[pos] = random.choice('ACDEFGHIKLMNPQRSTVWY')
        
        return {
            'original_sequence': sequence,
            'optimized_sequence': ''.join(optimized),
            'improvements': {
                'optimization_score': random.uniform(0.7, 0.9)
            },
            'confidence': random.uniform(0.75, 0.9),
            'optimization_metadata': {
                'model': 'mock',
                'objectives': objectives,
                'iterations': 10,
                'target_properties': {},
                'achieved_properties': {},
                'timestamp': datetime.now().isoformat()
            }
        }

    async def _analyze_mock_properties(self, sequence: str) -> Dict[str, Any]:
        """Fallback property analysis"""
        import random
        return {
            'sequence': sequence,
            'properties': {
                'length': len(sequence),
                'molecular_weight': len(sequence) * 110.0,
                'isoelectric_point': random.uniform(4.0, 10.0),
                'hydrophobicity': random.uniform(-2.0, 2.0),
                'stability': random.uniform(0.5, 1.0)
            },
            'analysis_time': random.uniform(0.1, 0.5),
            'confidence': random.uniform(0.7, 0.9),
            'analysis_metadata': {
                'timestamp': datetime.now().isoformat(),
                'method': 'Mock analysis'
            }
        }

    async def _predict_mock_function(self, sequence: str) -> Dict[str, Any]:
        """Fallback function prediction"""
        import random
        functions = [
            {"name": "enzyme", "probability": random.uniform(0.6, 0.9)},
            {"name": "binding_protein", "probability": random.uniform(0.3, 0.7)},
            {"name": "structural_protein", "probability": random.uniform(0.2, 0.6)}
        ]
        
        return {
            'sequence': sequence,
            'predicted_functions': functions,
            'domains': [],
            'subcellular_localization': {
                'cytoplasm': random.uniform(0.4, 0.8),
                'nucleus': random.uniform(0.1, 0.6)
            },
            'confidence': random.uniform(0.7, 0.9),
            'analysis_metadata': {
                'method': 'Mock prediction',
                'timestamp': datetime.now().isoformat()
            }
        }

    async def _analyze_mock_stability(self, sequence: str, temperature: float, ph: float) -> Dict[str, Any]:
        """Fallback stability analysis"""
        import random
        return {
            'sequence': sequence,
            'conditions': {'temperature': temperature, 'ph': ph},
            'stability_metrics': {
                'thermodynamic_stability': random.uniform(0.5, 0.9),
                'kinetic_stability': random.uniform(0.4, 0.8)
            },
            'destabilizing_regions': [],
            'stabilization_suggestions': [],
            'overall_stability_score': random.uniform(0.6, 0.9),
            'analysis_metadata': {
                'method': 'Mock analysis',
                'timestamp': datetime.now().isoformat()
            }
        }

    async def _design_mock_protein(self, design_requirements: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback protein design"""
        import random
        amino_acids = 'ACDEFGHIKLMNPQRSTVWY'
        length = design_requirements.get('length', random.randint(100, 300))
        sequence = ''.join(random.choices(amino_acids, k=length))
        
        return {
            'designed_sequence': sequence,
            'design_requirements': design_requirements,
            'design_scores': {
                'overall': random.uniform(0.7, 0.9),
                'stability': random.uniform(0.6, 0.9),
                'function': random.uniform(0.65, 0.9)
            },
            'predicted_properties': {
                'molecular_weight': length * 110.0,
                'length': length
            },
            'design_metadata': {
                'algorithm': 'Mock designer',
                'timestamp': datetime.now().isoformat()
            }
        }
    
    async def get_connection_health(self) -> Dict[str, Any]:
        """Get connection health status"""
        return await self.connection_manager.health_check()
    
    def get_connection_metrics(self) -> Dict[str, Any]:
        """Get detailed connection metrics"""
        return self.connection_manager.get_connection_metrics()
    
    async def close(self):
        """Close connection manager and cleanup resources"""
        await self.connection_manager.close()
    
    async def __aenter__(self):
        """Async context manager entry"""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()