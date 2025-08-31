#!/usr/bin/env python3
"""
Test script to verify the setup is working correctly
"""
import sys
import os
from pathlib import Path
import subprocess

def test_python_environment():
    """Test Python virtual environment and dependencies"""
    print("🐍 Testing Python environment...")
    
    backend_dir = Path("backend")
    venv_dir = backend_dir / "venv"
    
    if not venv_dir.exists():
        print("❌ Virtual environment not found")
        return False
    
    # Test if we can import key dependencies
    if os.name == 'nt':  # Windows
        python_path = venv_dir / "Scripts" / "python"
    else:  # Unix/Linux/macOS
        python_path = venv_dir / "bin" / "python"
    
    test_imports = [
        "fastapi",
        "uvicorn",
        "sqlalchemy",
        "pydantic",
        "numpy",
        "torch",
        "onnxruntime"
    ]
    
    for module in test_imports:
        try:
            result = subprocess.run(
                [str(python_path), "-c", f"import {module}; print(f'{module} OK')"],
                capture_output=True,
                text=True,
                check=True
            )
            print(f"  ✅ {module}")
        except subprocess.CalledProcessError:
            print(f"  ❌ {module} - import failed")
            return False
    
    return True

def test_database():
    """Test database initialization"""
    print("\n🗄️  Testing database...")
    
    db_file = Path("backend/protein_synthesis.db")
    if not db_file.exists():
        print("❌ Database file not found")
        return False
    
    print("  ✅ Database file exists")
    return True

def test_frontend_dependencies():
    """Test frontend dependencies"""
    print("\n⚛️  Testing frontend dependencies...")
    
    frontend_dir = Path("frontend")
    node_modules = frontend_dir / "node_modules"
    
    if not node_modules.exists():
        print("❌ Frontend node_modules not found")
        return False
    
    # Check for key dependencies
    key_deps = [
        "react",
        "three",
        "ngl",
        "@mui/material",
        "@reduxjs/toolkit"
    ]
    
    for dep in key_deps:
        dep_path = node_modules / dep
        if dep_path.exists():
            print(f"  ✅ {dep}")
        else:
            print(f"  ❌ {dep} - not found")
            return False
    
    return True

def test_configuration_files():
    """Test configuration files"""
    print("\n⚙️  Testing configuration files...")
    
    config_files = [
        "backend/.env",
        "frontend/.env",
        "backend/requirements.txt",
        "frontend/package.json",
        "package.json"
    ]
    
    for config_file in config_files:
        file_path = Path(config_file)
        if file_path.exists():
            print(f"  ✅ {config_file}")
        else:
            print(f"  ❌ {config_file} - not found")
            return False
    
    return True

def main():
    """Run all tests"""
    print("🧪 Testing Protein Synthesis Web Application Setup\n")
    
    # Check if we're in the right directory
    if not Path("package.json").exists():
        print("❌ Please run this script from the protein-synthesis-app directory")
        sys.exit(1)
    
    tests = [
        test_configuration_files,
        test_python_environment,
        test_database,
        test_frontend_dependencies
    ]
    
    all_passed = True
    for test in tests:
        if not test():
            all_passed = False
    
    print("\n" + "="*50)
    if all_passed:
        print("🎉 All tests passed! Setup is working correctly.")
        print("\nYou can now start the development servers with:")
        print("  npm run dev")
    else:
        print("❌ Some tests failed. Please check the setup.")
        print("\nTry running the setup script again:")
        print("  python setup.py")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())