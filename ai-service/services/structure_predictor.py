"""
Structure Predictor Service
Handles AI-powered protein structure prediction
"""

import logging
import time
import random
from typing import Dict, List, Optional, Any
import asyncio

from models.requests import PredictionRequest
from models.responses import PredictionResponse, StructurePrediction, DomainPrediction
from services.model_manager import ModelManager

logger = logging.getLogger(__name__)

class StructurePredictor:
    """AI-powered protein structure predictor"""
    
    def __init__(self, model_manager: ModelManager):
        self.model_manager = model_manager
        self.amino_acids = "ACDEFGHIKLMNPQRSTVWY"
        
        # Secondary structure prediction mapping
        self.ss_mapping = {
            'H': 'helix',
            'E': 'sheet', 
            'C': 'coil',
            'T': 'turn',
            'B': 'bridge',
            'G': '3-10 helix',
            'I': 'pi helix',
            'S': 'bend'
        }
        
        # Common protein domains for prediction
        self.common_domains = [
            {"name": "Immunoglobulin domain", "pattern": "C.*C.*C.*C", "min_length": 70},
            {"name": "EGF-like domain", "pattern": "C.*C.*C.*C.*C.*C", "min_length": 40},
            {"name": "Fibronectin type III", "pattern": ".*", "min_length": 90},
            {"name": "SH3 domain", "pattern": ".*", "min_length": 50},
            {"name": "PDZ domain", "pattern": ".*", "min_length": 80},
            {"name": "WD40 repeat", "pattern": ".*W.*D.*", "min_length": 40}
        ]
    
    async def predict(self, request: PredictionRequest) -> PredictionResponse:
        """Predict protein structure from sequence"""
        start_time = time.time()
        
        try:
            # Generate structure prediction
            structure = await self._predict_structure(request)
            
            # Calculate average confidence
            avg_confidence = sum(structure.confidence) / len(structure.confidence) if structure.confidence else 0.0
            
            prediction_time = time.time() - start_time
            
            return PredictionResponse(
                prediction_id=f"pred_{int(time.time() * 1000)}",
                sequence=request.sequence,
                structure=structure,
                method=request.method,
                average_confidence=avg_confidence,
                prediction_time=prediction_time,
                created_at=time.time()
            )
            
        except Exception as e:
            logger.error(f"Structure prediction failed: {e}")
            raise
    
    async def _predict_structure(self, request: PredictionRequest) -> StructurePrediction:
        """Generate structure prediction"""
        sequence = request.sequence
        
        # Generate PDB data (simplified/placeholder)
        pdb_data = await self._generate_pdb_data(sequence)
        
        # Generate per-residue confidence scores
        confidence = await self._generate_confidence_scores(sequence, request.confidence_threshold)
        
        # Predict domains if requested
        domains = []
        if request.include_domains:
            domains = await self._predict_domains(sequence)
        
        # Predict secondary structure
        secondary_structure = None
        if hasattr(request, 'include_secondary') and request.include_secondary:
            secondary_structure = await self._predict_secondary_structure(sequence)
        
        # Predict disorder regions if requested
        disorder_regions = None
        if request.include_disorder:
            disorder_regions = await self._predict_disorder_regions(sequence)
        
        return StructurePrediction(
            pdb_data=pdb_data,
            confidence=confidence,
            domains=domains,
            secondary_structure=secondary_structure,
            disorder_regions=disorder_regions
        )
    
    async def _generate_pdb_data(self, sequence: str) -> str:
        """Generate simplified PDB data for the sequence"""
        # This is a very simplified PDB generation
        # In reality, this would use sophisticated structure prediction models
        
        pdb_lines = []
        pdb_lines.append("HEADER    PREDICTED STRUCTURE                     01-JAN-25   PRED")
        pdb_lines.append("TITLE     AI PREDICTED PROTEIN STRUCTURE")
        pdb_lines.append("MODEL        1")
        
        # Generate atomic coordinates (simplified)
        atom_id = 1
        for i, aa in enumerate(sequence):
            residue_num = i + 1
            
            # Generate simplified backbone atoms (N, CA, C, O)
            # In reality, these would be calculated using proper geometry
            x = random.uniform(-50, 50)
            y = random.uniform(-50, 50) 
            z = random.uniform(-50, 50)
            
            # Nitrogen
            pdb_lines.append(f"ATOM  {atom_id:5d}  N   {self._aa_three_letter(aa)} A{residue_num:4d}    {x:8.3f}{y:8.3f}{z:8.3f}  1.00 50.00           N")
            atom_id += 1
            
            # Alpha carbon
            x += random.uniform(-2, 2)
            y += random.uniform(-2, 2)
            z += random.uniform(-2, 2)
            pdb_lines.append(f"ATOM  {atom_id:5d}  CA  {self._aa_three_letter(aa)} A{residue_num:4d}    {x:8.3f}{y:8.3f}{z:8.3f}  1.00 50.00           C")
            atom_id += 1
            
            # Carbonyl carbon
            x += random.uniform(-2, 2)
            y += random.uniform(-2, 2)
            z += random.uniform(-2, 2)
            pdb_lines.append(f"ATOM  {atom_id:5d}  C   {self._aa_three_letter(aa)} A{residue_num:4d}    {x:8.3f}{y:8.3f}{z:8.3f}  1.00 50.00           C")
            atom_id += 1
            
            # Oxygen
            x += random.uniform(-2, 2)
            y += random.uniform(-2, 2)
            z += random.uniform(-2, 2)
            pdb_lines.append(f"ATOM  {atom_id:5d}  O   {self._aa_three_letter(aa)} A{residue_num:4d}    {x:8.3f}{y:8.3f}{z:8.3f}  1.00 50.00           O")
            atom_id += 1
        
        pdb_lines.append("ENDMDL")
        pdb_lines.append("END")
        
        return "\n".join(pdb_lines)
    
    def _aa_three_letter(self, aa: str) -> str:
        """Convert single letter amino acid to three letter code"""
        mapping = {
            'A': 'ALA', 'R': 'ARG', 'N': 'ASN', 'D': 'ASP', 'C': 'CYS',
            'Q': 'GLN', 'E': 'GLU', 'G': 'GLY', 'H': 'HIS', 'I': 'ILE',
            'L': 'LEU', 'K': 'LYS', 'M': 'MET', 'F': 'PHE', 'P': 'PRO',
            'S': 'SER', 'T': 'THR', 'W': 'TRP', 'Y': 'TYR', 'V': 'VAL'
        }
        return mapping.get(aa, 'UNK')
    
    async def _generate_confidence_scores(self, sequence: str, threshold: float) -> List[float]:
        """Generate per-residue confidence scores"""
        # Simplified confidence generation
        # In reality, this would come from the structure prediction model
        
        confidence_scores = []
        for i, aa in enumerate(sequence):
            # Generate confidence based on amino acid properties and position
            base_confidence = 0.7
            
            # Terminal residues typically have lower confidence
            if i < 5 or i >= len(sequence) - 5:
                base_confidence -= 0.1
            
            # Some amino acids are easier to predict
            if aa in 'AILMFV':  # Hydrophobic, structured
                base_confidence += 0.1
            elif aa in 'GP':  # Flexible
                base_confidence -= 0.15
            elif aa in 'DEKR':  # Charged, often surface
                base_confidence += 0.05
            
            # Add some randomness
            confidence = base_confidence + random.uniform(-0.1, 0.1)
            confidence = max(0.1, min(0.99, confidence))
            
            confidence_scores.append(round(confidence, 3))
        
        return confidence_scores
    
    async def _predict_domains(self, sequence: str) -> List[DomainPrediction]:
        """Predict protein domains in the sequence"""
        domains = []
        
        # Simple domain prediction based on sequence patterns and length
        seq_length = len(sequence)
        
        # Look for potential domains
        for domain_info in self.common_domains:
            if seq_length >= domain_info["min_length"]:
                # Simple pattern matching (in reality, would use HMM profiles)
                import re
                if re.search(domain_info["pattern"], sequence):
                    # Predict domain location (simplified)
                    start = random.randint(1, max(1, seq_length - domain_info["min_length"]))
                    end = min(start + domain_info["min_length"] + random.randint(0, 20), seq_length)
                    
                    confidence = random.uniform(0.6, 0.9)
                    
                    domain = DomainPrediction(
                        name=domain_info["name"],
                        start=start,
                        end=end,
                        confidence=round(confidence, 3),
                        description=f"Predicted {domain_info['name']}",
                        family=domain_info["name"].split()[0]
                    )
                    domains.append(domain)
                    
                    # Don't predict too many domains
                    if len(domains) >= 3:
                        break
        
        # If no specific domains found, create a generic domain
        if not domains and seq_length > 50:
            domain = DomainPrediction(
                name="Globular domain",
                start=1,
                end=seq_length,
                confidence=0.7,
                description="Predicted globular protein domain",
                family="Unknown"
            )
            domains.append(domain)
        
        return domains
    
    async def _predict_secondary_structure(self, sequence: str) -> List[str]:
        """Predict secondary structure for each residue"""
        # Simplified secondary structure prediction
        # In reality, would use sophisticated ML models
        
        ss_prediction = []
        
        for i, aa in enumerate(sequence):
            # Simple rules-based prediction
            if aa in 'AEILMV':  # Helix-favoring
                if random.random() < 0.6:
                    ss = 'H'
                else:
                    ss = 'C'
            elif aa in 'FWYV':  # Sheet-favoring
                if random.random() < 0.5:
                    ss = 'E'
                else:
                    ss = 'C'
            elif aa in 'GP':  # Loop-favoring
                ss = 'C'
            else:
                # Random assignment with bias toward coil
                choices = ['H', 'E', 'C', 'C', 'C']  # Bias toward coil
                ss = random.choice(choices)
            
            ss_prediction.append(ss)
        
        # Smooth the prediction (secondary structures tend to be continuous)
        smoothed = self._smooth_secondary_structure(ss_prediction)
        
        return [self.ss_mapping.get(ss, 'coil') for ss in smoothed]
    
    def _smooth_secondary_structure(self, ss_pred: List[str]) -> List[str]:
        """Smooth secondary structure prediction"""
        if len(ss_pred) < 3:
            return ss_pred
        
        smoothed = ss_pred.copy()
        
        # Apply simple smoothing filter
        for i in range(1, len(ss_pred) - 1):
            prev_ss = ss_pred[i-1]
            curr_ss = ss_pred[i]
            next_ss = ss_pred[i+1]
            
            # If current is different from both neighbors, change it
            if curr_ss != prev_ss and curr_ss != next_ss and prev_ss == next_ss:
                smoothed[i] = prev_ss
        
        return smoothed
    
    async def _predict_disorder_regions(self, sequence: str) -> List[Dict[str, int]]:
        """Predict disordered regions in the sequence"""
        disorder_regions = []
        
        # Simple disorder prediction based on amino acid composition
        disorder_scores = []
        
        for aa in sequence:
            # Disorder-promoting amino acids
            if aa in 'GPQSRKE':
                score = random.uniform(0.6, 0.9)
            # Order-promoting amino acids
            elif aa in 'WFYILMV':
                score = random.uniform(0.1, 0.4)
            else:
                score = random.uniform(0.3, 0.7)
            
            disorder_scores.append(score)
        
        # Find regions with high disorder scores
        in_disorder = False
        start_pos = 0
        
        for i, score in enumerate(disorder_scores):
            if score > 0.7 and not in_disorder:
                # Start of disorder region
                in_disorder = True
                start_pos = i + 1
            elif score <= 0.7 and in_disorder:
                # End of disorder region
                if i - start_pos + 1 >= 5:  # Minimum length for disorder region
                    disorder_regions.append({
                        "start": start_pos,
                        "end": i,
                        "confidence": 0.8
                    })
                in_disorder = False
        
        # Handle case where sequence ends in disorder
        if in_disorder and len(sequence) - start_pos + 1 >= 5:
            disorder_regions.append({
                "start": start_pos,
                "end": len(sequence),
                "confidence": 0.8
            })
        
        return disorder_regions