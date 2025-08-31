#!/bin/bash

# Protein Model Storage Manager
# Keeps total AI model storage under 500MB by managing model lifecycle

set -e

MAX_STORAGE_MB=500
OLLAMA_DIR="$HOME/.ollama/models"
TORCH_CACHE_DIR="$HOME/.cache/torch/hub/checkpoints"

echo "🔍 Protein Model Storage Manager"
echo "================================"

# Function to get directory size in MB
get_size_mb() {
    local dir=$1
    if [ -d "$dir" ]; then
        du -sm "$dir" 2>/dev/null | cut -f1
    else
        echo "0"
    fi
}

# Function to clean old models
clean_storage() {
    echo "🧹 Cleaning storage to stay under ${MAX_STORAGE_MB}MB..."
    
    # Get current sizes
    local ollama_size=$(get_size_mb "$OLLAMA_DIR")
    local torch_size=$(get_size_mb "$TORCH_CACHE_DIR")
    local total_size=$((ollama_size + torch_size))
    
    echo "Current storage usage:"
    echo "  Ollama models: ${ollama_size}MB"
    echo "  PyTorch cache: ${torch_size}MB"
    echo "  Total: ${total_size}MB"
    
    if [ $total_size -gt $MAX_STORAGE_MB ]; then
        echo "⚠️  Storage exceeds ${MAX_STORAGE_MB}MB limit!"
        
        # Remove unused Ollama models (keep only protein models)
        if command -v ollama &> /dev/null; then
            echo "Removing non-protein models from Ollama..."
            ollama list | grep -v "protein-" | grep -v "NAME" | awk '{print $1}' | xargs -r ollama rm
        fi
        
        # Clear excess PyTorch cache (keep only ESM2 model)
        if [ -d "$TORCH_CACHE_DIR" ]; then
            echo "Cleaning PyTorch cache (keeping ESM2)..."
            find "$TORCH_CACHE_DIR" -name "*.pt" ! -name "*esm2*" -delete 2>/dev/null || true
        fi
        
        # Re-check size
        ollama_size=$(get_size_mb "$OLLAMA_DIR")
        torch_size=$(get_size_mb "$TORCH_CACHE_DIR")
        total_size=$((ollama_size + torch_size))
        
        echo "After cleanup:"
        echo "  Ollama models: ${ollama_size}MB"
        echo "  PyTorch cache: ${torch_size}MB"
        echo "  Total: ${total_size}MB"
    else
        echo "✅ Storage usage is within limits"
    fi
}

# Function to setup lean models
setup_lean_models() {
    echo "🚀 Setting up lean protein models..."
    
    # Start Ollama if not running
    if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "Starting Ollama..."
        ollama serve &
        sleep 5
    fi
    
    # Check if models exist
    local has_esm3=$(ollama list | grep -c "protein-esm3" || echo "0")
    local has_rfdiff=$(ollama list | grep -c "protein-rfdiffusion" || echo "0")
    local has_openfold=$(ollama list | grep -c "protein-openfold" || echo "0")
    
    if [ "$has_esm3" -eq "0" ] || [ "$has_rfdiff" -eq "0" ] || [ "$has_openfold" -eq "0" ]; then
        echo "Some protein models are missing. Run setup-ollama-models.sh first."
        return 1
    fi
    
    echo "✅ All protein models are available"
}

# Function to monitor storage
monitor_storage() {
    echo "📊 Storage monitoring enabled"
    
    while true; do
        local ollama_size=$(get_size_mb "$OLLAMA_DIR")
        local torch_size=$(get_size_mb "$TORCH_CACHE_DIR")
        local total_size=$((ollama_size + torch_size))
        
        if [ $total_size -gt $MAX_STORAGE_MB ]; then
            echo "⚠️  [$(date)] Storage limit exceeded: ${total_size}MB > ${MAX_STORAGE_MB}MB"
            clean_storage
        fi
        
        sleep 300  # Check every 5 minutes
    done
}

# Function to get model status
get_status() {
    echo "📊 Protein Model Status"
    echo "====================="
    
    # Storage status
    local ollama_size=$(get_size_mb "$OLLAMA_DIR")
    local torch_size=$(get_size_mb "$TORCH_CACHE_DIR")
    local total_size=$((ollama_size + torch_size))
    
    echo "Storage Usage:"
    echo "  Ollama models: ${ollama_size}MB"
    echo "  PyTorch cache: ${torch_size}MB"
    echo "  Total: ${total_size}MB / ${MAX_STORAGE_MB}MB"
    
    if [ $total_size -le $MAX_STORAGE_MB ]; then
        echo "  Status: ✅ Within limits"
    else
        echo "  Status: ⚠️  Exceeds limit"
    fi
    
    echo ""
    
    # Ollama status
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "Ollama Service: ✅ Running"
        echo "Available Models:"
        ollama list | grep "protein-" || echo "  No protein models found"
    else
        echo "Ollama Service: ❌ Not running"
    fi
    
    echo ""
    
    # PyTorch cache status
    if [ -d "$TORCH_CACHE_DIR" ]; then
        echo "PyTorch Cache:"
        ls -lh "$TORCH_CACHE_DIR"/*.pt 2>/dev/null | grep esm || echo "  No ESM models found"
    else
        echo "PyTorch Cache: Empty"
    fi
}

# Main command handling
case "${1:-status}" in
    "clean")
        clean_storage
        ;;
    "setup")
        setup_lean_models
        ;;
    "monitor")
        monitor_storage
        ;;
    "status")
        get_status
        ;;
    *)
        echo "Usage: $0 {status|clean|setup|monitor}"
        echo ""
        echo "Commands:"
        echo "  status  - Show current storage and model status"
        echo "  clean   - Clean storage to stay under limit"
        echo "  setup   - Verify lean models are setup"
        echo "  monitor - Continuously monitor and clean storage"
        exit 1
        ;;
esac
