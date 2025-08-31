# Deployment Guide - Protein Synthesis Web Application

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Development Deployment](#development-deployment)
3. [Production Deployment](#production-deployment)
4. [Docker Deployment](#docker-deployment)
5. [Cloud Deployment](#cloud-deployment)
6. [Environment Configuration](#environment-configuration)
7. [Database Setup](#database-setup)
8. [AI Models Setup](#ai-models-setup)
9. [Monitoring and Logging](#monitoring-and-logging)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- **CPU**: Multi-core processor (i5-12450H or equivalent)
- **RAM**: 16GB minimum (8GB for application, 4GB for AI models, 4GB for system)
- **Storage**: 10GB free space (5GB for models, 5GB for data)
- **OS**: Linux (Ubuntu 20.04+), macOS (10.15+), or Windows 10+

### Software Dependencies
- **Node.js**: 18.0+ with npm
- **Python**: 3.9+ with pip
- **Git**: Latest version
- **SQLite**: 3.35+ (for development)
- **PostgreSQL**: 13+ (for production)
- **Redis**: 6.0+ (for caching)
- **Docker**: 20.10+ (optional)

### Hardware Optimization
```bash
# Check system resources
free -h                    # Check available RAM
df -h                     # Check disk space
nproc                     # Check CPU cores
lscpu | grep "Model name" # Check CPU model
```

## Development Deployment

### Quick Start
```bash
# Clone repository
git clone <repository-url>
cd protein-synthesis-app

# Make setup script executable
chmod +x setup.sh

# Run automated setup
./setup.sh

# Start development servers
npm run dev:all
```

### Manual Setup
```bash
# Install frontend dependencies
cd frontend
npm install
npm run build

# Install backend dependencies
cd ../backend
npm install

# Install AI service dependencies
cd ../ai-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Initialize database
cd ../backend
python init_db.py

# Start services individually
# Terminal 1: Frontend
cd frontend && npm start

# Terminal 2: Backend
cd backend && npm run dev

# Terminal 3: AI Service
cd ai-service && python -m uvicorn main:app --reload --port 8001
```

### Development Environment Variables
Create `.env` files in each service directory:

**Frontend (.env)**
```bash
REACT_APP_API_URL=http://localhost:8000
REACT_APP_AI_SERVICE_URL=http://localhost:8001
REACT_APP_ENVIRONMENT=development
REACT_APP_LOG_LEVEL=debug
```

**Backend (.env)**
```bash
NODE_ENV=development
PORT=8000
DATABASE_URL=sqlite:./data/proteins.db
REDIS_URL=redis://localhost:6379
AI_SERVICE_URL=http://localhost:8001
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=debug
```

**AI Service (.env)**
```bash
ENVIRONMENT=development
PORT=8001
MODEL_PATH=./models
CACHE_SIZE=1000
MAX_MEMORY_GB=4
LOG_LEVEL=debug
```

## Production Deployment

### Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python
sudo apt install python3.9 python3.9-venv python3-pip -y

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Redis
sudo apt install redis-server -y

# Install Nginx
sudo apt install nginx -y

# Install PM2 for process management
sudo npm install -g pm2
```

### Application Deployment
```bash
# Clone and build application
git clone <repository-url> /opt/protein-synthesis-app
cd /opt/protein-synthesis-app

# Build frontend
cd frontend
npm ci --production
npm run build

# Setup backend
cd ../backend
npm ci --production
npm run build

# Setup AI service
cd ../ai-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements-prod.txt

# Download AI models
python download_models.py
```

### Database Setup (PostgreSQL)
```bash
# Create database and user
sudo -u postgres psql
CREATE DATABASE protein_synthesis;
CREATE USER protein_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE protein_synthesis TO protein_user;
\q

# Run migrations
cd /opt/protein-synthesis-app/backend
NODE_ENV=production npm run migrate
```

### Process Management with PM2
```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'protein-backend',
      script: './backend/dist/main.js',
      cwd: '/opt/protein-synthesis-app',
      env: {
        NODE_ENV: 'production',
        PORT: 8000
      },
      instances: 2,
      exec_mode: 'cluster'
    },
    {
      name: 'protein-ai-service',
      script: 'venv/bin/python',
      args: '-m uvicorn main:app --host 0.0.0.0 --port 8001',
      cwd: '/opt/protein-synthesis-app/ai-service',
      env: {
        ENVIRONMENT: 'production'
      }
    }
  ]
};
EOF

# Start applications
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Nginx Configuration
```bash
# Create Nginx configuration
sudo tee /etc/nginx/sites-available/protein-synthesis << EOF
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /opt/protein-synthesis-app/frontend/build;
        try_files \$uri \$uri/ /index.html;
        
        # Enable gzip compression
        gzip on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Increase timeout for AI operations
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # AI Service
    location /ai/ {
        proxy_pass http://localhost:8001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        
        # Extended timeout for AI processing
        proxy_read_timeout 600s;
        proxy_connect_timeout 75s;
    }

    # File uploads
    client_max_body_size 100M;
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/protein-synthesis /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Docker Deployment

### Docker Compose Setup
```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    environment:
      - REACT_APP_API_URL=http://localhost:8000
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://protein_user:password@postgres:5432/protein_synthesis
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./data:/app/data

  ai-service:
    build:
      context: ./ai-service
      dockerfile: Dockerfile
    ports:
      - "8001:8001"
    environment:
      - ENVIRONMENT=production
      - MODEL_PATH=/app/models
    volumes:
      - ./models:/app/models
    deploy:
      resources:
        limits:
          memory: 8G
        reservations:
          memory: 4G

  postgres:
    image: postgres:13
    environment:
      - POSTGRES_DB=protein_synthesis
      - POSTGRES_USER=protein_user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
      - ai-service

volumes:
  postgres_data:
  redis_data:
```

### Dockerfiles

**Frontend Dockerfile**
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Backend Dockerfile**
```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 8000
CMD ["node", "dist/main.js"]
```

**AI Service Dockerfile**
```dockerfile
# ai-service/Dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-prod.txt .
RUN pip install --no-cache-dir -r requirements-prod.txt

COPY . .

EXPOSE 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Docker Deployment Commands
```bash
# Build and start services
docker-compose up -d --build

# Scale backend service
docker-compose up -d --scale backend=3

# View logs
docker-compose logs -f backend

# Update services
docker-compose pull
docker-compose up -d

# Backup database
docker-compose exec postgres pg_dump -U protein_user protein_synthesis > backup.sql
```

## Cloud Deployment

### AWS Deployment

#### EC2 Instance Setup
```bash
# Launch EC2 instance (t3.xlarge recommended)
# Security groups: HTTP (80), HTTPS (443), SSH (22)

# Connect and setup
ssh -i your-key.pem ubuntu@your-ec2-ip

# Install Docker
sudo apt update
sudo apt install docker.io docker-compose -y
sudo usermod -aG docker ubuntu

# Deploy application
git clone <repository-url>
cd protein-synthesis-app
docker-compose up -d
```

#### RDS Database Setup
```bash
# Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier protein-synthesis-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username protein_user \
  --master-user-password your-secure-password \
  --allocated-storage 20

# Update environment variables
DATABASE_URL=postgresql://protein_user:password@your-rds-endpoint:5432/protein_synthesis
```

#### S3 Storage Setup
```bash
# Create S3 bucket for file storage
aws s3 mb s3://protein-synthesis-files

# Update backend configuration
AWS_S3_BUCKET=protein-synthesis-files
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### Google Cloud Platform

#### Cloud Run Deployment
```bash
# Build and push images
gcloud builds submit --tag gcr.io/your-project/protein-backend ./backend
gcloud builds submit --tag gcr.io/your-project/protein-ai-service ./ai-service

# Deploy services
gcloud run deploy protein-backend \
  --image gcr.io/your-project/protein-backend \
  --platform managed \
  --region us-central1 \
  --memory 2Gi \
  --cpu 2

gcloud run deploy protein-ai-service \
  --image gcr.io/your-project/protein-ai-service \
  --platform managed \
  --region us-central1 \
  --memory 8Gi \
  --cpu 4 \
  --timeout 900
```

### Azure Deployment

#### Container Instances
```bash
# Create resource group
az group create --name protein-synthesis --location eastus

# Deploy containers
az container create \
  --resource-group protein-synthesis \
  --name protein-backend \
  --image your-registry/protein-backend \
  --cpu 2 \
  --memory 4 \
  --ports 8000

az container create \
  --resource-group protein-synthesis \
  --name protein-ai-service \
  --image your-registry/protein-ai-service \
  --cpu 4 \
  --memory 8 \
  --ports 8001
```

## Environment Configuration

### Production Environment Variables

**Frontend**
```bash
REACT_APP_API_URL=https://api.your-domain.com
REACT_APP_AI_SERVICE_URL=https://ai.your-domain.com
REACT_APP_ENVIRONMENT=production
REACT_APP_SENTRY_DSN=your-sentry-dsn
REACT_APP_ANALYTICS_ID=your-analytics-id
```

**Backend**
```bash
NODE_ENV=production
PORT=8000
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://redis-host:6379
AI_SERVICE_URL=http://ai-service:8001
JWT_SECRET=your-jwt-secret
CORS_ORIGIN=https://your-domain.com
LOG_LEVEL=info
SENTRY_DSN=your-sentry-dsn
```

**AI Service**
```bash
ENVIRONMENT=production
PORT=8001
MODEL_PATH=/app/models
CACHE_SIZE=5000
MAX_MEMORY_GB=8
LOG_LEVEL=info
SENTRY_DSN=your-sentry-dsn
```

### Security Configuration
```bash
# Generate secure secrets
openssl rand -hex 32  # For JWT_SECRET
openssl rand -hex 16  # For session secrets

# Set file permissions
chmod 600 .env
chmod 700 data/
chmod 755 models/
```

## Database Setup

### PostgreSQL Production Setup
```sql
-- Create optimized database
CREATE DATABASE protein_synthesis
  WITH ENCODING 'UTF8'
       LC_COLLATE = 'en_US.UTF-8'
       LC_CTYPE = 'en_US.UTF-8'
       TEMPLATE template0;

-- Create user with limited privileges
CREATE USER protein_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE protein_synthesis TO protein_user;
GRANT USAGE ON SCHEMA public TO protein_user;
GRANT CREATE ON SCHEMA public TO protein_user;

-- Performance tuning
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
```

### Database Migrations
```bash
# Run migrations
cd backend
npm run migrate:prod

# Backup database
pg_dump -h localhost -U protein_user protein_synthesis > backup_$(date +%Y%m%d).sql

# Restore database
psql -h localhost -U protein_user protein_synthesis < backup_20250127.sql
```

## AI Models Setup

### Model Download and Setup
```bash
# Create models directory
mkdir -p ai-service/models

# Download ProtFlash model
cd ai-service
python scripts/download_protflash.py

# Download ProtGPT2 model
python scripts/download_protgpt2.py

# Download Geneverse models
python scripts/download_geneverse.py

# Verify models
python scripts/verify_models.py
```

### Model Optimization
```python
# ai-service/scripts/optimize_models.py
import torch
from transformers import AutoModel

def quantize_model(model_path, output_path):
    """Quantize model for CPU inference"""
    model = AutoModel.from_pretrained(model_path)
    quantized_model = torch.quantization.quantize_dynamic(
        model, {torch.nn.Linear}, dtype=torch.qint8
    )
    torch.save(quantized_model.state_dict(), output_path)

# Run optimization
python scripts/optimize_models.py
```

### Model Caching Strategy
```python
# ai-service/services/model_manager.py
class ModelManager:
    def __init__(self, max_memory_gb=4):
        self.max_memory = max_memory_gb * 1024 * 1024 * 1024
        self.loaded_models = {}
        self.model_usage = {}
    
    def load_model(self, model_name):
        if self._memory_usage() > self.max_memory * 0.8:
            self._unload_least_used_model()
        
        # Load model logic
        pass
```

## Monitoring and Logging

### Application Monitoring
```bash
# Install monitoring tools
npm install -g pm2
pm2 install pm2-logrotate

# Setup log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

### Health Checks
```javascript
// backend/routes/health.js
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      aiService: await checkAIService(),
      diskSpace: await checkDiskSpace(),
      memory: process.memoryUsage()
    }
  };
  
  res.json(health);
});
```

### Logging Configuration
```javascript
// backend/utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

### Performance Monitoring
```bash
# Install monitoring tools
npm install --save @sentry/node @sentry/tracing

# Setup Prometheus metrics
npm install prom-client
```

## Troubleshooting

### Common Issues

#### Memory Issues
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Optimize Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"

# Monitor AI service memory
docker stats protein-synthesis-app_ai-service_1
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U protein_user -d protein_synthesis -c "SELECT 1;"

# Check connection limits
SELECT * FROM pg_stat_activity;
```

#### AI Model Loading Issues
```bash
# Check model files
ls -la ai-service/models/
du -sh ai-service/models/*

# Test model loading
cd ai-service
python -c "from services.ai_service import AIService; AIService().load_model('protflash')"
```

#### Performance Issues
```bash
# Check CPU usage
top -p $(pgrep -d',' node)

# Check disk I/O
iotop

# Check network
netstat -tuln | grep :8000
```

### Log Analysis
```bash
# Backend logs
tail -f backend/logs/combined.log

# AI service logs
tail -f ai-service/logs/ai-service.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# System logs
journalctl -u nginx -f
journalctl -u postgresql -f
```

### Backup and Recovery
```bash
# Database backup
pg_dump -h localhost -U protein_user protein_synthesis | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# File backup
tar -czf files_backup_$(date +%Y%m%d).tar.gz data/ models/

# Automated backup script
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
pg_dump -h localhost -U protein_user protein_synthesis | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Files backup
tar -czf "$BACKUP_DIR/files_$DATE.tar.gz" /opt/protein-synthesis-app/data/

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

### Scaling Considerations
```bash
# Horizontal scaling with PM2
pm2 start ecosystem.config.js --instances max

# Load balancing with Nginx
upstream backend {
    server localhost:8000;
    server localhost:8001;
    server localhost:8002;
}

# Database read replicas
# Setup PostgreSQL streaming replication
```

This deployment guide provides comprehensive instructions for deploying the Protein Synthesis Web Application in various environments, from development to production cloud deployments. Follow the appropriate section based on your deployment needs and infrastructure requirements.