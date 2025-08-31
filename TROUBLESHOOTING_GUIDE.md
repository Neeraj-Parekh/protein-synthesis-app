# 🔧 Troubleshooting Guide

## Protein Synthesis Web Application - Common Issues & Solutions

**Last Updated**: 2025-08-07  
**Version**: 2.0.0

---

## 🚨 **Service Worker Errors (Most Common)**

### **Problem**: `sw.js:35 Uncaught (in promise) TypeError: Failed to fetch`

This is the most common issue and occurs when the browser tries to cache resources that don't exist or from a previous version.

#### **Quick Fix:**
```bash
# 1. Run the fix script
./fix-frontend-issues.sh

# 2. Clear browser cache (IMPORTANT!)
# Chrome: Ctrl+Shift+Delete > Clear storage
# Firefox: Ctrl+Shift+Delete
# Or use Incognito/Private mode

# 3. Restart the application
./run-full-stack.sh dev
```

#### **Manual Fix:**
```bash
# Stop all processes
pkill -f "vite"
pkill -f "uvicorn"

# Clear frontend cache
cd frontend
rm -rf node_modules/.vite
rm -rf dist
npm install

# Clear browser cache and restart
```

#### **Browser-Specific Solutions:**

**Chrome:**
1. Open DevTools (F12)
2. Go to Application tab
3. Click "Storage" in left sidebar
4. Click "Clear storage" button
5. Refresh page (Ctrl+F5)

**Firefox:**
1. Press Ctrl+Shift+Delete
2. Select "Everything" in time range
3. Check "Cache" and "Site Data"
4. Click "Clear Now"

**Safari:**
1. Develop menu > Empty Caches
2. Or use Private Browsing mode

---

## 🔌 **Port Conflicts**

### **Problem**: `EADDRINUSE: address already in use :::5173`

#### **Solution:**
```bash
# Find what's using the port
lsof -i :5173  # Frontend
lsof -i :8001  # AI Service

# Kill the process
kill -9 <PID>

# Or use the built-in cleanup
./run-full-stack.sh dev  # Automatically kills conflicting processes
```

---

## 🤖 **AI Service Issues**

### **Problem**: AI models won't load or generate sequences

#### **Memory Issues:**
```bash
# Check available memory
free -h

# Check Python memory usage
python -c "import psutil; print(f'Available RAM: {psutil.virtual_memory().available / 1024**3:.1f}GB')"

# If less than 6GB available, close other applications
```

#### **Model Loading Issues:**
```bash
# Test AI service directly
cd ai-service
source /path/to/venv/bin/activate
python test_real_models.py

# Reinstall dependencies
pip install torch transformers --upgrade
```

#### **Network Issues (Model Downloads):**
```bash
# Test internet connection
curl -I https://huggingface.co

# Manual model download
python -c "from transformers import AutoTokenizer; AutoTokenizer.from_pretrained('facebook/esm2_t6_8M_UR50D')"
```

---

## 📦 **Dependency Issues**

### **Problem**: Module not found or import errors

#### **Frontend Dependencies:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

#### **Python Dependencies:**
```bash
source venv/bin/activate
pip install -r ai-service/requirements.txt --upgrade
```

#### **Virtual Environment Issues:**
```bash
# Recreate virtual environment
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r ai-service/requirements.txt
```

---

## 🌐 **Network & API Issues**

### **Problem**: API calls failing or network errors

#### **Check Services:**
```bash
# Test AI service
curl http://localhost:8001/health

# Test frontend
curl http://localhost:5173
```

#### **Proxy Issues:**
The frontend is configured to proxy API calls to the AI service. If this fails:

```bash
# Check vite.config.ts proxy settings
# Should point to http://localhost:8001
```

---

## 💾 **Memory & Performance Issues**

### **Problem**: Application running slowly or crashing

#### **Memory Optimization:**
```bash
# Check system resources
htop  # or top

# Close unnecessary applications
# Ensure 6GB+ free RAM for AI models
```

#### **Browser Performance:**
- Use Chrome or Firefox (better WebGL support)
- Close other browser tabs
- Disable browser extensions
- Use hardware acceleration

---

## 🔄 **Development Server Issues**

### **Problem**: Hot reload not working or build failures

#### **Vite Issues:**
```bash
cd frontend
rm -rf node_modules/.vite
npm run dev
```

