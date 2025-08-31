#!/bin/bash

# Start the AI service for protein synthesis application

echo "🚀 Starting Protein Synthesis AI Service..."

# Change to AI service directory
cd ai-service

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run setup first."
    exit 1
fi

# Activate virtual environment and start service
echo "📡 Starting AI service on http://localhost:8001"
source venv/bin/activate
python3 main_simple.py