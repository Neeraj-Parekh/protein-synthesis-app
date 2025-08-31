# Production Deployment Guide

This guide covers deploying the Protein Synthesis Web Application to a production environment using Docker, PostgreSQL, and modern DevOps practices.

## Prerequisites

- Docker and Docker Compose
- PostgreSQL database
- Redis for caching
- SSL certificates (Let's Encrypt recommended)
- Domain name configured

## Quick Start

```bash
# Clone and setup
git clone <repository-url>
cd protein-synthesis-app

# Run production setup
chmod +x setup-production.sh
./setup-production.sh

# Start services
docker-compose -f docker-compose.prod.yml up -d
```

## Environment Configuration

### Backend Environment (.env)
```env
# Database
DATABASE_URL=postgresql://user:password@postgres:5432/protein_synthesis
REDIS_URL=redis://redis:6379/0

# Security
SECRET_KEY=your-super-secret-key-change-in-production
JWT_SECRET_KEY=your-jwt-secret-key
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@your-domain.com

# AI Service
AI_SERVICE_URL=http://ai-service:8001
MODEL_CACHE_DIR=/app/models

# File Storage
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=100MB

# Logging
LOG_LEVEL=INFO
LOG_FILE=/app/logs/backend.log

# Production Settings
ENVIRONMENT=production
DEBUG=false
ALLOWED_HOSTS=your-domain.com,localhost
CORS_ORIGINS=https://your-domain.com
```

### Frontend Environment (.env.production)
```env
VITE_API_URL=https://api.your-domain.com
VITE_APP_NAME=Protein Synthesis Web App
VITE_APP_VERSION=1.0.0
VITE_ENABLE_ANALYTICS=true
VITE_SENTRY_DSN=your-sentry-dsn
```

## Docker Production Configuration

### docker-compose.prod.yml
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: protein_synthesis
      POSTGRES_USER: protein_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U protein_user -d protein_synthesis"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    environment:
      - DATABASE_URL=postgresql://protein_user:${POSTGRES_PASSWORD}@postgres:5432/protein_synthesis
      - REDIS_URL=redis://redis:6379/0
    volumes:
      - ./backend/uploads:/app/uploads
      - ./backend/logs:/app/logs
      - ./backend/models:/app/models
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  ai-service:
    build:
      context: ./ai-service
      dockerfile: Dockerfile.prod
    environment:
      - MODEL_CACHE_DIR=/app/models
      - DEVICE=cuda  # or cpu
    volumes:
      - ./ai-service/models:/app/models
      - ./ai-service/logs:/app/logs
    ports:
      - "8001:8001"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
      args:
        - VITE_API_URL=https://api.your-domain.com
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/ssl:/etc/nginx/ssl
      - ./nginx/nginx.prod.conf:/etc/nginx/nginx.conf
    depends_on:
      - backend
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.prod.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - ./frontend/dist:/usr/share/nginx/html
    depends_on:
      - backend
      - frontend
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:

networks:
  default:
    driver: bridge
```

## SSL Configuration

### Nginx Configuration with SSL
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Frontend
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    }

    # API Backend
    location /api/ {
        proxy_pass http://backend:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # File upload
        client_max_body_size 100M;
    }

    # AI Service
    location /ai/ {
        proxy_pass http://ai-service:8001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Extended timeouts for AI processing
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

## Database Setup

### Production PostgreSQL Configuration
```sql
-- Create database and user
CREATE DATABASE protein_synthesis;
CREATE USER protein_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE protein_synthesis TO protein_user;

-- Performance tuning
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- Restart PostgreSQL to apply changes
SELECT pg_reload_conf();
```

### Database Migration
```bash
# Run migrations
docker-compose exec backend alembic upgrade head

# Create initial admin user
docker-compose exec backend python -c "
from database import get_db
from models.user import UserDB, UserRole, AuthUtils
from sqlalchemy.orm import Session

db = next(get_db())
admin_user = UserDB(
    email='admin@your-domain.com',
    username='admin',
    hashed_password=AuthUtils.hash_password('secure_admin_password'),
    full_name='System Administrator',
    role=UserRole.ADMIN.value,
    is_verified=True
)
db.add(admin_user)
db.commit()
print('Admin user created successfully')
"
```

## Monitoring and Logging

### Docker Logging Configuration
```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Health Checks
```bash
# Backend health check
curl -f http://localhost:8000/health

# Database connection check
docker-compose exec backend python -c "
from database import engine
try:
    with engine.connect() as conn:
        conn.execute('SELECT 1')
    print('Database connection: OK')
except Exception as e:
    print(f'Database connection: FAILED - {e}')
"

# AI service health check
curl -f http://localhost:8001/health
```

### Log Monitoring
```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f ai-service

# Log rotation setup
cat > /etc/logrotate.d/protein-synthesis << EOF
/var/lib/docker/containers/*/*.log {
    daily
    missingok
    rotate 7
    compress
    notifempty
    create 0644 root root
    postrotate
        /bin/kill -USR1 \$(cat /var/run/docker.pid) 2> /dev/null || true
    endscript
}
EOF
```

## Security Hardening

### Firewall Configuration
```bash
# UFW setup
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### Docker Security
```bash
# Run containers as non-root user
# Add to Dockerfile
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -G appgroup
USER appuser

# Limit container resources
docker-compose.yml:
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 512M
```

### Environment Secrets
```bash
# Use Docker secrets for sensitive data
echo "secure_db_password" | docker secret create postgres_password -
echo "jwt_secret_key" | docker secret create jwt_secret -

# Reference in docker-compose.yml
secrets:
  - postgres_password
  - jwt_secret

environment:
  POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
  JWT_SECRET_KEY_FILE: /run/secrets/jwt_secret
```

## Backup Strategy

### Database Backup
```bash
#!/bin/bash
# backup-db.sh

BACKUP_DIR="/backup/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="protein_synthesis_$DATE.sql"

mkdir -p $BACKUP_DIR

docker-compose exec -T postgres pg_dump \
  -U protein_user \
  -d protein_synthesis \
  --clean --if-exists > "$BACKUP_DIR/$FILENAME"

# Compress backup
gzip "$BACKUP_DIR/$FILENAME"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $FILENAME.gz"
```

### File Backup
```bash
#!/bin/bash
# backup-files.sh

BACKUP_DIR="/backup/files"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup uploaded files
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" \
  ./backend/uploads/

# Backup AI models
tar -czf "$BACKUP_DIR/models_$DATE.tar.gz" \
  ./ai-service/models/

echo "File backups completed"
```

### Automated Backups
```bash
# Add to crontab
crontab -e

# Daily database backup at 2 AM
0 2 * * * /path/to/backup-db.sh

# Weekly file backup on Sunday at 3 AM
0 3 * * 0 /path/to/backup-files.sh
```

## Performance Optimization

### Database Optimization
```sql
-- Create indexes for frequently queried fields
CREATE INDEX idx_proteins_created_at ON proteins(created_at);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_analysis_results_protein_id ON analysis_results(protein_id);

-- Analyze table statistics
ANALYZE;
```

### Redis Caching
```python
# Backend caching configuration
REDIS_CONFIG = {
    "host": "redis",
    "port": 6379,
    "db": 0,
    "decode_responses": True,
    "max_connections": 20,
    "retry_on_timeout": True
}

# Cache frequently accessed data
@cache(expire=3600)  # 1 hour
def get_protein_analysis(protein_id):
    # Expensive computation
    pass
```

### CDN Configuration
```nginx
# Static file caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    access_log off;
}

