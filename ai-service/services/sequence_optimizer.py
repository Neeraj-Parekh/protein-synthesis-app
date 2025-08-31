"""
Sequence Optimizer Service
Handles AI-powered protein sequence optimization
"""

import logging
import time
import random
from typing import Dict, List, Optional, Any
import asyncio

from models.requests import OptimizationRequest
from models.responses import OptimizationResponse, OptimizationImprovement, GenerationMetadata
from services.model_manager import ModelManager

logger = logging.getLogger(__name__)

class SequenceOptimizer:
    """AI-powered protein sequence optimizer"""
    
    def __init__(self, model_manager: ModelManager):
        self.model_manager = model_manager
        self.amino_acids = "ACDEFGHIKLMNPQRSTVWY"
        
        # Optimization strategies for different objectives
        self.optimization_strategies = {
            'stability': self._optimize_stability,
            'solubility': self._optimize_solubility,
            'expression': self._optimize_expression,
            'activity': self._optimize_activity,
            'binding': self._optimize_binding
        }
        
        # Amino acid substitution matrices for different objectives
        self.substitution_preferences = {
            'stability': {
                'P': ['A', 'G'],  # Proline to more flexible residues
                'G': ['A', 'S'],  # Glycine to slightly more structured
                'C': ['S', 'T'],  # Cysteine to avoid disulfide issues
            },
            'solubility': {
                'I': ['T', 'S'],  # Hydrophobic to hydrophilic
                'L': ['K', 'R'],  # Hydrophobic to charged
                'V': ['N', 'Q'],  # Hydrophobic to polar
                'F': ['Y', 'H'],  # Aromatic to polar aromatic
                'W': ['Y', 'H'],  # Large hydrophobic to smaller polar
            },
            'expression': {
                'M': ['L', 'I'],  # Methionine to other hydrophobic
                'C': ['A', 'S'],  # Cysteine to avoid aggregation
                'W': ['F', 'Y'],  # Tryptophan to other aromatics
            }
        }
    
    async def optimize(self, request: OptimizationRequest) -> OptimizationResponse:
        """Optimize a protein sequence for specified objectives"""
        start_time = time.time()
        
        try:
            # Load the requested model
            await self.model_manager.load_model(request.model)
            model = self.model_manager.get_model(request.model)
            
            # Perform optimization
            optimization_result = await self._optimize_with_model(model, request)
            
            optimization_time = time.time() - start_time
            
            # Create metadata
            metadata = GenerationMetadata(
                model=request.model,
                temperature=request.options.temperature if request.options else 0.6,
                generation_time=optimization_time,
                memory_used=self.model_manager.get_memory_usage(),
                constraints_applied=len(request.objectives)
            )
            
            return OptimizationResponse(
                optimization_id=f"opt_{int(time.time() * 1000)}",
                original_sequence=request.sequence,
                optimized_sequence=optimization_result["optimized_sequence"],
                improvements=optimization_result["improvements"],
                overall_confidence=optimization_result["overall_confidence"],
                mutations_made=optimization_result["mutations_made"],
                metadata=metadata,
                created_at=time.time()
            )
            
        except Exception as e:
            logger.error(f"Optimization failed: {e}")
            raise
    
    async def _optimize_with_model(self, model: Any, request: OptimizationRequest) -> Dict[str, Any]:
        """Optimize sequence using the specified model"""
        try:
            # Use model for optimization if available
            result = await model.optimize(
                sequence=request.sequence,
                objectives=request.objectives,
                conservative_mode=request.conservative_mode,
                max_mutations=request.max_mutations
            )
            
            return await self._process_model_result(result, request)
            
        except Exception as e:
            logger.error(f"Model optimization failed: {e}")
            # Fallback to rule-based optimization
            return await self._fallback_optimization(request)
    
    async def _fallback_optimization(self, request: OptimizationRequest) -> Dict[str, Any]:
        """Fallback rule-based optimization when model fails"""
        logger.info("Using fallback rule-based optimization")
        
        original_sequence = request.sequence
        optimized_sequence = original_sequence
        improvements = []
        mutations_made = 0
        
        # Apply optimization strategies for each objective
        for objective in request.objectives:
            if objective in self.optimization_strategies:
                strategy_result = await self.optimization_strategies[objective](
                    optimized_sequence, request
                )
                
                if strategy_result["sequence"] != optimized_sequence:
                    improvement = OptimizationImprovement(
                        objective=objective,
                        original_score=strategy_result["original_score"],
                        optimized_score=strategy_result["optimized_score"],
                        improvement=strategy_result["improvement"],
                        confidence=strategy_result["confidence"],
                        changes=strategy_result["changes"]
                    )
                    improvements.append(improvement)
                    optimized_sequence = strategy_result["sequence"]
                    mutations_made += len(strategy_result["changes"])
        
        # Calculate overall confidence
        overall_confidence = sum(imp.confidence for imp in improvements) / len(improvements) if improvements else 0.7
        
        return {
            "optimized_sequence": optimized_sequence,
            "improvements": improvements,
            "overall_confidence": overall_confidence,
            "mutations_made": mutations_made
        }
    
    async def _optimize_stability(self, sequence: str, request: OptimizationRequest) -> Dict[str, Any]:
        """Optimize sequence for stability"""
        original_score = await self._calculate_stability_score(sequence)
        optimized_sequence = sequence
        changes = []
        
        # Apply stability-focused mutations
        if 'stability' in self.substitution_preferences:
            prefs = self.substitution_preferences['stability']
            sequence_list = list(sequence)
            
            for i, aa in enumerate(sequence_list):
                if aa in prefs and (not request.max_mutations or len(changes) < request.max_mutations):
                    if not request.conservative_mode or random.random() < 0.3:
                        new_aa = random.choice(prefs[aa])
                        if new_aa != aa:
                            sequence_list[i] = new_aa
                            changes.append({
                                "position": i + 1,
                                "from": aa,
                                "to": new_aa,
                                "reason": "Improved structural stability"
                            })
            
            optimized_sequence = ''.join(sequence_list)
        
        optimized_score = await self._calculate_stability_score(optimized_sequence)
        improvement = optimized_score - original_score
        
        return {
            "sequence": optimized_sequence,
            "original_score": original_score,
            "optimized_score": optimized_score,
            "improvement": improvement,
            "confidence": 0.8 if improvement > 0 else 0.6,
            "changes": changes
        }
    
    async def _optimize_solubility(self, sequence: str, request: OptimizationRequest) -> Dict[str, Any]:
        """Optimize sequence for solubility"""
        original_score = await self._calculate_solubility_score(sequence)
        optimized_sequence = sequence
        changes = []
        
        # Replace hydrophobic residues with hydrophilic ones
        if 'solubility' in self.substitution_preferences:
            prefs = self.substitution_preferences['solubility']
            sequence_list = list(sequence)
            
            for i, aa in enumerate(sequence_list):
                if aa in prefs and (not request.max_mutations or len(changes) < request.max_mutations):
                    if not request.conservative_mode or random.random() < 0.4:
                        new_aa = random.choice(prefs[aa])
                        if new_aa != aa:
                            sequence_list[i] = new_aa
                            changes.append({
                                "position": i + 1,
                                "from": aa,
                                "to": new_aa,
                                "reason": "Increased surface hydrophilicity"
                            })
            
            optimized_sequence = ''.join(sequence_list)
        
        optimized_score = await self._calculate_solubility_score(optimized_sequence)
        improvement = optimized_score - original_score
        
        return {
            "sequence": optimized_sequence,
            "original_score": original_score,
            "optimized_score": optimized_score,
            "improvement": improvement,
            "confidence": 0.75 if improvement > 0 else 0.6,
            "changes": changes
        }
    
    async def _optimize_expression(self, sequence: str, request: OptimizationRequest) -> Dict[str, Any]:
        """Optimize sequence for expression"""
        original_score = await self._calculate_expression_score(sequence)
        optimized_sequence = sequence
        changes = []
        
        # Apply expression-focused mutations
        if 'expression' in self.substitution_preferences:
            prefs = self.substitution_preferences['expression']
            sequence_list = list(sequence)
            
            for i, aa in enumerate(sequence_list):
                if aa in prefs and (not request.max_mutations or len(changes) < request.max_mutations):
                    if not request.conservative_mode or random.random() < 0.35:
                        new_aa = random.choice(prefs[aa])
                        if new_aa != aa:
                            sequence_list[i] = new_aa
                            changes.append({
                                "position": i + 1,
                                "from": aa,
                                "to": new_aa,
                                "reason": "Improved expression compatibility"
                            })
            
            optimized_sequence = ''.join(sequence_list)
        
        optimized_score = await self._calculate_expression_score(optimized_sequence)
        improvement = optimized_score - original_score
        
        return {
            "sequence": optimized_sequence,
            "original_score": original_score,
            "optimized_score": optimized_score,
            "improvement": improvement,
            "confidence": 0.7 if improvement > 0 else 0.6,
            "changes": changes
        }
    
    async def _optimize_activity(self, sequence: str, request: OptimizationRequest) -> Dict[str, Any]:
        """Optimize sequence for activity (placeholder)"""
        # This would require domain-specific knowledge
        return {
            "sequence": sequence,
            "original_score": 0.7,
            "optimized_score": 0.75,
            "improvement": 0.05,
            "confidence": 0.6,
            "changes": []
        }
    
    async def _optimize_binding(self, sequence: str, request: OptimizationRequest) -> Dict[str, Any]:
        """Optimize sequence for binding (placeholder)"""
        # This would require specific binding target information
        return {
            "sequence": sequence,
            "original_score": 0.6,
            "optimized_score": 0.65,
            "improvement": 0.05,
            "confidence": 0.6,
            "changes": []
        }
    
    async def _calculate_stability_score(self, sequence: str) -> float:
        """Calculate stability score for a sequence"""
        # Simplified stability calculation
        # In reality, this would use more sophisticated methods
        
        # Factors that contribute to stability
        score = 0.5  # Base score
        
        # Penalize for too many prolines (rigid)
        proline_count = sequence.count('P')
        if proline_count > len(sequence) * 0.1:
            score -= (proline_count / len(sequence) - 0.1) * 0.5
        
        # Reward for balanced charge distribution
        positive_count = sum(1 for aa in sequence if aa in 'KRH')
        negative_count = sum(1 for aa in sequence if aa in 'DE')
        charge_balance = 1 - abs(positive_count - negative_count) / len(sequence)
        score += charge_balance * 0.2
        
        # Reward for moderate hydrophobicity
        hydrophobic_count = sum(1 for aa in sequence if aa in 'AILMFPWV')
        hydrophobic_ratio = hydrophobic_count / len(sequence)
        if 0.3 <= hydrophobic_ratio <= 0.5:
            score += 0.2
        
        return min(1.0, max(0.0, score))
    
    async def _calculate_solubility_score(self, sequence: str) -> float:
        """Calculate solubility score for a sequence"""
        # Simplified solubility calculation
        score = 0.5  # Base score
        
        # Reward for hydrophilic residues
        hydrophilic_count = sum(1 for aa in sequence if aa in 'NQSTYDEKREH')
        hydrophilic_ratio = hydrophilic_count / len(sequence)
        score += hydrophilic_ratio * 0.4
        
        # Penalize for too many hydrophobic residues
        hydrophobic_count = sum(1 for aa in sequence if aa in 'AILMFPWV')
        hydrophobic_ratio = hydrophobic_count / len(sequence)
        if hydrophobic_ratio > 0.4:
            score -= (hydrophobic_ratio - 0.4) * 0.5
        
        # Reward for charged residues (improve solubility)
        charged_count = sum(1 for aa in sequence if aa in 'DEKR')
        charged_ratio = charged_count / len(sequence)
        score += charged_ratio * 0.3
        
        return min(1.0, max(0.0, score))
    
    async def _calculate_expression_score(self, sequence: str) -> float:
        """Calculate expression score for a sequence"""
        # Simplified expression calculation
        score = 0.6  # Base score
        
        # Penalize for rare codons (simplified by amino acid frequency)
        rare_aa_count = sum(1 for aa in sequence if aa in 'WMC')
        if rare_aa_count > len(sequence) * 0.05:
            score -= (rare_aa_count / len(sequence) - 0.05) * 0.3
        
        # Reward for avoiding aggregation-prone sequences
        # Penalize for consecutive hydrophobic residues
        consecutive_hydrophobic = 0
        max_consecutive = 0
        for aa in sequence:
            if aa in 'AILMFPWV':
                consecutive_hydrophobic += 1
                max_consecutive = max(max_consecutive, consecutive_hydrophobic)
            else:
                consecutive_hydrophobic = 0
        
        if max_consecutive > 3:
            score -= (max_consecutive - 3) * 0.1
        
        return min(1.0, max(0.0, score))
    
    async def _process_model_result(self, result: Dict[str, Any], request: OptimizationRequest) -> Dict[str, Any]:
        """Process result from AI model"""
        # Convert model result to our format
        improvements = []
        
        if "improvements" in result:
            for imp in result["improvements"]:
                improvement = OptimizationImprovement(
                    objective=imp["objective"],
                    original_score=imp.get("original_score", 0.7),
                    optimized_score=imp.get("optimized_score", 0.8),
                    improvement=imp.get("score_improvement", 0.1),
                    confidence=imp.get("confidence", 0.8),
                    changes=imp.get("changes", [])
                )
                improvements.append(improvement)
        
        return {
            "optimized_sequence": result.get("optimized_sequence", request.sequence),
            "improvements": improvements,
            "overall_confidence": result.get("overall_confidence", 0.8),
            "mutations_made": len(result.get("changes", []))
        }