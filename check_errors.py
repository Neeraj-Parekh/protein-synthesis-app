#!/usr/bin/env python3
"""
Comprehensive error checking script for Protein Synthesis Web Application
Checks for common issues, missing files, and configuration problems
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from typing import List, Dict, Tuple

class ErrorChecker:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.errors = []
        self.warnings = []
        self.fixes_applied = []

    def log_error(self, message: str, file_path: str = None):
        """Log an error"""
        error_msg = f"❌ ERROR: {message}"
        if file_path:
            error_msg += f" (in {file_path})"
        self.errors.append(error_msg)
        print(error_msg)

    def log_warning(self, message: str, file_path: str = None):
        """Log a warning"""
        warning_msg = f"⚠️  WARNING: {message}"
        if file_path:
            warning_msg += f" (in {file_path})"
        self.warnings.append(warning_msg)
        print(warning_msg)

    def log_fix(self, message: str):
        """Log a fix that was applied"""
        fix_msg = f"🔧 FIXED: {message}"
        self.fixes_applied.append(fix_msg)
        print(fix_msg)

    def check_file_exists(self, file_path: str, required: bool = True) -> bool:
        """Check if a file exists"""
        full_path = self.project_root / file_path
        exists = full_path.exists()
        
        if not exists:
            if required:
                self.log_error(f"Required file missing: {file_path}")
            else:
                self.log_warning(f"Optional file missing: {file_path}")
        
        return exists

    def check_directory_exists(self, dir_path: str, required: bool = True) -> bool:
        """Check if a directory exists"""
        full_path = self.project_root / dir_path
        exists = full_path.exists() and full_path.is_dir()
        
        if not exists:
            if required:
                self.log_error(f"Required directory missing: {dir_path}")
            else:
                self.log_warning(f"Optional directory missing: {dir_path}")
        
        return exists

    def check_package_json(self, package_path: str):
        """Check package.json for issues"""
        if not self.check_file_exists(package_path):
            return

        try:
            with open(self.project_root / package_path, 'r') as f:
                package_data = json.load(f)
            
            # Check for required fields
            required_fields = ['name', 'version', 'scripts', 'dependencies']
            for field in required_fields:
                if field not in package_data:
                    self.log_error(f"Missing required field '{field}' in {package_path}")
            
            # Check for common script issues
            scripts = package_data.get('scripts', {})
            if 'dev' not in scripts and 'start' not in scripts:
                self.log_warning(f"No dev or start script found in {package_path}")
            
            print(f"✅ {package_path} is valid")
            
        except json.JSONDecodeError as e:
            self.log_error(f"Invalid JSON in {package_path}: {e}")
        except Exception as e:
            self.log_error(f"Error reading {package_path}: {e}")

    def check_python_requirements(self, requirements_path: str):
        """Check Python requirements.txt for issues"""
        if not self.check_file_exists(requirements_path):
            return

        try:
            with open(self.project_root / requirements_path, 'r') as f:
                lines = f.readlines()
            
            # Check for common issues
            for i, line in enumerate(lines, 1):
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                
                # Check for version pinning
                if '==' not in line and '>=' not in line and '~=' not in line:
                    self.log_warning(f"Unpinned dependency '{line}' in {requirements_path}:{i}")
                
                # Check for known problematic packages
                if line.startswith('sqlite3'):
                    self.log_warning(f"sqlite3 is built into Python, remove from {requirements_path}:{i}")
            
            print(f"✅ {requirements_path} checked")
            
        except Exception as e:
            self.log_error(f"Error reading {requirements_path}: {e}")

    def check_typescript_config(self, tsconfig_path: str):
        """Check TypeScript configuration"""
        if not self.check_file_exists(tsconfig_path):
            return

        try:
            with open(self.project_root / tsconfig_path, 'r') as f:
                # Basic JSON validation
                json.load(f)
            print(f"✅ {tsconfig_path} is valid JSON")
        except json.JSONDecodeError as e:
            self.log_error(f"Invalid JSON in {tsconfig_path}: {e}")
        except Exception as e:
            self.log_error(f"Error reading {tsconfig_path}: {e}")

    def check_import_statements(self, file_path: str):
        """Check for potential import issues in TypeScript/JavaScript files"""
        full_path = self.project_root / file_path
        if not full_path.exists():
            return

        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            lines = content.split('\n')
            for i, line in enumerate(lines, 1):
                line = line.strip()
                
                # Check for relative imports that might be broken
                if 'import' in line and '../' in line:
                    # Count the number of ../ to see if it's excessive
                    if line.count('../') > 3:
                        self.log_warning(f"Deep relative import in {file_path}:{i}")
                
                # Check for missing file extensions in imports
                if 'import' in line and 'from' in line and not line.endswith(("';", '";')):
                    if not any(ext in line for ext in ['.ts', '.tsx', '.js', '.jsx', '.json']):
                        # This might be a library import, which is fine
                        pass
            
        except Exception as e:
            self.log_warning(f"Could not check imports in {file_path}: {e}")

    def check_environment_files(self):
        """Check environment configuration files"""
        env_files = [
            ('frontend/.env.example', True),
            ('frontend/.env', False),
            ('backend/.env.example', True),
            ('backend/.env', False),
            ('ai-service/.env.example', False),
        ]
        
        for env_file, required in env_files:
            self.check_file_exists(env_file, required)

    def check_docker_files(self):
        """Check Docker configuration files"""
        docker_files = [
            'frontend/Dockerfile',
            'backend/Dockerfile',
            'ai-service/Dockerfile',
            'docker-compose.yml',
        ]
        
        for docker_file in docker_files:
            self.check_file_exists(docker_file, required=False)

    def check_project_structure(self):
        """Check overall project structure"""
        print("\n🔍 Checking project structure...")
        
        # Required directories
        required_dirs = [
            'frontend/src',
            'frontend/src/components',
            'frontend/src/types',
            'frontend/src/utils',
            'frontend/src/services',
            'frontend/src/store',
            'backend',
            'backend/models',
            'backend/routers',
            'backend/services',
            'ai-service',
            'ai-service/models',
            'ai-service/services',
        ]
        
        for dir_path in required_dirs:
            self.check_directory_exists(dir_path)

        # Required files
        required_files = [
            'frontend/package.json',
            'frontend/tsconfig.json',
            'frontend/vite.config.ts',
            'frontend/index.html',
            'backend/main.py',
            'backend/requirements.txt',
            'ai-service/main.py',
            'ai-service/requirements.txt',
            'README.md',
        ]
        
        for file_path in required_files:
            self.check_file_exists(file_path)

    def check_dependencies(self):
        """Check dependency configurations"""
        print("\n🔍 Checking dependencies...")
        
        # Check package.json files
        if self.check_file_exists('frontend/package.json'):
            self.check_package_json('frontend/package.json')
        
        # Check requirements.txt files
        if self.check_file_exists('backend/requirements.txt'):
            self.check_python_requirements('backend/requirements.txt')
        
        if self.check_file_exists('ai-service/requirements.txt'):
            self.check_python_requirements('ai-service/requirements.txt')

    def check_configuration_files(self):
        """Check configuration files"""
        print("\n🔍 Checking configuration files...")
        
        # Check TypeScript configs
        if self.check_file_exists('frontend/tsconfig.json'):
            self.check_typescript_config('frontend/tsconfig.json')
        
        # Check environment files
        self.check_environment_files()
        
        # Check Docker files
        self.check_docker_files()

    def check_source_code(self):
        """Check source code for common issues"""
        print("\n🔍 Checking source code...")
        
        # Check key TypeScript files
        ts_files = [
            'frontend/src/main.tsx',
            'frontend/src/App.tsx',
            'frontend/src/types/index.ts',
            'frontend/src/services/api.ts',
        ]
        
        for ts_file in ts_files:
            if self.check_file_exists(ts_file, required=False):
                self.check_import_statements(ts_file)

    def run_npm_check(self):
        """Run npm audit to check for security issues"""
        print("\n🔍 Running npm security audit...")
        
        frontend_path = self.project_root / 'frontend'
        if frontend_path.exists() and (frontend_path / 'package.json').exists():
            try:
                result = subprocess.run(
                    ['npm', 'audit', '--audit-level', 'moderate'],
                    cwd=frontend_path,
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                
                if result.returncode == 0:
                    print("✅ No security vulnerabilities found")
                else:
                    self.log_warning("Security vulnerabilities found in npm packages")
                    print(result.stdout)
                    
            except subprocess.TimeoutExpired:
                self.log_warning("npm audit timed out")
            except FileNotFoundError:
                self.log_warning("npm not found - skipping security audit")
            except Exception as e:
                self.log_warning(f"Error running npm audit: {e}")

    def generate_report(self):
        """Generate a summary report"""
        print("\n" + "="*60)
        print("📊 ERROR CHECK SUMMARY")
        print("="*60)
        
        print(f"\n✅ Fixes Applied: {len(self.fixes_applied)}")
        for fix in self.fixes_applied:
            print(f"  {fix}")
        
        print(f"\n⚠️  Warnings: {len(self.warnings)}")
        for warning in self.warnings:
            print(f"  {warning}")
        
        print(f"\n❌ Errors: {len(self.errors)}")
        for error in self.errors:
            print(f"  {error}")
        
        if len(self.errors) == 0:
            print("\n🎉 No critical errors found! The project structure looks good.")
        else:
            print(f"\n🚨 Found {len(self.errors)} critical errors that need to be fixed.")
        
        print(f"\n📈 Overall Status: {'✅ GOOD' if len(self.errors) == 0 else '❌ NEEDS ATTENTION'}")

    def run_all_checks(self):
        """Run all error checks"""
        print("🔍 Starting comprehensive error check...")
        print(f"📁 Project root: {self.project_root}")
        
        self.check_project_structure()
        self.check_dependencies()
        self.check_configuration_files()
        self.check_source_code()
        self.run_npm_check()
        
        self.generate_report()
        
        return len(self.errors) == 0

def main():
    """Main function"""
    if len(sys.argv) > 1:
        project_root = sys.argv[1]
    else:
        project_root = os.getcwd()
    
    checker = ErrorChecker(project_root)
    success = checker.run_all_checks()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()