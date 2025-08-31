#!/bin/bash

# Protein Synthesis Web Application Setup Script

set -e  # Exit on any error

echo "🧬 Setting up Protein Synthesis Web Application..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    echo "Or use a package manager:"
    echo "  Ubuntu/Debian: sudo apt update && sudo apt install nodejs npm"
    echo "  CentOS/RHEL: sudo yum install nodejs npm"
    echo "  macOS: brew install node"
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed${NC}"
    echo "Please install Python 3.9+ from https://python.org/"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node --version) found${NC}"
echo -e "${GREEN}✅ Python $(python3 --version) found${NC}"

# Create Python virtual environment for backend
echo -e "${YELLOW}📦 Setting up Python virtual environment...${NC}"
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo -e "${GREEN}✅ Python virtual environment created${NC}"
else
    echo -e "${YELLOW}⚠️  Python virtual environment already exists${NC}"
fi

# Activate virtual environment and install dependencies
source venv/bin/activate
echo -e "${YELLOW}📦 Installing Python dependencies...${NC}"
pip install --upgrade pip
pip install -r requirements.txt
echo -e "${GREEN}✅ Python dependencies installed${NC}"

# Initialize database
echo -e "${YELLOW}🗄️  Initializing database...${NC}"
python init_db.py
echo -e "${GREEN}✅ Database initialized${NC}"

cd ..

# Install frontend dependencies
echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
cd frontend
npm install
echo -e "${GREEN}✅ Frontend dependencies installed${NC}"

cd ..

# Install root dependencies
echo -e "${YELLOW}📦 Installing root dependencies...${NC}"
npm install

# Create environment files if they don't exist
if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo -e "${GREEN}✅ Backend .env file created${NC}"
fi

if [ ! -f "frontend/.env" ]; then
    cp frontend/.env.example frontend/.env
    echo -e "${GREEN}✅ Frontend .env file created${NC}"
fi

echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo "To start the development servers:"
echo "  npm run dev"
echo ""
echo "To start them separately:"
echo "  Backend: cd backend && source venv/bin/activate && python main.py"
echo "  Frontend: cd frontend && npm run dev"
echo ""
echo "Access the application at:"
echo "  Frontend: http://localhost:5173"
echo "  Backend API: http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"