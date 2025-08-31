#!/bin/bash

# Ollama External Storage Server
# Runs Ollama using the external storage directory with existing protein models

set -e

EXTERNAL_OLLAMA_DIR="/mnt/01DBA40B162FF9C0/ollama-models"
OLLAMA_HOST="127.0.0.1"
OLLAMA_PORT="11434"

echo "🧬 Starting Ollama with External Storage"
echo "========================================"

# Verify external directory exists
if [ ! -d "$EXTERNAL_OLLAMA_DIR" ]; then
    echo "❌ External Ollama directory not found: $EXTERNAL_OLLAMA_DIR"
    exit 1
fi

echo "📁 Using external storage: $EXTERNAL_OLLAMA_DIR"
echo "🌐 Host: $OLLAMA_HOST:$OLLAMA_PORT"

# Stop any running Ollama instances
echo "🛑 Stopping existing Ollama instances..."
pkill ollama 2>/dev/null || true
sleep 2

# Set environment variables for Ollama
export OLLAMA_MODELS="$EXTERNAL_OLLAMA_DIR"
export OLLAMA_HOST="$OLLAMA_HOST:$OLLAMA_PORT"

# Create necessary directories if they don't exist
mkdir -p "$EXTERNAL_OLLAMA_DIR/manifests"
mkdir -p "$EXTERNAL_OLLAMA_DIR/blobs"

echo "🚀 Starting Ollama server with external storage..."
echo "   Models directory: $OLLAMA_MODELS"
echo "   Host: $OLLAMA_HOST"

# Start Ollama in background
nohup ollama serve > /tmp/ollama-external.log 2>&1 &
OLLAMA_PID=$!

echo "📋 Ollama started with PID: $OLLAMA_PID"
echo "📄 Logs: /tmp/ollama-external.log"

# Wait for Ollama to start
echo "⏳ Waiting for Ollama to initialize..."
sleep 5

# Check if Ollama is running
if curl -s http://$OLLAMA_HOST:$OLLAMA_PORT/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama is running successfully!"
    
    # List available models
    echo ""
    echo "📦 Available models:"
    curl -s http://$OLLAMA_HOST:$OLLAMA_PORT/api/tags | jq -r '.models[]?.name // "No models found"' 2>/dev/null || echo "No models detected"
    
else
    echo "❌ Failed to start Ollama"
    echo "📄 Check logs: tail -f /tmp/ollama-external.log"
    exit 1
fi

echo ""
echo "🔧 To use this Ollama instance:"
echo "   - API URL: http://$OLLAMA_HOST:$OLLAMA_PORT"
echo "   - Models path: $EXTERNAL_OLLAMA_DIR"
echo "   - Stop: kill $OLLAMA_PID"
echo "   - Logs: tail -f /tmp/ollama-external.log"

# Save PID for later management
echo $OLLAMA_PID > /tmp/ollama-external.pid
echo "💾 PID saved to /tmp/ollama-external.pid"
