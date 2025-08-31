#!/usr/bin/env python3
"""
Test script for the AI service endpoints
"""

import requests
import json
import time
import sys

AI_SERVICE_URL = "http://localhost:8001"

def test_endpoint(endpoint, method="GET", data=None):
    """Test a single endpoint"""
    url = f"{AI_SERVICE_URL}{endpoint}"
    print(f"\n🧪 Testing {method} {endpoint}")
    
    try:
        if method == "GET":
            response = requests.get(url, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=10)
        
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Success")
            if isinstance(result, dict) and len(result) < 5:
                print(f"   Response: {json.dumps(result, indent=2)}")
            else:
                print(f"   Response keys: {list(result.keys()) if isinstance(result, dict) else 'Non-dict response'}")
        else:
            print(f"   ❌ Failed: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print(f"   ❌ Connection failed - is the AI service running?")
        return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    return response.status_code == 200

def main():
    print("🚀 Testing AI Service Endpoints")
    print(f"Service URL: {AI_SERVICE_URL}")
    
    # Test basic endpoints
    tests = [
        ("/health", "GET"),
        ("/models/status", "GET"),
        ("/models/protgpt2/info", "GET"),
        ("/models/protgpt2/benchmark", "GET"),
    ]
    
    # Test POST endpoints
    test_sequence = "MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN"
    
    post_tests = [
        ("/generate", {
            "model_name": "protgpt2",
            "length": 50,
            "temperature": 0.8,
            "num_sequences": 1
        }),
        ("/validate-sequence", test_sequence),
        ("/analyze-properties", test_sequence),
        ("/optimize-sequence", {
            "sequence": test_sequence,
            "target_properties": {
                "molecular_weight": 6000.0,
                "isoelectric_point": 7.0
            }
        }),
        ("/predict-structure", test_sequence),
        ("/compare-sequences", [test_sequence, "ACDEFGHIKLMNPQRSTVWY"]),
        ("/design-protein", {
            "function": "enzyme",
            "length": 100,
            "constraints": {"stability": 0.8}
        }),
        ("/mutate-sequence", {
            "sequence": "ACDEFGHIKLMNPQRSTVWY",
            "mutation_type": "random",
            "num_mutations": 2
        }),
        ("/predict-function", test_sequence),
        ("/analyze-stability", {
            "sequence": test_sequence,
            "temperature": 37.0,
            "ph": 7.0
        }),
        ("/predict-interactions", {
            "sequence": test_sequence,
            "interaction_type": "protein"
        }),
        ("/batch-process", {
            "sequences": [test_sequence[:30], "ACDEFGHIKLMNPQRSTVWY"],
            "operations": ["validate", "analyze_properties"]
        })
    ]
    
    success_count = 0
    total_tests = len(tests) + len(post_tests)
    
    # Test GET endpoints
    for endpoint, method in tests:
        if test_endpoint(endpoint, method):
            success_count += 1
    
    # Test POST endpoints
    for endpoint, data in post_tests:
        if test_endpoint(endpoint, "POST", data):
            success_count += 1
    
    print(f"\n📊 Test Results: {success_count}/{total_tests} passed")
    
    if success_count == total_tests:
        print("🎉 All tests passed! AI service is working correctly.")
        return 0
    else:
        print("⚠️  Some tests failed. Check the AI service.")
        return 1

if __name__ == "__main__":
    sys.exit(main())