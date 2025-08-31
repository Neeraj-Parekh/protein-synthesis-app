#!/bin/bash

# Quick Start Script for External AI Models Integration
# Use this script to start everything quickly next time

set -e

PROJECT_DIR="/mnt/20265E15265DEC72/study/CODE/projects/webdev/protein viewer/protein-synthesis-app"
BACKEND_DIR="$PROJECT_DIR/backend"
VENV_DIR="/mnt/20265E15265DEC72/study/CODE/projects/webdev/protein viewer/venv"

echo "🧬 PROTEIN SYNTHESIS APP - QUICK START"
echo "======================================"

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Step 1: Start External Ollama
echo "🚀 Step 1: Starting External Ollama..."
cd "$PROJECT_DIR"

if curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama already running"
else
    echo "Starting Ollama with external storage..."
    ./start-external-ollama.sh
    sleep 3
    
    if curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
        echo "✅ Ollama started successfully"
    else
        echo "❌ Failed to start Ollama. Check logs: tail -f /tmp/ollama-external.log"
        exit 1
    fi
fi

# Step 2: Start Backend
echo ""
echo "🖥️  Step 2: Starting Backend Server..."
cd "$BACKEND_DIR"

# Choose port
backend_port=8000
if check_port 8000; then
    echo "Port 8000 in use, trying 8001..."
    backend_port=8001
fi

if check_port $backend_port; then
    echo "⚠️  Port $backend_port is in use. Backend may already be running."
    echo "Check: curl http://localhost:$backend_port/health"
else
    echo "Starting backend on port $backend_port..."
    
    # Start backend in background
    source "$VENV_DIR/bin/activate"
    nohup uvicorn main:app --host 0.0.0.0 --port $backend_port --reload > /tmp/backend-$backend_port.log 2>&1 &
    BACKEND_PID=$!
    
    echo "Backend starting with PID: $BACKEND_PID"
    echo "Logs: /tmp/backend-$backend_port.log"
    
    # Wait for backend to start
    echo "Waiting for backend to initialize..."
    sleep 8
    
    if curl -s http://localhost:$backend_port/health > /dev/null 2>&1; then
        echo "✅ Backend started successfully on port $backend_port"
        echo $BACKEND_PID > /tmp/backend-$backend_port.pid
    else
        echo "❌ Failed to start backend. Check logs: tail -f /tmp/backend-$backend_port.log"
        exit 1
    fi
fi

# Step 3: Verify Integration
echo ""
echo "🔍 Step 3: Verifying Integration..."

# Test Ollama models
echo "Testing Ollama models..."
model_count=$(OLLAMA_MODELS="/mnt/01DBA40B162FF9C0/ollama-models" ollama list | grep protein | wc -l)
echo "✅ Found $model_count protein models in Ollama"

# Test backend endpoints
echo "Testing backend endpoints..."
if curl -s http://localhost:$backend_port/large-models/health > /dev/null 2>&1; then
    echo "✅ Large AI models endpoint working"
else
    echo "⚠️  Large AI models endpoint not responding (may need authentication)"
fi

# Step 4: Show Status
echo ""
echo "📊 Step 4: System Status"
cd "$PROJECT_DIR"
./integration-summary.sh

echo ""
echo "🎉 QUICK START COMPLETE!"
echo "======================="
echo "🌐 Backend: http://localhost:$backend_port"
echo "🔗 API Docs: http://localhost:$backend_port/docs"
echo "🧠 Local AI: /ai-models/* (ESM-2, 29MB)"
echo "🔬 External AI: /large-models/* (Ollama models, 9.4GB external)"
echo ""
echo "🛑 To stop:"
echo "   Ollama: kill \$(cat /tmp/ollama-external.pid 2>/dev/null)"
echo "   Backend: kill \$(cat /tmp/backend-$backend_port.pid 2>/dev/null)"
echo ""
echo "📖 Full reference: EXTERNAL_AI_INTEGRATION_REFERENCE.md"
