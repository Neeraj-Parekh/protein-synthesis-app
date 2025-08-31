import os
import requests
import json
from typing import Dict, List, Optional, Any
import logging
from pathlib import Path
import subprocess
import time

logger = logging.getLogger(__name__)

class OllamaService:
    def __init__(self):
        self.base_url = "http://localhost:11434"
        self.external_models_path = Path("/mnt/01DBA40B162FF9C0/ollama-models")
        self.available_models = self._discover_models()
        
    def _discover_models(self) -> List[Dict[str, Any]]:
        """Discover available models from external storage"""
        models = []
        
        try:
            # Check if external models directory exists
            if self.external_models_path.exists():
                logger.info(f"Scanning for models in: {self.external_models_path}")
                
                # Check for Ollama manifest models
                manifest_path = self.external_models_path / "manifests" / "registry.ollama.ai" / "library"
                if manifest_path.exists():
                    for model_dir in manifest_path.iterdir():
                        if model_dir.is_dir():
                            model_info = {
                                "name": model_dir.name,
                                "path": str(model_dir),
                                "size": self._calculate_dir_size(model_dir),
                                "type": "ollama",
                                "available": True,
                                "source": "manifest",
                                "description": self._get_model_description(model_dir.name)
                            }
                            models.append(model_info)
                
                # Check for protein-specific models
                protein_models_path = self.external_models_path / "protein-models"
                if protein_models_path.exists():
                    for model_dir in protein_models_path.iterdir():
                        if model_dir.is_dir() and model_dir.name != "tools":
                            model_info = {
                                "name": f"protein-{model_dir.name}",
                                "path": str(model_dir),
                                "size": self._calculate_dir_size(model_dir),
                                "type": "python",
                                "available": True,
                                "source": "protein-models",
                                "description": self._get_protein_model_description(model_dir.name)
                            }
                            models.append(model_info)
                            
                logger.info(f"Found {len(models)} models in external storage")
            else:
                logger.warning(f"External models path not found: {self.external_models_path}")
                
        except Exception as e:
            logger.error(f"Error discovering models: {e}")
            
        # Add fallback models if no external models found
        if not models:
            models = self._get_fallback_models()
            
        return models
    
    def _calculate_dir_size(self, path: Path) -> int:
        """Calculate total size of directory"""
        try:
            total_size = 0
            for dirpath, dirnames, filenames in os.walk(path):
                for f in filenames:
                    fp = os.path.join(dirpath, f)
                    if os.path.exists(fp):
                        total_size += os.path.getsize(fp)
            return total_size
        except Exception:
            return 0
    
    def _get_model_description(self, model_name: str) -> str:
        """Get description for Ollama models"""
        descriptions = {
            "deepseek-r1": "DeepSeek R1 - Advanced reasoning model for complex problem solving",
            "nomic-embed-text": "Nomic Embed Text - Text embedding model for semantic search",
            "protein-esm3-chat": "ESM3 Chat - Conversational protein language model",
            "protein-esm3-external": "ESM3 External - Protein sequence analysis and generation",
            "protein-openfold-external": "OpenFold External - Protein structure prediction model", 
            "protein-rfdiffusion-external": "RFDiffusion External - Protein design and optimization"
        }
        return descriptions.get(model_name, f"AI model: {model_name}")
    
    def _get_protein_model_description(self, model_name: str) -> str:
        """Get description for protein-specific models"""
        descriptions = {
            "esm3": "ESM3 - Meta's evolutionary scale modeling for proteins",
            "openfold": "OpenFold - Open source protein structure prediction",
            "rfdiffusion": "RFDiffusion - Protein design via diffusion models"
        }
        return descriptions.get(model_name, f"Protein model: {model_name}")
    
    def _get_fallback_models(self) -> List[Dict[str, Any]]:
        """Fallback models if external storage is not available"""
        return [
            {
                "name": "llama3.2",
                "path": "fallback",
                "size": 0,
                "type": "ollama",
                "available": False,
                "source": "fallback",
                "description": "Llama 3.2 model (requires download)"
            },
            {
                "name": "protein-esm2-simple",
                "path": "fallback", 
                "size": 0,
                "type": "python",
                "available": False,
                "source": "fallback",
                "description": "Simple ESM-2 protein model (built-in)"
            }
        ]
    
    def get_available_models(self) -> List[Dict[str, Any]]:
        """Get list of all available models"""
        return self.available_models
    
    def is_ollama_running(self) -> bool:
        """Check if Ollama service is running"""
        try:
            response = requests.get(f"{self.base_url}/api/version", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def start_ollama_service(self) -> bool:
        """Start Ollama service with external models path"""
        try:
            # Set environment variables for Ollama
            env = os.environ.copy()
            env["OLLAMA_MODELS"] = str(self.external_models_path)
            
            # Check if already running
            if self.is_ollama_running():
                logger.info("Ollama service is already running")
                return True
            
            # Start Ollama in background
            logger.info("Starting Ollama service...")
            subprocess.Popen(
                ["ollama", "serve"],
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            
            # Wait for service to start
            for _ in range(30):  # Wait up to 30 seconds
                time.sleep(1)
                if self.is_ollama_running():
                    logger.info("Ollama service started successfully")
                    return True
            
            logger.error("Ollama service failed to start within 30 seconds")
            return False
            
        except Exception as e:
            logger.error(f"Error starting Ollama service: {e}")
            return False
    
    def load_model(self, model_name: str) -> bool:
        """Load a specific model"""
        try:
            # Ensure Ollama is running
            if not self.is_ollama_running():
                if not self.start_ollama_service():
                    return False
            
            # Check if model is already loaded
            if self._is_model_loaded(model_name):
                logger.info(f"Model {model_name} is already loaded")
                return True
            
            # Try to pull the model
            logger.info(f"Loading model: {model_name}")
            response = requests.post(
                f"{self.base_url}/api/pull",
                json={"name": model_name, "stream": False},
                timeout=300  # 5 minutes timeout
            )
            
            if response.status_code == 200:
                logger.info(f"Successfully loaded model: {model_name}")
                return True
            else:
                logger.error(f"Failed to load model {model_name}: {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error loading model {model_name}: {e}")
            return False
    
    def _is_model_loaded(self, model_name: str) -> bool:
        """Check if a model is currently loaded in Ollama"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=10)
            if response.status_code == 200:
                models = response.json().get("models", [])
                return any(model.get("name", "").startswith(model_name) for model in models)
        except:
            pass
        return False
    
    def get_loaded_models(self) -> List[str]:
        """Get list of currently loaded models"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=10)
            if response.status_code == 200:
                models = response.json().get("models", [])
                return [model.get("name", "") for model in models]
        except:
            pass
        return []
    
    async def generate_protein_sequence(
        self, 
        prompt: str, 
        model_name: Optional[str] = None,
        max_length: int = 500
    ) -> Dict[str, Any]:
        """Generate protein sequence using specified model"""
        try:
            # Use first available model if none specified
            if not model_name:
                available = [m for m in self.available_models if m["available"]]
                if not available:
                    raise ValueError("No available models found")
                
                # Prefer protein-specific models
                protein_models = [m for m in available if "protein" in m["name"]]
                model_name = (protein_models[0] if protein_models else available[0])["name"]
            
            # Ensure model is loaded
            if not self._is_model_loaded(model_name):
                if not self.load_model(model_name):
                    raise Exception(f"Failed to load model {model_name}")
            
            # Prepare the prompt for protein generation
            formatted_prompt = f"""Generate a realistic protein sequence based on this description:
{prompt}

Requirements:
- Use standard amino acid single-letter codes (ACDEFGHIKLMNPQRSTVWY)
- Length should be between 50-{max_length} amino acids
- Sequence should be biologically plausible
- Include brief functional description

Format your response as:
SEQUENCE: [amino acid sequence]
FUNCTION: [brief description]
STRUCTURE: [key structural features]
"""
            
            # Make request to Ollama
            payload = {
                "model": model_name,
                "prompt": formatted_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "num_predict": max_length * 2  # Allow for description text
                }
            }
            
            response = requests.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=120
            )
            
            if response.status_code == 200:
                result = response.json()
                generated_text = result.get("response", "")
                
                # Parse the response to extract sequence
                sequence = self._extract_sequence_from_response(generated_text)
                
                return {
                    "success": True,
                    "sequence": sequence,
                    "raw_response": generated_text,
                    "model_used": model_name,
                    "metadata": {
                        "prompt_tokens": result.get("prompt_eval_count", 0),
                        "completion_tokens": result.get("eval_count", 0),
                        "total_time": result.get("total_duration", 0)
                    }
                }
            else:
                raise Exception(f"Ollama API error: {response.text}")
                
        except Exception as e:
            logger.error(f"Error generating protein sequence: {e}")
            return {
                "success": False,
                "error": str(e),
                "fallback_sequence": self._get_fallback_sequence(),
                "model_used": "fallback"
            }
    
    def _extract_sequence_from_response(self, response_text: str) -> str:
        """Extract protein sequence from AI response"""
        lines = response_text.split('\n')
        
        # Look for sequence patterns
        for line in lines:
            line = line.strip()
            
            # Check for explicit sequence markers
            if line.startswith("SEQUENCE:"):
                seq = line.replace("SEQUENCE:", "").strip()
                if self._is_valid_protein_sequence(seq):
                    return seq
            
            # Check for lines that look like protein sequences
            if len(line) > 20 and self._is_valid_protein_sequence(line):
                return line
        
        # If no good sequence found, generate a fallback
        return self._get_fallback_sequence()
    
    def _is_valid_protein_sequence(self, sequence: str) -> bool:
        """Check if string is a valid protein sequence"""
        valid_amino_acids = set("ACDEFGHIKLMNPQRSTVWY")
        cleaned_seq = sequence.upper().replace(" ", "").replace("-", "")
        
        if len(cleaned_seq) < 10:  # Too short
            return False
        
        # Check if at least 80% are valid amino acids
        valid_count = sum(1 for char in cleaned_seq if char in valid_amino_acids)
        return (valid_count / len(cleaned_seq)) >= 0.8
    
    def _get_fallback_sequence(self) -> str:
        """Provide a fallback protein sequence if generation fails"""
        return "MKLLVLGLGALTGTVLTMSSQDNFFSLRYKFEDKYLCTKGKLTTRYFRKTWSTLDDFLCASLVRSNDLLLAIHKLHSNFFRCGTDKLLRGKYVQLRNNAAVSPAFGKALTTSKGTFVEAHQKYLQVHHFSDFCLLEHKQSKWMGSDPCVLLLDVCDGLRSFQWKTDVCKTLMSSEDCRKVLSSIVRLMKMKRGKGKDGWWLKLLVHIQDRFYHLLSKGDKKDWTINQGSGTDTIVLTVPSNKLQTVLNRFSLTMSDWLFEEKMPLLLHDTNHDIYVTDVLQACGTYLTHFLVVNFPPRSLQFLNFLKLHRYSRPEYKMAWEDTYSPHVSDRVWATDIQDFGTMRYGYLTNSCSKLLGQRLRNPGEEHQHAIFRQVIGKEGLGAGSAANQMKAHSLGYKAIEHGLKCQGEACSGTYDCDTRETVGSVLEVIESDQSMHLYGLHFLSLSLRLYVDFISSNLFCDRRGNKISAIHKGKSRYKNGKPKVLGRGITLGWTTGQGSKQVSIQHLVRHNEYFPECGGKAFMCGSCTFLQRGLRNLWQANILGSLHTCIARNFAGHKCGLYQEMQPRMPQWDVCRFFQKSTTCALATQRLLMLLRNPEYLTDYYNQPHCLSGFGHTDWCKYRSQKPLLQELQCRQHFAIVRAEDTAPKLPVWGVIGDTGGSQGLLVPKKHSGVGTLSQPSMGGECVFKIQHGCDNDCEAEVIAIFQPQIGAELTQRTTLFHQVEVILQTPVLSRFVYRRPKVDTKATYACIFRCDGQAEVFLGTTQEDRNPGFYFYCDGQYAVYMACLMNEYKFRLAQKDWEQRFDIHFLGIRCSQKKQNGQHYCGPIDPHSQGAPELRKDHQRLDFSQGYDILCLLPGESGHREWVIQLRRLGVTDLVNWLFQVGEGFTVAELFPLHRLAFFRQMCQHLTQACIQQSKQGEFDPQQAIFKHQDSTASQHGDRIQGHLHQAGGCILKVQNLLTKCCAAPDPNSPPFGSQNPYIPGHYSYFGLRKEQRSMCKQGRRFTSQCTKASGDQDFKKLKGQGRCIKGIPVYSVPNYHQASADDSGLKRDQGQRPPRLVNQCSVQRFKNNMTLNQYNQALLIYDFISSNLFCDRRGNKISAIHKGKSRYRNLGSRQGEACSGTYDCDTRETVGSVLEVIESDQSMHLYGLHFLSLSLRLYVDFISS"

# Global instance
ollama_service = OllamaService()
