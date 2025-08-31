#!/usr/bin/env python3
"""
Protein Model Downloader
Downloads various open-source protein models to the specified directory
"""
import os
import sys
import subprocess
import urllib.request
import zipfile
import tarfile
import shutil
from pathlib import Path
import json

# Configuration
MODELS_DIR = Path("/mnt/01DBA40B162FF9C0/ollama-models")
PROTEIN_MODELS_DIR = MODELS_DIR / "protein-models"

def create_directories():
    """Create necessary directories"""
    PROTEIN_MODELS_DIR.mkdir(exist_ok=True)
    print(f"📁 Created models directory: {PROTEIN_MODELS_DIR}")

def download_file(url, destination, description=""):
    """Download a file with progress indication"""
    print(f"⬇️  Downloading {description}...")
    print(f"   URL: {url}")
    print(f"   Destination: {destination}")
    
    try:
        urllib.request.urlretrieve(url, destination)
        print(f"   ✅ Downloaded successfully")
        return True
    except Exception as e:
        print(f"   ❌ Download failed: {e}")
        return False

def clone_git_repo(url, destination, description=""):
    """Clone a git repository"""
    print(f"📦 Cloning {description}...")
    print(f"   URL: {url}")
    print(f"   Destination: {destination}")
    
    try:
        if destination.exists():
            print(f"   ⚠️  Directory already exists, skipping...")
            return True
            
        subprocess.run([
            "git", "clone", url, str(destination)
        ], check=True, capture_output=True)
        print(f"   ✅ Cloned successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"   ❌ Clone failed: {e}")
        return False

def download_esm3_model():
    """Download ESM3 model from EvolutionaryScale"""
    print("\n🧬 Downloading ESM3 - EvolutionaryScale's Flagship Model")
    print("=" * 60)
    
    esm_dir = PROTEIN_MODELS_DIR / "esm3"
    
    # Clone the ESM repository
    if clone_git_repo(
        "https://github.com/evolutionaryscale/esm.git",
        esm_dir,
        "ESM3 Model Repository"
    ):
        # Create a setup script for ESM3
        setup_script = esm_dir / "setup_esm3.py"
        setup_content = '''#!/usr/bin/env python3
"""
ESM3 Model Setup Script
"""
import torch
from esm.models.esm3 import ESM3
from esm.tokenization import get_model_tokenizers

def download_esm3_model():
    """Download and cache ESM3 model"""
    print("Downloading ESM3-open model (1.4B parameters)...")
    
    # This will download the model on first use
    model = ESM3.from_pretrained("esm3_sm_open_v1")
    tokenizers = get_model_tokenizers(model)
    
    print("ESM3 model downloaded and cached successfully!")
    return model, tokenizers

if __name__ == "__main__":
    model, tokenizers = download_esm3_model()
    print(f"Model device: {next(model.parameters()).device}")
    print(f"Model parameters: {sum(p.numel() for p in model.parameters()):,}")
'''
        with open(setup_script, 'w') as f:
            f.write(setup_content)
        setup_script.chmod(0o755)
        
        print(f"   📝 Created setup script: {setup_script}")
        return True
    return False

def download_rfdiffusion():
    """Download RFdiffusion model"""
    print("\n🔬 Downloading RFdiffusion - Institute for Protein Design")
    print("=" * 60)
    
    rf_dir = PROTEIN_MODELS_DIR / "rfdiffusion"
    
    if clone_git_repo(
        "https://github.com/RosettaCommons/RFdiffusion.git",
        rf_dir,
        "RFdiffusion Repository"
    ):
        # Create installation script
        install_script = rf_dir / "install_rfdiffusion.sh"
        install_content = '''#!/bin/bash
echo "Installing RFdiffusion dependencies..."

# Create conda environment
conda create -n rfdiffusion python=3.9 -y
conda activate rfdiffusion

# Install PyTorch
conda install pytorch torchvision torchaudio pytorch-cuda=11.8 -c pytorch -c nvidia -y

# Install other dependencies
pip install -r requirements.txt

# Download model weights
mkdir -p models
cd models

echo "Downloading RFdiffusion model weights..."
wget -q https://files.ipd.uw.edu/pub/RFdiffusion/6f5902ac237024bdd0c176cb93063dc4/Base_ckpt.pt
wget -q https://files.ipd.uw.edu/pub/RFdiffusion/e29311f6f1bf1af907f9ef9f44b8328b/Complex_base_ckpt.pt

echo "RFdiffusion setup complete!"
'''
        with open(install_script, 'w') as f:
            f.write(install_content)
        install_script.chmod(0o755)
        
        print(f"   📝 Created installation script: {install_script}")
        return True
    return False

def download_openfold():
    """Download OpenFold model"""
    print("\n🧪 Downloading OpenFold - Open Source AlphaFold2 Implementation")
    print("=" * 60)
    
    openfold_dir = PROTEIN_MODELS_DIR / "openfold"
    
    if clone_git_repo(
        "https://github.com/aqlaboratory/openfold.git",
        openfold_dir,
        "OpenFold Repository"
    ):
        # Create setup script
        setup_script = openfold_dir / "setup_openfold.sh"
        setup_content = '''#!/bin/bash
echo "Setting up OpenFold..."

# Install dependencies
pip install -r requirements.txt

# Download pre-trained weights
mkdir -p weights
cd weights

echo "Downloading OpenFold model weights..."
wget -q https://helixon.s3.amazonaws.com/openfold_params/finetuning_ptm_2.pt
wget -q https://helixon.s3.amazonaws.com/openfold_params/finetuning_no_ptm_2.pt

echo "OpenFold setup complete!"
'''
        with open(setup_script, 'w') as f:
            f.write(setup_content)
        setup_script.chmod(0o755)
        
        print(f"   📝 Created setup script: {setup_script}")
        return True
    return False

def download_additional_tools():
    """Download additional protein analysis tools"""
    print("\n🛠️  Downloading Additional Protein Tools")
    print("=" * 60)
    
    tools_dir = PROTEIN_MODELS_DIR / "tools"
    tools_dir.mkdir(exist_ok=True)
    
    # Download PyMOLfold plugin
    pymolfold_dir = tools_dir / "pymolfold"
    if clone_git_repo(
        "https://github.com/JinyuanSun/PyMOLfold.git",
        pymolfold_dir,
        "PyMOLfold Plugin"
    ):
        print("   ✅ PyMOLfold downloaded")
    
    # Download PoseX benchmarking platform
    posex_dir = tools_dir / "posex"
    if clone_git_repo(
        "https://github.com/CataAI/PoseX.git",
        posex_dir,
        "PoseX Benchmarking Platform"
    ):
        print("   ✅ PoseX downloaded")
    
    return True

def create_model_registry():
    """Create a registry of downloaded models"""
    registry = {
        "protein_models": {
            "esm3": {
                "name": "ESM3 - EvolutionaryScale",
                "description": "Multimodal protein generation (1.4B parameters)",
                "path": str(PROTEIN_MODELS_DIR / "esm3"),
                "setup_script": str(PROTEIN_MODELS_DIR / "esm3" / "setup_esm3.py"),
                "capabilities": [
                    "Protein sequence generation",
                    "Structure prediction", 
                    "Function annotation",
                    "Iterative sampling"
                ]
            },
            "rfdiffusion": {
                "name": "RFdiffusion - Institute for Protein Design",
                "description": "Novel protein generation in seconds",
                "path": str(PROTEIN_MODELS_DIR / "rfdiffusion"),
                "setup_script": str(PROTEIN_MODELS_DIR / "rfdiffusion" / "install_rfdiffusion.sh"),
                "capabilities": [
                    "Novel protein generation",
                    "Protein binders design",
                    "Symmetric oligomers",
                    "Enzyme active sites"
                ]
            },
            "openfold": {
                "name": "OpenFold - Open Source AlphaFold2",
                "description": "Trainable AlphaFold2 implementation",
                "path": str(PROTEIN_MODELS_DIR / "openfold"),
                "setup_script": str(PROTEIN_MODELS_DIR / "openfold" / "setup_openfold.sh"),
                "capabilities": [
                    "Protein structure prediction",
                    "Training on custom datasets",
                    "Enhanced generalization"
                ]
            }
        },
        "tools": {
            "pymolfold": {
                "name": "PyMOLfold Plugin",
                "description": "PyMOL integration for AI models",
                "path": str(PROTEIN_MODELS_DIR / "tools" / "pymolfold")
            },
            "posex": {
                "name": "PoseX Benchmarking",
                "description": "Protein-ligand docking benchmark",
                "path": str(PROTEIN_MODELS_DIR / "tools" / "posex")
            }
        }
    }
    
    registry_file = PROTEIN_MODELS_DIR / "model_registry.json"
    with open(registry_file, 'w') as f:
        json.dump(registry, f, indent=2)
    
    print(f"📋 Created model registry: {registry_file}")
    return registry

def create_usage_guide():
    """Create a comprehensive usage guide"""
    guide_content = '''# Protein Models Usage Guide

## Available Models

### 1. ESM3 - EvolutionaryScale's Flagship Model
- **Location**: `protein-models/esm3/`
- **Setup**: Run `python setup_esm3.py`
- **Capabilities**:
  - Multimodal protein generation
  - Sequence, structure, and function modeling
  - Iterative sampling for complete proteins

```python
from esm.models.esm3 import ESM3
model = ESM3.from_pretrained("esm3_sm_open_v1")
```

### 2. RFdiffusion - Institute for Protein Design
- **Location**: `protein-models/rfdiffusion/`
- **Setup**: Run `bash install_rfdiffusion.sh`
- **Capabilities**:
  - Novel protein generation in seconds
  - Protein binders design
  - Symmetric oligomers

### 3. OpenFold - Open Source AlphaFold2
- **Location**: `protein-models/openfold/`
- **Setup**: Run `bash setup_openfold.sh`
- **Capabilities**:
  - Protein structure prediction
  - Trainable on custom datasets

## Additional Tools

### PyMOLfold Plugin
- **Location**: `protein-models/tools/pymolfold/`
- Integration with PyMOL for structure visualization

### PoseX Benchmarking
- **Location**: `protein-models/tools/posex/`
- Protein-ligand docking benchmark platform

## Getting Started

1. Navigate to the model directory
2. Run the setup script for your chosen model
3. Follow the model-specific documentation
4. Integrate with your protein synthesis application

## Integration with Protein Synthesis App

To integrate these models with your protein synthesis application:

```python
# Add to your AI service
from protein_models.esm3.esm import ESM3
from protein_models.rfdiffusion.rfdiffusion import RFdiffusion

class EnhancedAIService:
    def __init__(self):
        self.esm3_model = ESM3.from_pretrained("esm3_sm_open_v1")
        self.rf_model = RFdiffusion.load_model()
    
    def generate_protein(self, prompt):
        # Use ESM3 for generation
        return self.esm3_model.generate(prompt)
    
    def predict_structure(self, sequence):
        # Use RFdiffusion for structure
        return self.rf_model.predict(sequence)
```
'''
    
    guide_file = PROTEIN_MODELS_DIR / "README.md"
    with open(guide_file, 'w') as f:
        f.write(guide_content)
    
    print(f"📖 Created usage guide: {guide_file}")

def main():
    """Main download function"""
    print("🧬 Protein Models Downloader")
    print("=" * 50)
    print(f"📁 Target directory: {MODELS_DIR}")
    print(f"🎯 Protein models will be saved to: {PROTEIN_MODELS_DIR}")
    
    # Create directories
    create_directories()
    
    # Download models
    success_count = 0
    total_models = 3
    
    if download_esm3_model():
        success_count += 1
    
    if download_rfdiffusion():
        success_count += 1
        
    if download_openfold():
        success_count += 1
    
    # Download additional tools
    download_additional_tools()
    
    # Create documentation
    registry = create_model_registry()
    create_usage_guide()
    
    # Summary
    print(f"\n🎉 Download Summary")
    print("=" * 50)
    print(f"✅ Successfully downloaded: {success_count}/{total_models} models")
    print(f"📁 Models location: {PROTEIN_MODELS_DIR}")
    print(f"📋 Registry created: {PROTEIN_MODELS_DIR / 'model_registry.json'}")
    print(f"📖 Usage guide: {PROTEIN_MODELS_DIR / 'README.md'}")
    
    print(f"\n🚀 Next Steps:")
    print("1. Navigate to individual model directories")
    print("2. Run the setup scripts for models you want to use")
    print("3. Follow the README.md for integration instructions")
    print("4. Check model_registry.json for complete model information")

if __name__ == "__main__":
    main()
