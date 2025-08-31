#!/usr/bin/env python3
"""
Application Testing Script for Protein Synthesis Web Application
Tests building, running, and basic functionality
"""

import os
import sys
import subprocess
import time
import requests
from pathlib import Path
import json

class ApplicationTester:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.processes = []
        self.test_results = []

    def log_test(self, test_name: str, success: bool, message: str = ""):
        """Log a test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = f"{status}: {test_name}"
        if message:
            result += f" - {message}"
        
        self.test_results.append((test_name, success, message))
        print(result)
        return success

    def run_command(self, command: str, cwd: str = None, timeout: int = 60) -> tuple:
        """Run a command and return success, stdout, stderr"""
        try:
            if cwd:
                full_cwd = self.project_root / cwd
            else:
                full_cwd = self.project_root
                
            result = subprocess.run(
                command.split(),
                cwd=full_cwd,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            return result.returncode == 0, result.stdout, result.stderr
        except subprocess.TimeoutExpired:
            return False, "", "Command timed out"
        except Exception as e:
            return False, "", str(e)

    def test_frontend_build(self):
        """Test if frontend can be built"""
        print("\n🔨 Testing Frontend Build...")
        
        # Check if node_modules exists
        node_modules = self.project_root / "frontend" / "node_modules"
        if not node_modules.exists():
            return self.log_test("Frontend Dependencies", False, "node_modules not found - run npm install first")
        
        # Try to build
        success, stdout, stderr = self.run_command("npm run build", "frontend", timeout=120)
        
        if success:
            # Check if dist folder was created
            dist_folder = self.project_root / "frontend" / "dist"
            if dist_folder.exists():
                return self.log_test("Frontend Build", True, "Build completed successfully")
            else:
                return self.log_test("Frontend Build", False, "Build succeeded but no dist folder found")
        else:
            return self.log_test("Frontend Build", False, f"Build failed: {stderr}")

    def test_backend_dependencies(self):
        """Test if backend dependencies can be installed"""
        print("\n📦 Testing Backend Dependencies...")
        
        # Check if requirements.txt exists
        requirements = self.project_root / "backend" / "requirements.txt"
        if not requirements.exists():
            return self.log_test("Backend Requirements", False, "requirements.txt not found")
        
        # Try to install in a test environment (dry run)
        success, stdout, stderr = self.run_command("pip install --dry-run -r requirements.txt", "backend")
        
        if success:
            return self.log_test("Backend Dependencies", True, "All dependencies are available")
        else:
            return self.log_test("Backend Dependencies", False, f"Dependency issues: {stderr}")

    def test_ai_service_dependencies(self):
        """Test if AI service dependencies can be installed"""
        print("\n🤖 Testing AI Service Dependencies...")
        
        # Check if requirements.txt exists
        requirements = self.project_root / "ai-service" / "requirements.txt"
        if not requirements.exists():
            return self.log_test("AI Service Requirements", False, "requirements.txt not found")
        
        # Try to install in a test environment (dry run)
        success, stdout, stderr = self.run_command("pip install --dry-run -r requirements.txt", "ai-service")
        
        if success:
            return self.log_test("AI Service Dependencies", True, "All dependencies are available")
        else:
            return self.log_test("AI Service Dependencies", False, f"Dependency issues: {stderr}")

    def test_typescript_compilation(self):
        """Test TypeScript compilation"""
        print("\n📝 Testing TypeScript Compilation...")
        
        # Try to compile TypeScript
        success, stdout, stderr = self.run_command("npx tsc --noEmit", "frontend")
        
        if success:
            return self.log_test("TypeScript Compilation", True, "No type errors found")
        else:
            return self.log_test("TypeScript Compilation", False, f"Type errors: {stderr}")

    def test_linting(self):
        """Test code linting"""
        print("\n🔍 Testing Code Linting...")
        
        # Try to run ESLint
        success, stdout, stderr = self.run_command("npm run lint", "frontend")
        
        if success:
            return self.log_test("Code Linting", True, "No linting errors found")
        else:
            return self.log_test("Code Linting", False, f"Linting errors: {stderr}")

    def test_configuration_files(self):
        """Test configuration files"""
        print("\n⚙️  Testing Configuration Files...")
        
        config_files = [
            ("frontend/vite.config.ts", "Vite Config"),
            ("frontend/tsconfig.json", "TypeScript Config"),
            ("frontend/package.json", "Frontend Package"),
            ("backend/main.py", "Backend Main"),
            ("ai-service/main.py", "AI Service Main"),
            ("docker-compose.yml", "Docker Compose"),
        ]
        
        all_good = True
        for file_path, name in config_files:
            full_path = self.project_root / file_path
            if full_path.exists():
                self.log_test(f"{name} File", True, f"Found at {file_path}")
            else:
                self.log_test(f"{name} File", False, f"Missing: {file_path}")
                all_good = False
        
        return all_good

    def test_import_structure(self):
        """Test import structure in key files"""
        print("\n📥 Testing Import Structure...")
        
        key_files = [
            "frontend/src/main.tsx",
            "frontend/src/App.tsx",
            "frontend/src/types/index.ts",
            "frontend/src/services/api.ts",
        ]
        
        all_good = True
        for file_path in key_files:
            full_path = self.project_root / file_path
            if full_path.exists():
                try:
                    with open(full_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Check for obvious import issues
                    lines = content.split('\n')
                    import_errors = []
                    
                    for i, line in enumerate(lines, 1):
                        if 'import' in line and 'from' in line:
                            # Check for broken relative imports
                            if '../../../' in line:
                                import_errors.append(f"Line {i}: Deep relative import")
                    
                    if import_errors:
                        self.log_test(f"Imports in {file_path}", False, f"Issues: {'; '.join(import_errors)}")
                        all_good = False
                    else:
                        self.log_test(f"Imports in {file_path}", True, "No obvious import issues")
                        
                except Exception as e:
                    self.log_test(f"Imports in {file_path}", False, f"Could not read file: {e}")
                    all_good = False
            else:
                self.log_test(f"Imports in {file_path}", False, "File not found")
                all_good = False
        
        return all_good

    def test_docker_configuration(self):
        """Test Docker configuration"""
        print("\n🐳 Testing Docker Configuration...")
        
        # Check if Docker files exist
        docker_files = [
            "frontend/Dockerfile",
            "backend/Dockerfile", 
            "ai-service/Dockerfile",
            "docker-compose.yml"
        ]
        
        all_good = True
        for docker_file in docker_files:
            full_path = self.project_root / docker_file
            if full_path.exists():
                self.log_test(f"Docker file {docker_file}", True, "Found")
            else:
                self.log_test(f"Docker file {docker_file}", False, "Missing")
                all_good = False
        
        # Test docker-compose syntax if available
        if (self.project_root / "docker-compose.yml").exists():
            success, stdout, stderr = self.run_command("docker-compose config", timeout=30)
            if success:
                self.log_test("Docker Compose Syntax", True, "Valid configuration")
            else:
                self.log_test("Docker Compose Syntax", False, f"Invalid: {stderr}")
                all_good = False
        
        return all_good

    def generate_report(self):
        """Generate test report"""
        print("\n" + "="*60)
        print("📊 APPLICATION TEST SUMMARY")
        print("="*60)
        
        passed = sum(1 for _, success, _ in self.test_results if success)
        total = len(self.test_results)
        
        print(f"\n✅ Tests Passed: {passed}/{total}")
        print(f"❌ Tests Failed: {total - passed}/{total}")
        
        if total - passed > 0:
            print(f"\n❌ Failed Tests:")
            for test_name, success, message in self.test_results:
                if not success:
                    print(f"  • {test_name}: {message}")
        
        success_rate = (passed / total) * 100 if total > 0 else 0
        print(f"\n📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print("🎉 Excellent! The application is ready for development.")
        elif success_rate >= 75:
            print("👍 Good! Minor issues need to be addressed.")
        elif success_rate >= 50:
            print("⚠️  Fair. Several issues need attention.")
        else:
            print("🚨 Poor. Major issues need to be fixed before development.")
        
        return success_rate >= 75

    def run_all_tests(self):
        """Run all tests"""
        print("🧪 Starting Application Testing...")
        print(f"📁 Project root: {self.project_root}")
        
        # Run all tests
        self.test_configuration_files()
        self.test_import_structure()
        self.test_typescript_compilation()
        self.test_linting()
        self.test_frontend_build()
        self.test_backend_dependencies()
        self.test_ai_service_dependencies()
        self.test_docker_configuration()
        
        return self.generate_report()

def main():
    """Main function"""
    if len(sys.argv) > 1:
        project_root = sys.argv[1]
    else:
        project_root = os.getcwd()
    
    tester = ApplicationTester(project_root)
    success = tester.run_all_tests()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()