#### **TypeScript Issues:**
```bash
cd frontend
npx tsc --noEmit  # Check for type errors
```

---

## 🐳 **Docker Issues** (If using containers)

### **Problem**: Container startup failures

#### **Docker Solutions:**
```bash
# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check logs
docker-compose logs -f
```

---

## 🔍 **Debugging Steps**

### **Step 1: Check All Services**
```bash
# Health check script
curl http://localhost:5173 && echo "Frontend OK"
curl http://localhost:8001/health && echo "AI Service OK"
```

### **Step 2: Check Logs**
```bash
# Application logs
tail -f logs/ai-service.log
tail -f logs/frontend.log

# Browser console (F12)
# Look for specific error messages
```

### **Step 3: Test Individual Components**
```bash
# Test AI service only
./start-real-ai-service.sh

# Test frontend only
cd frontend && npm run dev
```

---

## 🆘 **Emergency Reset**

### **Complete Application Reset:**
```bash
# Stop everything
pkill -f "vite"
pkill -f "uvicorn"
pkill -f "python.*main"

# Clean everything
rm -rf logs/* pids/*
cd frontend && rm -rf node_modules/.vite dist && cd ..

# Reinstall and restart
./fix-frontend-issues.sh --reinstall
./run-full-stack.sh dev
```

### **Browser Reset:**
1. Clear all browser data for localhost
2. Disable all extensions
3. Try incognito/private mode
4. Try a different browser

---

## 📊 **Performance Monitoring**

### **Check System Resources:**
```bash
# Memory usage
free -h

# CPU usage
htop

# Disk space
df -h

# Network
netstat -tulpn | grep :5173
netstat -tulpn | grep :8001
```

### **Application Metrics:**
```bash
# AI service memory
curl http://localhost:8001/system/memory

# Model status
curl http://localhost:8001/models/status
```

---

## 🔧 **Configuration Issues**

### **Environment Variables:**
```bash
# Check Python path
which python
python --version

# Check Node.js
which node
node --version

# Check virtual environment
echo $VIRTUAL_ENV
```

### **File Permissions:**
```bash
# Make scripts executable
chmod +x run-full-stack.sh
chmod +x start-real-ai-service.sh
chmod +x fix-frontend-issues.sh
```

---

## 📞 **Getting Help**

### **Diagnostic Information to Collect:**
```bash
# System info
uname -a
free -h
df -h

# Application versions
node --version
python --version
pip list | grep -E "(torch|transformers|fastapi)"

# Error logs
tail -n 50 logs/ai-service.log
```

### **Common Error Patterns:**

| Error Message | Likely Cause | Solution |
|---------------|--------------|----------|
| `Failed to fetch` | Service worker cache | Clear browser cache |
| `EADDRINUSE` | Port conflict | Kill conflicting process |
| `Module not found` | Missing dependency | Reinstall dependencies |
| `Out of memory` | Insufficient RAM | Close applications, check memory |
| `Connection refused` | Service not running | Start the service |
| `CORS error` | Proxy misconfiguration | Check vite.config.ts |

---

## ✅ **Prevention Tips**

### **Best Practices:**
1. **Always clear browser cache** when updating
2. **Use incognito mode** for testing
3. **Monitor memory usage** before starting AI models
4. **Keep dependencies updated** regularly
5. **Use the provided scripts** instead of manual commands

### **Development Workflow:**
```bash
# Recommended startup sequence
./fix-frontend-issues.sh      # Clean environment
./run-full-stack.sh dev       # Start everything
# Clear browser cache
# Open http://localhost:5173
```

---

## 🎯 **Quick Reference**

### **Essential Commands:**
```bash
# Fix everything
./fix-frontend-issues.sh

# Start everything
./run-full-stack.sh dev

# Test everything
python test_real_ai_service.py

# Emergency stop
pkill -f "vite|uvicorn|python.*main"
```

### **Essential URLs:**
- **Frontend**: http://localhost:5173
- **AI API**: http://localhost:8001/docs
- **Health Check**: http://localhost:8001/health

---

**Remember: Most issues are resolved by clearing browser cache and restarting the services! 🔄**

---

**Document Version**: 2.0.0  
**Last Updated**: 2025-08-07  
**Status**: Complete ✅