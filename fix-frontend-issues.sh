#!/bin/bash

# Fix Frontend Issues Script
# Resolves service worker errors and development server issues

echo "🔧 Fixing Frontend Issues..."
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Please run this script from the protein-synthesis-app directory${NC}"
    exit 1
fi

echo -e "${BLUE}🧹 Cleaning up development environment...${NC}"

# Stop any running development servers
echo -e "${YELLOW}   Stopping existing servers...${NC}"
pkill -f "vite" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "node.*vite" 2>/dev/null || true

# Clear Node.js cache
echo -e "${YELLOW}   Clearing Node.js cache...${NC}"
cd frontend
rm -rf node_modules/.vite 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf dist 2>/dev/null || true

# Reinstall dependencies if needed
if [ ! -d "node_modules" ] || [ "$1" = "--reinstall" ]; then
    echo -e "${YELLOW}   Reinstalling dependencies...${NC}"
    rm -rf node_modules package-lock.json 2>/dev/null || true
    npm install
fi

# Clear browser cache instructions
echo -e "${BLUE}🌐 Browser Cache Instructions:${NC}"
echo -e "${YELLOW}   Please clear your browser cache:${NC}"
echo -e "${YELLOW}   • Chrome: Ctrl+Shift+Delete or F12 > Application > Storage > Clear storage${NC}"
echo -e "${YELLOW}   • Firefox: Ctrl+Shift+Delete${NC}"
echo -e "${YELLOW}   • Or use Incognito/Private mode${NC}"

# Update package.json scripts if needed
echo -e "${BLUE}📦 Checking package.json scripts...${NC}"
if ! grep -q "preview" package.json; then
    echo -e "${YELLOW}   Adding preview script...${NC}"
    npm pkg set scripts.preview="vite preview"
fi

cd ..

echo -e "${GREEN}✅ Frontend fixes applied!${NC}"
echo ""
echo -e "${BLUE}🚀 Next steps:${NC}"
echo -e "${GREEN}   1. Clear your browser cache (important!)${NC}"
echo -e "${GREEN}   2. Start the application:${NC}"
echo -e "${GREEN}      ./run-full-stack.sh dev${NC}"
echo -e "${GREEN}   3. Open http://localhost:5173 in a fresh browser tab${NC}"
echo ""
echo -e "${YELLOW}💡 If you still see errors:${NC}"
echo -e "${YELLOW}   • Use Incognito/Private browsing mode${NC}"
echo -e "${YELLOW}   • Try a different browser${NC}"
echo -e "${YELLOW}   • Run: ./fix-frontend-issues.sh --reinstall${NC}"