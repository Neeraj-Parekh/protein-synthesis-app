"""
Protein Generator Service
Handles AI-powered protein sequence generation
"""

import logging
import time
import random
from typing import Dict, List, Optional, Any
import asyncio

from models.requests import GenerationRequest
from models.responses import GenerationResponse, GenerationMetadata
from services.model_manager import ModelManager

logger = logging.getLogger(__name__)

class ProteinGenerator:
    """AI-powered protein sequence generator"""
    
    def __init__(self, model_manager: ModelManager):
        self.model_manager = model_manager
        self.amino_acids = "ACDEFGHIKLMNPQRSTVWY"
        
        # Amino acid properties for constraint checking
        self.aa_properties = {
            'hydrophobic': set('AILMFPWV'),
            'polar': set('NQSTY'),
            'charged': set('DEKR'),
            'positive': set('KR'),
            'negative': set('DE'),
            'aromatic': set('FWY'),
            'small': set('AGCS'),
            'large': set('FWYR')
        }
    
    async def generate(self, request: GenerationRequest) -> GenerationResponse:
        """Generate a protein sequence based on the request"""
        start_time = time.time()
        
        try:
            # Load the requested model
            await self.model_manager.load_model(request.model)
            model = self.model_manager.get_model(request.model)
            
            # Generate sequence using the model
            generation_result = await self._generate_with_model(model, request)
            
            # Validate and refine the sequence
            validated_sequence = await self._validate_and_refine(
                generation_result["sequence"], 
                request.constraints
            )
            
            # Calculate properties
            properties = await self._calculate_properties(validated_sequence)
            
            # Calculate validation score
            validation_score = await self._calculate_validation_score(
                validated_sequence, 
                request.constraints
            )
            
            generation_time = time.time() - start_time
            
            # Create metadata
            metadata = GenerationMetadata(
                model=request.model,
                temperature=request.options.temperature if request.options else 0.8,
                generation_time=generation_time,
                memory_used=self.model_manager.get_memory_usage(),
                constraints_applied=len(request.constraints.__dict__) if request.constraints else 0
            )
            
            return GenerationResponse(
                generation_id=f"gen_{int(time.time() * 1000)}",
                sequence=validated_sequence,
                confidence=generation_result.get("confidence", 0.85),
                properties=properties,
                validation_score=validation_score,
                metadata=metadata,
                created_at=time.time()
            )
            
        except Exception as e:
            logger.error(f"Generation failed: {e}")
            raise
    
    async def _generate_with_model(self, model: Any, request: GenerationRequest) -> Dict[str, Any]:
        """Generate sequence using the specified model"""
        try:
            # Prepare generation parameters
            max_length = 100  # Default length
            if request.constraints and request.constraints.length:
                if isinstance(request.constraints.length, list) and len(request.constraints.length) == 2:
                    max_length = random.randint(
                        request.constraints.length[0], 
                        request.constraints.length[1]
                    )
                elif isinstance(request.constraints.length, int):
                    max_length = request.constraints.length
            
            # Generate using model
            result = await model.generate(
                max_length=max_length,
                temperature=request.options.temperature if request.options else 0.8,
                num_samples=request.options.num_samples if request.options else 1
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Model generation failed: {e}")
            # Fallback to rule-based generation
            return await self._fallback_generation(request)
    
    async def _fallback_generation(self, request: GenerationRequest) -> Dict[str, Any]:
        """Fallback rule-based generation when model fails"""
        logger.info("Using fallback rule-based generation")
        
        # Determine length
        length = 100
        if request.constraints and request.constraints.length:
            if isinstance(request.constraints.length, list) and len(request.constraints.length) == 2:
                length = random.randint(
                    request.constraints.length[0], 
                    request.constraints.length[1]
                )
            elif isinstance(request.constraints.length, int):
                length = request.constraints.length
        
        # Generate sequence with constraints
        sequence = await self._generate_constrained_sequence(length, request.constraints)
        
        return {
            "sequence": sequence,
            "confidence": 0.7,  # Lower confidence for rule-based
            "model": "fallback"
        }
    
    async def _generate_constrained_sequence(self, length: int, constraints) -> str:
        """Generate sequence with composition constraints"""
        if not constraints or not constraints.composition:
            # Random generation
            return ''.join(random.choices(self.amino_acids, k=length))
        
        sequence = []
        composition = constraints.composition
        
        # Calculate target counts for each property
        target_counts = {}
        if hasattr(composition, 'hydrophobic') and composition.hydrophobic:
            target_counts['hydrophobic'] = int(length * composition.hydrophobic)
        if hasattr(composition, 'polar') and composition.polar:
            target_counts['polar'] = int(length * composition.polar)
        if hasattr(composition, 'charged') and composition.charged:
            target_counts['charged'] = int(length * composition.charged)
        
        # Generate sequence to meet targets
        remaining_length = length
        used_positions = set()
        
        for prop, target_count in target_counts.items():
            if prop in self.aa_properties:
                aa_set = self.aa_properties[prop]
                for _ in range(min(target_count, remaining_length)):
                    aa = random.choice(list(aa_set))
                    sequence.append(aa)
                    remaining_length -= 1
        
        # Fill remaining positions randomly
        while len(sequence) < length:
            sequence.append(random.choice(self.amino_acids))
        
        # Shuffle to avoid clustering
        random.shuffle(sequence)
        
        return ''.join(sequence)
    
    async def _validate_and_refine(self, sequence: str, constraints) -> str:
        """Validate and refine the generated sequence"""
        # Basic validation
        if not sequence:
            raise ValueError("Empty sequence generated")
        
        # Remove invalid characters
        valid_sequence = ''.join(c for c in sequence.upper() if c in self.amino_acids)
        
        if not valid_sequence:
            raise ValueError("No valid amino acids in generated sequence")
        
        # Apply length constraints if specified
        if constraints and constraints.length:
            if isinstance(constraints.length, list) and len(constraints.length) == 2:
                min_len, max_len = constraints.length
                if len(valid_sequence) < min_len:
                    # Extend sequence
                    extension = ''.join(random.choices(self.amino_acids, k=min_len - len(valid_sequence)))
                    valid_sequence += extension
                elif len(valid_sequence) > max_len:
                    # Truncate sequence
                    valid_sequence = valid_sequence[:max_len]
        
        return valid_sequence
    
    async def _calculate_properties(self, sequence: str) -> Dict[str, Any]:
        """Calculate chemical properties of the sequence"""
        if not sequence:
            return {}
        
        length = len(sequence)
        composition = {aa: sequence.count(aa) for aa in self.amino_acids if aa in sequence}
        
        # Calculate molecular weight (approximate)
        aa_weights = {
            'A': 89.1, 'R': 174.2, 'N': 132.1, 'D': 133.1, 'C': 121.2,
            'Q': 146.1, 'E': 147.1, 'G': 75.1, 'H': 155.2, 'I': 131.2,
            'L': 131.2, 'K': 146.2, 'M': 149.2, 'F': 165.2, 'P': 115.1,
            'S': 105.1, 'T': 119.1, 'W': 204.2, 'Y': 181.2, 'V': 117.1
        }
        
        molecular_weight = sum(aa_weights.get(aa, 0) * count for aa, count in composition.items())
        
        # Calculate hydrophobicity (Kyte-Doolittle scale)
        hydrophobicity_scale = {
            'A': 1.8, 'R': -4.5, 'N': -3.5, 'D': -3.5, 'C': 2.5,
            'Q': -3.5, 'E': -3.5, 'G': -0.4, 'H': -3.2, 'I': 4.5,
            'L': 3.8, 'K': -3.9, 'M': 1.9, 'F': 2.8, 'P': -1.6,
            'S': -0.8, 'T': -0.7, 'W': -0.9, 'Y': -1.3, 'V': 4.2
        }
        
        hydrophobicity = [hydrophobicity_scale.get(aa, 0) for aa in sequence]
        avg_hydrophobicity = sum(hydrophobicity) / len(hydrophobicity) if hydrophobicity else 0
        
        # Calculate charge distribution
        charge_scale = {
            'D': -1, 'E': -1, 'K': 1, 'R': 1, 'H': 0.5
        }
        
        charge_distribution = [charge_scale.get(aa, 0) for aa in sequence]
        net_charge = sum(charge_distribution)
        
        # Calculate isoelectric point (simplified)
        positive_count = sum(1 for aa in sequence if aa in 'KRH')
        negative_count = sum(1 for aa in sequence if aa in 'DE')
        
        if positive_count > negative_count:
            isoelectric_point = 8.0 + (positive_count - negative_count) / length * 2
        elif negative_count > positive_count:
            isoelectric_point = 6.0 - (negative_count - positive_count) / length * 2
        else:
            isoelectric_point = 7.0
        
        return {
            "molecular_weight": round(molecular_weight, 2),
            "isoelectric_point": round(isoelectric_point, 2),
            "hydrophobicity": hydrophobicity,
            "charge_distribution": charge_distribution,
            "net_charge": net_charge,
            "average_hydrophobicity": round(avg_hydrophobicity, 3),
            "composition": composition,
            "length": length
        }
    
    async def _calculate_validation_score(self, sequence: str, constraints) -> float:
        """Calculate how well the sequence meets the constraints"""
        if not constraints:
            return 0.9  # High score if no constraints
        
        score = 1.0
        penalties = []
        
        # Length constraint validation
        if constraints.length:
            if isinstance(constraints.length, list) and len(constraints.length) == 2:
                min_len, max_len = constraints.length
                if len(sequence) < min_len or len(sequence) > max_len:
                    penalty = abs(len(sequence) - (min_len + max_len) / 2) / max_len
                    penalties.append(min(penalty, 0.3))
        
        # Composition constraint validation
        if constraints.composition:
            comp = constraints.composition
            length = len(sequence)
            
            if hasattr(comp, 'hydrophobic') and comp.hydrophobic:
                actual = len([aa for aa in sequence if aa in self.aa_properties['hydrophobic']]) / length
                penalty = abs(actual - comp.hydrophobic) * 0.5
                penalties.append(min(penalty, 0.2))
            
            if hasattr(comp, 'polar') and comp.polar:
                actual = len([aa for aa in sequence if aa in self.aa_properties['polar']]) / length
                penalty = abs(actual - comp.polar) * 0.5
                penalties.append(min(penalty, 0.2))
            
            if hasattr(comp, 'charged') and comp.charged:
                actual = len([aa for aa in sequence if aa in self.aa_properties['charged']]) / length
                penalty = abs(actual - comp.charged) * 0.5
                penalties.append(min(penalty, 0.2))
        
        # Apply penalties
        total_penalty = sum(penalties)
        score = max(0.1, score - total_penalty)
        
        return round(score, 3)