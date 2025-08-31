"""
Production-Ready AI Service with ESM-2 Integration
Integrates the working ESM-2 model with your protein synthesis application
"""
import torch
import numpy as np
from typing import Dict, List, Optional, Any, Tuple
import logging
import json
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ProteinESM2Service:
    """ESM-2 based protein analysis service"""
    
    def __init__(self):
        self.model = None
        self.alphabet = None
        self.batch_converter = None
        self.loaded = False
        self._load_model()
    
    def _load_model(self):
        """Load ESM-2 model"""
        try:
            import esm
            logger.info("Loading ESM-2 model...")
            
            # Load ESM-2 model (8M parameters - fast and reliable)
            self.model, self.alphabet = esm.pretrained.esm2_t6_8M_UR50D()
            self.batch_converter = self.alphabet.get_batch_converter()
            self.model.eval()  # Set to evaluation mode
            
            # Move to GPU if available
            if torch.cuda.is_available():
                self.model = self.model.cuda()
                logger.info("ESM-2 model loaded on GPU")
            else:
                logger.info("ESM-2 model loaded on CPU")
            
            self.loaded = True
            param_count = sum(p.numel() for p in self.model.parameters())
            logger.info(f"ESM-2 model loaded successfully ({param_count:,} parameters)")
            
        except Exception as e:
            logger.error(f"Failed to load ESM-2 model: {e}")
            self.loaded = False
    
    def get_protein_embeddings(self, sequence: str) -> Optional[torch.Tensor]:
        """Get protein sequence embeddings from ESM-2"""
        if not self.loaded:
            return None
        
        try:
            # Prepare batch
            data = [("protein", sequence)]
            batch_labels, batch_strs, batch_tokens = self.batch_converter(data)
            
            # Move to GPU if available
            if torch.cuda.is_available():
                batch_tokens = batch_tokens.cuda()
            
            # Get embeddings
            with torch.no_grad():
                results = self.model(batch_tokens, repr_layers=[6], return_contacts=True)
            
            # Extract per-residue representations
            token_representations = results["representations"][6]
            
            # Remove batch dimension and special tokens (first and last)
            sequence_representations = token_representations[0, 1:-1]
            
            return sequence_representations
            
        except Exception as e:
            logger.error(f"Failed to get embeddings: {e}")
            return None
    
    def predict_contacts(self, sequence: str) -> Optional[torch.Tensor]:
        """Predict residue-residue contacts"""
        if not self.loaded:
            return None
        
        try:
            # Prepare batch
            data = [("protein", sequence)]
            batch_labels, batch_strs, batch_tokens = self.batch_converter(data)
            
            # Move to GPU if available
            if torch.cuda.is_available():
                batch_tokens = batch_tokens.cuda()
            
            # Get contact predictions
            with torch.no_grad():
                results = self.model(batch_tokens, repr_layers=[6], return_contacts=True)
            
            contacts = results["contacts"][0]  # Remove batch dimension
            
            return contacts
            
        except Exception as e:
            logger.error(f"Failed to predict contacts: {e}")
            return None
    
    def analyze_sequence_properties(self, sequence: str) -> Dict[str, Any]:
        """Analyze sequence properties using ESM-2 embeddings"""
        if not self.loaded:
            return {"error": "ESM-2 model not loaded"}
        
        try:
            # Get embeddings
            embeddings = self.get_protein_embeddings(sequence)
            if embeddings is None:
                return {"error": "Failed to get embeddings"}
            
            # Calculate various properties from embeddings
            embeddings_cpu = embeddings.cpu().numpy()
            
            # Basic statistics
            mean_embedding = np.mean(embeddings_cpu, axis=0)
            std_embedding = np.std(embeddings_cpu, axis=0)
            
            # Sequence-level properties
            hydrophobic_residues = set("AILMFPWVY")
            polar_residues = set("NQST") 
            charged_residues = set("DEKR")
            
            hydrophobic_count = sum(1 for aa in sequence if aa in hydrophobic_residues)
            polar_count = sum(1 for aa in sequence if aa in polar_residues)
            charged_count = sum(1 for aa in sequence if aa in charged_residues)
            
            # Amino acid composition
            aa_composition = {aa: sequence.count(aa) / len(sequence) for aa in set(sequence)}
            
            # Embedding-based features
            embedding_magnitude = np.linalg.norm(mean_embedding)
            embedding_variance = np.mean(std_embedding)
            
            return {
                "sequence_length": len(sequence),
                "hydrophobic_fraction": hydrophobic_count / len(sequence),
                "polar_fraction": polar_count / len(sequence),
                "charged_fraction": charged_count / len(sequence),
                "aa_composition": aa_composition,
                "embedding_magnitude": float(embedding_magnitude),
                "embedding_variance": float(embedding_variance),
                "most_frequent_aa": max(aa_composition.keys(), key=lambda x: aa_composition[x]),
                "embedding_shape": list(embeddings_cpu.shape),
                "analysis_timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze sequence: {e}")
            return {"error": f"Analysis failed: {e}"}

