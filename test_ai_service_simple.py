#!/usr/bin/env python3
"""
Simple test script for AI service functionality
"""
import subprocess
import time
import requests
import json
import sys
from pathlib import Path

def test_ai_service_endpoints():
    """Test AI service endpoints directly"""
    print("🧪 Testing AI Service Endpoints...")
    
    base_url = "http://localhost:8001"
    
    # Test health endpoint
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("   ✅ Health endpoint working")
            print(f"      Response: {response.json()}")
        else:
            print(f"   ❌ Health endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Health endpoint error: {e}")
        return False
    
    # Test generation endpoint
    try:
        payload = {
            "model_name": "protgpt2",
            "length": 50,
            "temperature": 0.8,
            "num_sequences": 1
        }
        response = requests.post(f"{base_url}/generate", json=payload, timeout=10)
        if response.status_code == 200:
            result = response.json()
            if "proteins" in result and len(result["proteins"]) > 0:
                protein = result["proteins"][0]
                print("   ✅ Generation endpoint working")
                print(f"      Generated sequence: {protein['sequence'][:30]}...")
                print(f"      Confidence: {protein['confidence']}")
            else:
                print("   ❌ Generation endpoint returned invalid data")
                return False
        else:
            print(f"   ❌ Generation endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Generation endpoint error: {e}")
        return False
    
    # Test validation endpoint
    try:
        test_sequence = "MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKT"
        payload = {"sequence": test_sequence}
        response = requests.post(f"{base_url}/validate-sequence", json=payload, timeout=5)
        if response.status_code == 200:
            result = response.json()
            print("   ✅ Validation endpoint working")
            print(f"      Valid: {result.get('valid', 'N/A')}")
            print(f"      Score: {result.get('score', 'N/A')}")
        else:
            print(f"   ❌ Validation endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Validation endpoint error: {e}")
        return False
    
    # Test properties analysis endpoint
    try:
        payload = {"sequence": test_sequence}
        response = requests.post(f"{base_url}/analyze-properties", json=payload, timeout=5)
        if response.status_code == 200:
            result = response.json()
            print("   ✅ Properties analysis endpoint working")
            print(f"      Molecular weight: {result.get('properties', {}).get('molecular_weight', 'N/A')}")
        else:
            print(f"   ❌ Properties analysis endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Properties analysis endpoint error: {e}")
        return False
    
    return True

def main():
    """Main test function"""
    print("🔬 AI Service Simple Test")
    print("=" * 50)
    
    # Check if AI service is running
    try:
        response = requests.get("http://localhost:8001/health", timeout=2)
        print("✅ AI Service is already running!")
    except:
        print("❌ AI Service is not running. Please start it first with:")
        print("   cd ai-service")
        print("   source /mnt/20265E15265DEC72/study/CODE/projects/webdev/protein\\ viewer/venv/bin/activate")
        print("   python3 main_simple.py")
        return 1
    
    # Run tests
    if test_ai_service_endpoints():
        print("\n🎉 All AI service tests passed!")
        print("   • Core functionality is working")
        print("   • Ready for integration with frontend")
        return 0
    else:
        print("\n❌ Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())