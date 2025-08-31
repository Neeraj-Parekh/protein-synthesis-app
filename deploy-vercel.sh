#!/bin/bash

# Vercel Deployment Script
echo "Setting up Vercel deployment..."

# Create .vercelignore to exclude unnecessary files
cat > .vercelignore << 'EOF'
# Dependencies
node_modules/
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.venv/

# Build outputs (keep dist for deployment)
# dist/
# build/
*.egg-info/

# Environment variables (local only)
.env.local
.env.development.local
.env.test.local

# Database (local only)
*.db
*.sqlite
*.sqlite3

# Logs
logs/
*.log

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# AI Models (too large)
models/
*.pt
*.pth
*.onnx
*.pkl

# Test files
.pytest_cache/
.coverage
htmlcov/

# Documentation
*.md
docs/

# External model storage
/mnt/*/ollama-models/
ollama-models/
external-models/
EOF

echo "Created .vercelignore file"
echo "Vercel configuration is ready!"
echo ""
echo "Next steps:"
echo "1. Go to https://vercel.com and sign up/login with your GitHub account"
echo "2. Import your GitHub repository: https://github.com/Neeraj-Parekh/protein-synthesis-app"
echo "3. Vercel will automatically detect the configuration and deploy"
echo "4. Set up environment variables in Vercel dashboard if needed"
echo ""
echo "For continuous deployment, Vercel will automatically deploy on every push to main branch!"
