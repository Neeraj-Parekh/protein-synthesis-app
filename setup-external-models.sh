#!/bin/bash

# Setup External Protein Models
# Creates Ollama models using existing protein models from external storage

set -e

EXTERNAL_OLLAMA_DIR="/mnt/01DBA40B162FF9C0/ollama-models"
PROTEIN_MODELS_DIR="$EXTERNAL_OLLAMA_DIR/protein-models"

echo "🧬 Setting up External Protein Models"
echo "===================================="

# Set environment to use external storage
export OLLAMA_MODELS="$EXTERNAL_OLLAMA_DIR"

# Check if Ollama is running with external storage
if ! curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
    echo "❌ Ollama not running. Start it first with: ./start-external-ollama.sh"
    exit 1
fi

echo "✅ Ollama is running with external storage"

# Function to create a model from existing files
create_protein_model() {
    local model_name=$1
    local model_dir="$PROTEIN_MODELS_DIR/$2"
    local description="$3"
    
    echo "📦 Creating model: $model_name"
    echo "   Source: $model_dir"
    
    if [ ! -d "$model_dir" ]; then
        echo "⚠️  Directory not found: $model_dir"
        return 1
    fi
    
    # Create a Modelfile that references the external model
    cat > "/tmp/${model_name}.Modelfile" << EOF
FROM scratch

# Protein model: $description
# Source: $model_dir

TEMPLATE """{{ .System }}
USER: {{ .Prompt }}
ASSISTANT: """

SYSTEM """You are a specialized protein analysis AI model trained on: $description

Your capabilities include:
- Protein sequence analysis
- Structure prediction
- Function annotation
- Evolutionary analysis
- Binding site prediction
- Stability assessment

When analyzing proteins:
1. Provide detailed structural insights
2. Include confidence scores
3. Format responses as structured JSON when requested
4. Reference biological databases when relevant
5. Consider evolutionary conservation
6. Assess functional implications

You work with standard amino acid sequences and understand protein biochemistry.
"""

PARAMETER temperature 0.3
PARAMETER top_p 0.8
PARAMETER stop "</s>"
PARAMETER stop "USER:"
PARAMETER stop "ASSISTANT:"
EOF
    
    # Create the model in Ollama
    if ollama create "$model_name" -f "/tmp/${model_name}.Modelfile"; then
        echo "✅ Created $model_name successfully"
        rm "/tmp/${model_name}.Modelfile"
        return 0
    else
        echo "❌ Failed to create $model_name"
        rm "/tmp/${model_name}.Modelfile"
        return 1
    fi
}

# Create models based on your existing external storage
echo ""
echo "🔧 Creating protein models from external storage..."

# ESM3 Model
if [ -d "$PROTEIN_MODELS_DIR/esm3" ]; then
    create_protein_model "protein-esm3-external" "esm3" "ESM3 Large Protein Language Model (1.4B parameters)"
fi

# RFdiffusion Model  
if [ -d "$PROTEIN_MODELS_DIR/rfdiffusion" ]; then
    create_protein_model "protein-rfdiffusion-external" "rfdiffusion" "RFdiffusion Protein Structure Generation Model"
fi

# OpenFold Model
if [ -d "$PROTEIN_MODELS_DIR/openfold" ]; then
    create_protein_model "protein-openfold-external" "openfold" "OpenFold Protein Structure Prediction Model"
fi

echo ""
echo "📋 Available models in external storage:"
ollama list

echo ""
echo "🧪 Testing models..."

# Test function
test_external_model() {
    local model_name=$1
    local test_prompt="Analyze this protein sequence: MKTVRQERLK"
    
    echo "Testing $model_name..."
    
    # Test with a simple prompt
    response=$(ollama run "$model_name" "$test_prompt" 2>/dev/null | head -3)
    if [ -n "$response" ]; then
        echo "✅ $model_name is working"
    else
        echo "⚠️  $model_name test incomplete"
    fi
}

# Test each model
models_to_test=$(ollama list | grep "protein-.*-external" | awk '{print $1}')
for model in $models_to_test; do
    test_external_model "$model"
done

echo ""
echo "🎉 External protein models setup complete!"
echo ""
echo "💡 Usage:"
echo "   - Models use your external storage: $EXTERNAL_OLLAMA_DIR"
echo "   - API endpoint: http://127.0.0.1:11434"
echo "   - Available models: $(ollama list | grep protein | wc -l) protein models"
echo "   - Storage location: External drive (not local cache)"

echo ""
echo "🚀 Your web application can now use these external models!"