# API response caching
location /api/proteins/ {
    proxy_cache_valid 200 1h;
    proxy_cache_key "$scheme$request_method$host$request_uri";
    add_header X-Cache-Status $upstream_cache_status;
}
```

## Scaling Considerations

### Horizontal Scaling
```yaml
# docker-compose.scale.yml
services:
  backend:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 1G

  ai-service:
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 4G
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

### Load Balancing
```nginx
upstream backend_servers {
    server backend_1:8000;
    server backend_2:8000;
    server backend_3:8000;
}

server {
    location /api/ {
        proxy_pass http://backend_servers;
    }
}
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Verify connection
docker-compose exec backend python -c "from database import engine; engine.connect()"
```

2. **Memory Issues**
```bash
# Monitor container memory usage
docker stats

# Adjust memory limits
deploy:
  resources:
    limits:
      memory: 2G
```

3. **SSL Certificate Issues**
```bash
# Renew Let's Encrypt certificates
certbot renew --nginx

# Check certificate validity
openssl x509 -in /etc/nginx/ssl/cert.pem -text -noout
```

### Performance Monitoring
```bash
# Monitor system resources
htop
iotop
nethogs

# Docker container monitoring
docker-compose exec backend pip install psutil
docker-compose exec backend python -c "
import psutil
print(f'CPU: {psutil.cpu_percent()}%')
print(f'Memory: {psutil.virtual_memory().percent}%')
print(f'Disk: {psutil.disk_usage(\"/\").percent}%')
"
```

## Maintenance

### Regular Maintenance Tasks
```bash
# Weekly maintenance script
#!/bin/bash

echo "Starting weekly maintenance..."

# Update Docker images
docker-compose pull

# Clean up unused Docker resources
docker system prune -f

# Vacuum database
docker-compose exec postgres vacuumdb -U protein_user -d protein_synthesis --analyze

# Restart services with zero downtime
docker-compose up -d --force-recreate --no-deps backend

echo "Maintenance completed"
```

### Updates and Migrations
```bash
# Application update process
git pull origin main
docker-compose build
docker-compose exec backend alembic upgrade head
docker-compose up -d --force-recreate
```

This production deployment guide ensures a robust, secure, and scalable deployment of the Protein Synthesis Web Application.
