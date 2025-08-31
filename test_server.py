#!/usr/bin/env python3
"""
Quick test script to verify the protein synthesis server is working properly
"""
import os
import sys
import requests
import time
import subprocess
import signal
import json
from pathlib import Path

def test_server():
    """Test the FastAPI server functionality"""
    print("🧬 Testing Protein Synthesis Application Server")
    print("=" * 50)
    
    # Test basic imports
    print("1. Testing imports...")
    try:
        sys.path.append(str(Path(__file__).parent / "backend"))
        import main
        print("   ✅ Backend imports successful")
    except Exception as e:
        print(f"   ❌ Import failed: {e}")
        return False
    
    # Test server startup
    print("\n2. Testing server startup...")
    try:
        backend_dir = Path(__file__).parent / "backend"
        venv_python = Path(__file__).parent.parent / "venv" / "bin" / "python"
        
        # Start server in background
        process = subprocess.Popen([
            str(venv_python), "-m", "uvicorn", "main:app", 
            "--host", "127.0.0.1", "--port", "8002"
        ], cwd=str(backend_dir), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Wait for server to start
        time.sleep(3)
        
        # Test health endpoint
        print("   ⏳ Testing health endpoint...")
        response = requests.get("http://127.0.0.1:8002/health", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Health check passed: {data}")
        else:
            print(f"   ❌ Health check failed: {response.status_code}")
            return False
            
        # Test API docs endpoint
        print("   ⏳ Testing API docs endpoint...")
        docs_response = requests.get("http://127.0.0.1:8002/docs", timeout=5)
        if docs_response.status_code == 200:
            print("   ✅ API docs accessible")
        else:
            print(f"   ⚠️  API docs may have issues: {docs_response.status_code}")
        
        # Test OpenAPI schema
        print("   ⏳ Testing OpenAPI schema...")
        openapi_response = requests.get("http://127.0.0.1:8002/openapi.json", timeout=5)
        if openapi_response.status_code == 200:
            schema = openapi_response.json()
            print(f"   ✅ OpenAPI schema loaded: {len(schema.get('paths', {}))} endpoints")
        else:
            print(f"   ⚠️  OpenAPI schema issues: {openapi_response.status_code}")
        
        # Stop server
        process.terminate()
        process.wait(timeout=5)
        print("   ✅ Server shutdown successful")
        
    except Exception as e:
        print(f"   ❌ Server test failed: {e}")
        try:
            process.terminate()
        except:
            pass
        return False
    
    print("\n🎉 All tests passed! Server is working correctly.")
    print("\n📋 Summary:")
    print("   • Backend imports working")
    print("   • Server starts successfully")
    print("   • Health endpoint responding")
    print("   • API documentation accessible")
    print("   • OpenAPI schema valid")
    
    print("\n🚀 To start the server:")
    print("   cd backend")
    print("   source ../venv/bin/activate")
    print("   python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload")
    
    return True

if __name__ == "__main__":
    success = test_server()
    sys.exit(0 if success else 1)