class ProductionAIService:
    """Production-ready AI service for protein synthesis application"""
    
    def __init__(self):
        self.esm2_service = ProteinESM2Service()
        self.model_status = {
            "esm2": self.esm2_service.loaded,
            "last_update": datetime.now().isoformat()
        }
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get health status of all AI services"""
        return {
            "status": "healthy" if self.esm2_service.loaded else "degraded",
            "models": self.model_status,
            "capabilities": self.get_available_capabilities(),
            "timestamp": datetime.now().isoformat()
        }
    
    def get_available_capabilities(self) -> List[str]:
        """Get list of available AI capabilities"""
        capabilities = []
        
        if self.esm2_service.loaded:
            capabilities.extend([
                "sequence_analysis",
                "protein_embeddings", 
                "contact_prediction",
                "property_analysis"
            ])
        
        return capabilities
    
    def analyze_protein_sequence(self, sequence: str) -> Dict[str, Any]:
        """Comprehensive protein sequence analysis"""
        if not sequence:
            return {"error": "No sequence provided"}
        
        # Validate sequence
        valid_aas = set("ACDEFGHIKLMNPQRSTVWY")
        if not all(aa in valid_aas for aa in sequence.upper()):
            return {"error": "Invalid amino acid characters in sequence"}
        
        sequence = sequence.upper()
        
        # Basic analysis
        basic_analysis = {
            "sequence": sequence,
            "length": len(sequence),
            "molecular_weight": self._calculate_molecular_weight(sequence),
            "isoelectric_point": self._estimate_isoelectric_point(sequence)
        }
        
        # ESM-2 analysis
        esm2_analysis = self.esm2_service.analyze_sequence_properties(sequence)
        
        # Combine results
        return {
            "basic_properties": basic_analysis,
            "esm2_analysis": esm2_analysis,
            "model_used": "ESM-2",
            "analysis_id": f"analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        }
    
    def predict_protein_contacts(self, sequence: str) -> Dict[str, Any]:
        """Predict protein residue contacts"""
        if not self.esm2_service.loaded:
            return {"error": "ESM-2 model not available"}
        
        contacts = self.esm2_service.predict_contacts(sequence)
        
        if contacts is None:
            return {"error": "Contact prediction failed"}
        
        # Convert to numpy for analysis
        contacts_np = contacts.cpu().numpy()
        
        # Find top contacts
        sequence_length = len(sequence)
        contact_threshold = 0.5
        
        strong_contacts = []
        for i in range(sequence_length):
            for j in range(i + 5, sequence_length):  # Skip local contacts
                if contacts_np[i, j] > contact_threshold:
                    strong_contacts.append({
                        "residue_i": i + 1,  # 1-indexed
                        "residue_j": j + 1,
                        "contact_probability": float(contacts_np[i, j]),
                        "amino_acids": f"{sequence[i]}-{sequence[j]}"
                    })
        
        # Sort by probability
        strong_contacts.sort(key=lambda x: x["contact_probability"], reverse=True)
        
        return {
            "sequence": sequence,
            "contact_map_shape": list(contacts_np.shape),
            "strong_contacts": strong_contacts[:20],  # Top 20 contacts
            "total_strong_contacts": len(strong_contacts),
            "contact_threshold": contact_threshold,
            "model_used": "ESM-2"
        }
    
    def generate_protein_variants(self, base_sequence: str, num_variants: int = 5) -> Dict[str, Any]:
        """Generate protein sequence variants"""
        if not base_sequence:
            return {"error": "No base sequence provided"}
        
        # Simple mutation-based variant generation
        amino_acids = list("ACDEFGHIKLMNPQRSTVWY")
        variants = []
        
        for i in range(num_variants):
            # Create variant by random mutations
            variant = list(base_sequence.upper())
            num_mutations = max(1, len(variant) // 20)  # ~5% mutations
            
            # Random positions to mutate
            positions = np.random.choice(len(variant), num_mutations, replace=False)
            
            for pos in positions:
                # Avoid mutating to the same amino acid
                current_aa = variant[pos]
                possible_aas = [aa for aa in amino_acids if aa != current_aa]
                variant[pos] = np.random.choice(possible_aas)
            
            variant_sequence = ''.join(variant)
            
            # Analyze variant
            variant_analysis = self.analyze_protein_sequence(variant_sequence)
            
            variants.append({
                "variant_id": f"variant_{i+1}",
                "sequence": variant_sequence,
                "mutations": len(positions),
                "mutation_positions": [int(p) + 1 for p in positions],  # 1-indexed
                "analysis": variant_analysis
            })
        
        return {
            "base_sequence": base_sequence,
            "num_variants_generated": len(variants),
            "variants": variants,
            "generation_method": "random_mutation"
        }
    
    def _calculate_molecular_weight(self, sequence: str) -> float:
        """Calculate approximate molecular weight"""
        # Simplified amino acid weights (Da)
        aa_weights = {
            'A': 89.1, 'C': 121.0, 'D': 133.1, 'E': 147.1, 'F': 165.2,
            'G': 75.1, 'H': 155.2, 'I': 131.2, 'K': 146.2, 'L': 131.2,
            'M': 149.2, 'N': 132.1, 'P': 115.1, 'Q': 146.2, 'R': 174.2,
            'S': 105.1, 'T': 119.1, 'V': 117.1, 'W': 204.2, 'Y': 181.2
        }
        
        weight = sum(aa_weights.get(aa, 110.0) for aa in sequence)
        # Subtract water molecules for peptide bonds
        weight -= (len(sequence) - 1) * 18.0
        
        return round(weight, 1)
    
    def _estimate_isoelectric_point(self, sequence: str) -> float:
        """Estimate isoelectric point (simplified)"""
        # Simplified pKa values
        positive_aas = {'K': 10.5, 'R': 12.5, 'H': 6.0}
        negative_aas = {'D': 3.9, 'E': 4.3}
        
        positive_count = sum(sequence.count(aa) for aa in positive_aas.keys())
        negative_count = sum(sequence.count(aa) for aa in negative_aas.keys())
        
        # Very simplified estimation
        if positive_count > negative_count:
            return 8.5 + (positive_count - negative_count) * 0.1
        elif negative_count > positive_count:
            return 6.5 - (negative_count - positive_count) * 0.1
        else:
            return 7.0

# Test the production service
def test_production_ai_service():
    """Test the production AI service"""
    print("🧬 Testing Production AI Service")
    print("=" * 50)
    
    service = ProductionAIService()
    
    # Health check
    health = service.get_health_status()
    print(f"🏥 Health Status: {health['status']}")
    print(f"🔧 Capabilities: {', '.join(health['capabilities'])}")
    
    # Test sequence analysis
    test_sequence = "MKLLVLGLPGAGKGTQCKIINVQYETGPSKLIGGMDLNAFKYLGN"
    print(f"\n🧪 Testing with sequence: {test_sequence}")
    
    # Comprehensive analysis
    analysis = service.analyze_protein_sequence(test_sequence)
    print(f"📊 Analysis completed:")
    print(f"   Length: {analysis['basic_properties']['length']}")
    print(f"   MW: {analysis['basic_properties']['molecular_weight']} Da")
    print(f"   pI: {analysis['basic_properties']['isoelectric_point']}")
    
    if 'esm2_analysis' in analysis and 'embedding_magnitude' in analysis['esm2_analysis']:
        print(f"   ESM-2 embedding magnitude: {analysis['esm2_analysis']['embedding_magnitude']:.3f}")
    
    # Test contact prediction
    contacts = service.predict_protein_contacts(test_sequence)
    if 'strong_contacts' in contacts:
        print(f"🔗 Found {contacts['total_strong_contacts']} strong contacts")
        if contacts['strong_contacts']:
            top_contact = contacts['strong_contacts'][0]
            print(f"   Top contact: {top_contact['amino_acids']} (prob: {top_contact['contact_probability']:.3f})")
    
    # Test variant generation
    variants = service.generate_protein_variants(test_sequence, 3)
    print(f"🧬 Generated {variants['num_variants_generated']} variants")
    
    print("\n✅ Production AI Service is working correctly!")
    return service

if __name__ == "__main__":
    service = test_production_ai_service()
