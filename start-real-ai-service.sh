#!/bin/bash

# Start Real AI Service for Protein Synthesis Web Application
# This script starts the AI service with real models (ProtGPT2, ESM-2)

echo "🚀 Starting Real AI Service..."
echo "================================"

# Check if virtual environment exists
VENV_PATH="/mnt/20265E15265DEC72/study/CODE/projects/webdev/protein viewer/venv"
if [ ! -d "$VENV_PATH" ]; then
    echo "❌ Virtual environment not found at: $VENV_PATH"
    echo "Please create and activate the virtual environment first."
    exit 1
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source "$VENV_PATH/bin/activate"

# Check if we're in the right directory
if [ ! -f "ai-service/main_real.py" ]; then
    echo "❌ Please run this script from the protein-synthesis-app directory"
    exit 1
fi

# Change to AI service directory
cd ai-service

# Check dependencies
echo "🔍 Checking dependencies..."
python -c "import torch, transformers, fastapi, uvicorn; print('✅ All dependencies available')" || {
    echo "❌ Missing dependencies. Installing..."
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
    pip install transformers datasets tokenizers psutil
}

# Display system info
echo ""
echo "💻 System Information:"
echo "   Python: $(python --version)"
echo "   PyTorch: $(python -c 'import torch; print(torch.__version__)')"
echo "   Transformers: $(python -c 'import transformers; print(transformers.__version__)')"
echo "   Device: $(python -c 'import torch; print("CUDA" if torch.cuda.is_available() else "CPU")')"

# Check available memory
echo "   Available Memory: $(free -h | grep '^Mem:' | awk '{print $7}')"

echo ""
echo "🤖 Supported AI Models:"
echo "   • ESM-2 Small (31MB) - Fast protein analysis"
echo "   • ProtGPT2 (3.1GB) - High-quality protein generation"
echo "   • Memory limit: 6GB (safe for your 16GB system)"

echo ""
echo "🌐 Starting FastAPI server on http://localhost:8001"
echo "   Press Ctrl+C to stop the service"
echo ""

# Start the real AI service
python main_real.py