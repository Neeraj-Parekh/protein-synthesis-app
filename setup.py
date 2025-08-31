#!/usr/bin/env python3
"""
Setup script for Protein Synthesis Web Application
"""
import os
import sys
import subprocess
import shutil
from pathlib import Path

def run_command(command, cwd=None, check=True):
    """Run a shell command and return the result"""
    try:
        result = subprocess.run(
            command, 
            shell=True, 
            cwd=cwd, 
            check=check,
            capture_output=True,
            text=True
        )
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.CalledProcessError as e:
        return False, e.stdout, e.stderr

def check_requirements():
    """Check if required tools are installed"""
    print("🔍 Checking requirements...")
    
    # Check Python
    if sys.version_info < (3, 9):
        print("❌ Python 3.9+ is required")
        return False
    print(f"✅ Python {sys.version.split()[0]} found")
    
    # Check Node.js
    success, stdout, stderr = run_command("node --version", check=False)
    if not success:
        print("❌ Node.js is not installed")
        print("Please install Node.js 18+ from https://nodejs.org/")
        return False
    print(f"✅ Node.js {stdout.strip()} found")
    
    # Check npm
    success, stdout, stderr = run_command("npm --version", check=False)
    if not success:
        print("❌ npm is not installed")
        return False
    print(f"✅ npm {stdout.strip()} found")
    
    return True

def setup_backend():
    """Set up the backend Python environment"""
    print("\n📦 Setting up backend...")
    
    backend_dir = Path("backend")
    venv_dir = backend_dir / "venv"
    
    # Create virtual environment
    if not venv_dir.exists():
        print("Creating Python virtual environment...")
        success, stdout, stderr = run_command(
            f"{sys.executable} -m venv venv", 
            cwd=backend_dir
        )
        if not success:
            print(f"❌ Failed to create virtual environment: {stderr}")
            return False
        print("✅ Virtual environment created")
    else:
        print("⚠️  Virtual environment already exists")
    
    # Determine activation script path
    if os.name == 'nt':  # Windows
        activate_script = venv_dir / "Scripts" / "activate"
        pip_path = venv_dir / "Scripts" / "pip"
        python_path = venv_dir / "Scripts" / "python"
    else:  # Unix/Linux/macOS
        activate_script = venv_dir / "bin" / "activate"
        pip_path = venv_dir / "bin" / "pip"
        python_path = venv_dir / "bin" / "python"
    
    # Install Python dependencies
    print("Installing Python dependencies...")
    success, stdout, stderr = run_command(
        f"{pip_path} install --upgrade pip",
        cwd=backend_dir
    )
    if not success:
        print(f"❌ Failed to upgrade pip: {stderr}")
        return False
    
    success, stdout, stderr = run_command(
        f"{pip_path} install -r requirements.txt",
        cwd=backend_dir
    )
    if not success:
        print(f"❌ Failed to install dependencies: {stderr}")
        return False
    print("✅ Python dependencies installed")
    
    # Initialize database
    print("Initializing database...")
    success, stdout, stderr = run_command(
        f"{python_path} init_db.py",
        cwd=backend_dir
    )
    if not success:
        print(f"❌ Failed to initialize database: {stderr}")
        return False
    print("✅ Database initialized")
    
    return True

def setup_frontend():
    """Set up the frontend Node.js environment"""
    print("\n📦 Setting up frontend...")
    
    frontend_dir = Path("frontend")
    
    # Install frontend dependencies
    print("Installing frontend dependencies...")
    success, stdout, stderr = run_command("npm install", cwd=frontend_dir)
    if not success:
        print(f"❌ Failed to install frontend dependencies: {stderr}")
        return False
    print("✅ Frontend dependencies installed")
    
    return True

def setup_root():
    """Set up root package.json dependencies"""
    print("\n📦 Setting up root dependencies...")
    
    success, stdout, stderr = run_command("npm install")
    if not success:
        print(f"❌ Failed to install root dependencies: {stderr}")
        return False
    print("✅ Root dependencies installed")
    
    return True

def setup_environment_files():
    """Create environment files from examples"""
    print("\n⚙️  Setting up environment files...")
    
    # Backend .env
    backend_env = Path("backend/.env")
    backend_env_example = Path("backend/.env.example")
    
    if not backend_env.exists() and backend_env_example.exists():
        shutil.copy(backend_env_example, backend_env)
        print("✅ Backend .env file created")
    
    # Frontend .env
    frontend_env = Path("frontend/.env")
    frontend_env_example = Path("frontend/.env.example")
    
    if not frontend_env.exists() and frontend_env_example.exists():
        shutil.copy(frontend_env_example, frontend_env)
        print("✅ Frontend .env file created")

def main():
    """Main setup function"""
    print("🧬 Setting up Protein Synthesis Web Application...\n")
    
    # Check if we're in the right directory
    if not Path("package.json").exists():
        print("❌ Please run this script from the protein-synthesis-app directory")
        sys.exit(1)
    
    # Check requirements
    if not check_requirements():
        sys.exit(1)
    
    # Set up backend
    if not setup_backend():
        sys.exit(1)
    
    # Set up frontend
    if not setup_frontend():
        sys.exit(1)
    
    # Set up root
    if not setup_root():
        sys.exit(1)
    
    # Set up environment files
    setup_environment_files()
    
    print("\n🎉 Setup complete!")
    print("\nTo start the development servers:")
    print("  npm run dev")
    print("\nTo start them separately:")
    if os.name == 'nt':  # Windows
        print("  Backend: cd backend && venv\\Scripts\\activate && python main.py")
    else:  # Unix/Linux/macOS
        print("  Backend: cd backend && source venv/bin/activate && python main.py")
    print("  Frontend: cd frontend && npm run dev")
    print("\nAccess the application at:")
    print("  Frontend: http://localhost:5173")
    print("  Backend API: http://localhost:8000")
    print("  API Docs: http://localhost:8000/docs")

if __name__ == "__main__":
    main()