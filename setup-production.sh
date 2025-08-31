#!/bin/bash
# Production Setup Script for Protein Synthesis Web Application
# This script sets up the production environment with PostgreSQL

set -e

echo "🚀 Setting up Protein Synthesis Web Application (Production)"
echo "=========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    print_success "Docker and Docker Compose are installed"
}

# Create environment files
create_env_files() {
    print_status "Creating environment configuration files..."

    # Backend .env file
    if [ ! -f "backend/.env" ]; then
        cat > backend/.env << EOF
# Production Environment Configuration
DB_TYPE=postgresql
DB_HOST=postgres
DB_PORT=5432
DB_NAME=protein_synthesis
DB_USER=postgres
DB_PASSWORD=postgres_password

SECRET_KEY=$(openssl rand -hex 32)
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=noreply@proteinsynth.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@proteinsynth.com

REDIS_URL=redis://redis:6379/0
AI_SERVICE_URL=http://ai-service:8001

DEBUG=False
LOG_LEVEL=INFO
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=100

API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
EOF
        print_success "Created backend/.env"
    else
        print_warning "backend/.env already exists, skipping..."
    fi

    # AI Service .env file
    if [ ! -f "ai-service/.env" ]; then
        cat > ai-service/.env << EOF
MODEL_PATH=/app/models
CACHE_SIZE=1000
MAX_MEMORY_GB=4
LOG_LEVEL=INFO
EOF
        print_success "Created ai-service/.env"
    fi
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."

    mkdir -p backend/uploads
    mkdir -p backend/logs
    mkdir -p ai-service/models
    mkdir -p ai-service/logs
    mkdir -p ai-service/cache
    mkdir -p nginx/ssl

    print_success "Directories created"
}

# Initialize database
init_database() {
    print_status "Initializing database..."

    # Start only PostgreSQL and Redis
    docker-compose up -d postgres redis

    # Wait for PostgreSQL to be ready
    print_status "Waiting for PostgreSQL to be ready..."
    sleep 10

    # Run database migrations
    print_status "Running database migrations..."
    cd backend

    # Initialize Alembic if not already done
    if [ ! -d "alembic" ]; then
        python migrate_db.py init
    fi

    # Create and run migrations
    python migrate_db.py migrate
    python migrate_db.py upgrade

    cd ..
    print_success "Database initialized"
}

# Build and start services
start_services() {
    print_status "Building and starting all services..."

    # Build all services
    docker-compose build

    # Start all services
    docker-compose up -d

    print_success "All services started"
}

# Show status
show_status() {
    print_status "Checking service status..."
    docker-compose ps

    echo ""
    print_success "Setup completed successfully!"
    echo ""
    echo "🌐 Frontend: http://localhost:3000"
    echo "🔧 Backend API: http://localhost:8000"
    echo "🤖 AI Service: http://localhost:8001"
    echo "🐘 PostgreSQL: localhost:5432"
    echo "📊 Redis: localhost:6379"
    echo ""
    echo "📚 API Documentation: http://localhost:8000/docs"
    echo ""
    print_warning "Remember to:"
    echo "  1. Update the SECRET_KEY in backend/.env for production"
    echo "  2. Configure email settings for user verification"
    echo "  3. Set up SSL certificates for HTTPS"
    echo "  4. Configure proper CORS origins for your domain"
}

# Main setup function
main() {
    echo "Setting up Protein Synthesis Web Application for production..."
    echo ""

    check_docker
    create_env_files
    create_directories
    init_database
    start_services
    show_status

    echo ""
    print_success "🎉 Production setup completed!"
    echo "Your application is now running with PostgreSQL database."
}

# Handle command line arguments
case "${1:-}" in
    "init")
        check_docker
        create_env_files
        create_directories
        print_success "Environment initialized. Run './setup-production.sh start' to start services."
        ;;
    "db")
        init_database
        ;;
    "start")
        start_services
        show_status
        ;;
    "stop")
        print_status "Stopping all services..."
        docker-compose down
        print_success "Services stopped"
        ;;
    "restart")
        print_status "Restarting all services..."
        docker-compose restart
        print_success "Services restarted"
        ;;
    "logs")
        docker-compose logs -f "${2:-}"
        ;;
    "clean")
        print_warning "This will remove all containers, volumes, and data!"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose down -v --remove-orphans
            print_success "Cleanup completed"
        fi
        ;;
    *)
        main
        ;;
esac
