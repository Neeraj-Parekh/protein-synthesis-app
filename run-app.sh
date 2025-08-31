#!/bin/bash

echo "🧬 Starting Protein Synthesis Web Application"
echo "============================================="

# Check if we're in the right directory
if [ ! -d "frontend" ]; then
    echo "❌ Error: Please run this script from the protein-synthesis-app directory"
    exit 1
fi

# Start the frontend development server
echo "🚀 Starting frontend development server..."
cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🌐 Starting development server at http://localhost:5173"
echo "📝 The application includes:"
echo "   • Sample protein data for visualization"
echo "   • Mock AI generation (no backend required)"
echo "   • Three.js protein viewer"
echo "   • Analysis tools with dummy data"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev