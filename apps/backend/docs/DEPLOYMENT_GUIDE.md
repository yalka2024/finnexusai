# FinNexusAI Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the FinNexusAI platform to production environments. The platform supports multiple deployment strategies including Docker, Kubernetes, and cloud-native deployments.

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+ recommended), macOS, or Windows with WSL2
- **CPU**: Minimum 4 cores, recommended 8+ cores
- **Memory**: Minimum 8GB RAM, recommended 16GB+ RAM
- **Storage**: Minimum 100GB SSD, recommended 500GB+ SSD
- **Network**: Stable internet connection with low latency

### Software Requirements

- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher
- **Docker**: v20.0.0 or higher
- **Docker Compose**: v2.0.0 or higher
- **Kubernetes**: v1.24.0 or higher (for K8s deployment)
- **Helm**: v3.8.0 or higher (for K8s deployment)
- **PostgreSQL**: v14.0 or higher
- **Redis**: v6.0 or higher
- **MongoDB**: v5.0 or higher

### Cloud Provider Accounts

- **AWS**: For cloud deployment
- **Google Cloud Platform**: Alternative cloud provider
- **Azure**: Alternative cloud provider

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/finainexus/finainexus-ai.git
cd finainexus-ai
```

### 2. Install Dependencies

```bash
# Install backend dependencies
cd apps/backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install root dependencies
cd ../..
npm install
```

### 3. Environment Configuration

Create environment files for different deployment stages:

#### Development Environment

```bash
# apps/backend/.env.development
NODE_ENV=development
PORT=3000

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/finainexus_dev
REDIS_URL=redis://localhost:6379
MONGODB_URL=mongodb://localhost:27017/finainexus_dev

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-for-development
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d

# Email Configuration
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@finainexus.com

# Blockchain Configuration
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/your-project-id
POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/your-project-id
BSC_RPC_URL=https://bsc-dataseed.binance.org

# Exchange API Keys
BINANCE_API_KEY=your-binance-api-key
BINANCE_SECRET_KEY=your-binance-secret-key
COINBASE_API_KEY=your-coinbase-api-key
COINBASE_SECRET_KEY=your-coinbase-secret-key

# AI/ML Configuration
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# Security Configuration
ENCRYPTION_KEY=your-32-character-encryption-key
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring Configuration
SENTRY_DSN=your-sentry-dsn
DATADOG_API_KEY=your-datadog-api-key
PROMETHEUS_PORT=9090

# Frontend Configuration
FRONTEND_URL=http://localhost:3001
```

#### Production Environment

```bash
# apps/backend/.env.production
NODE_ENV=production
PORT=3000

# Database Configuration
DATABASE_URL=postgresql://username:password@prod-db-host:5432/finainexus_prod
REDIS_URL=redis://prod-redis-host:6379
MONGODB_URL=mongodb://prod-mongo-host:27017/finainexus_prod

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-for-production
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d

# Email Configuration
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-production-sendgrid-api-key
FROM_EMAIL=noreply@finainexus.com

# Blockchain Configuration
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/your-production-project-id
POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/your-production-project-id
BSC_RPC_URL=https://bsc-dataseed.binance.org

# Exchange API Keys
BINANCE_API_KEY=your-production-binance-api-key
BINANCE_SECRET_KEY=your-production-binance-secret-key
COINBASE_API_KEY=your-production-coinbase-api-key
COINBASE_SECRET_KEY=your-production-coinbase-secret-key

# AI/ML Configuration
OPENAI_API_KEY=your-production-openai-api-key
ANTHROPIC_API_KEY=your-production-anthropic-api-key

# Security Configuration
ENCRYPTION_KEY=your-production-32-character-encryption-key
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Monitoring Configuration
SENTRY_DSN=your-production-sentry-dsn
DATADOG_API_KEY=your-production-datadog-api-key
PROMETHEUS_PORT=9090

# Frontend Configuration
FRONTEND_URL=https://app.finainexus.com

# SSL Configuration
SSL_CERT_PATH=/etc/ssl/certs/finainexus.crt
SSL_KEY_PATH=/etc/ssl/private/finainexus.key
```

## Deployment Strategies

### 1. Docker Deployment

#### Build Docker Images

```bash
# Build backend image
cd apps/backend
docker build -t finainexus/backend:latest .

# Build frontend image
cd ../frontend
docker build -t finainexus/frontend:latest .
```

#### Docker Compose Deployment

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  # Database Services
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: finainexus_prod
      POSTGRES_USER: finainexus
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:6-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped

  mongodb:
    image: mongo:5
    environment:
      MONGO_INITDB_ROOT_USERNAME: finainexus
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
      MONGO_INITDB_DATABASE: finainexus_prod
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"
    restart: unless-stopped

  # Application Services
  backend:
    build: ./apps/backend
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://finainexus:${DB_PASSWORD}@postgres:5432/finainexus_prod
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      MONGODB_URL: mongodb://finainexus:${MONGO_PASSWORD}@mongodb:27017/finainexus_prod
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
      - mongodb
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build: ./apps/frontend
    environment:
      NEXT_PUBLIC_API_URL: http://backend:3000
    ports:
      - "3001:3001"
    depends_on:
      - backend
    restart: unless-stopped

  # Monitoring Services
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    ports:
      - "3001:3000"
    depends_on:
      - prometheus
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  mongodb_data:
  prometheus_data:
  grafana_data:
```

#### Deploy with Docker Compose

```bash
# Create environment file
cp .env.example .env.production

# Edit environment variables
nano .env.production

# Deploy services
docker-compose -f docker-compose.production.yml up -d

# Check service status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f backend
```

### 2. Kubernetes Deployment

#### Prerequisites

- Kubernetes cluster (v1.24+)
- Helm v3.8+
- kubectl configured

#### Install Helm Charts

```bash
# Add FinNexusAI Helm repository
helm repo add finainexus https://charts.finainexus.com
helm repo update

# Install FinNexusAI platform
helm install finainexus finainexus/finainexus-platform \
  --namespace finainexus \
  --create-namespace \
  --values values.production.yaml
```

#### Custom Values File

```yaml
# values.production.yaml
global:
  imageRegistry: finainexus
  imageTag: latest
  pullPolicy: IfNotPresent

backend:
  replicaCount: 3
  image:
    repository: finainexus/backend
    tag: latest
  service:
    type: ClusterIP
    port: 3000
  ingress:
    enabled: true
    className: nginx
    hosts:
      - host: api.finainexus.com
        paths:
          - path: /
            pathType: Prefix
    tls:
      - secretName: finainexus-api-tls
        hosts:
          - api.finainexus.com
  resources:
    limits:
      cpu: 1000m
      memory: 2Gi
    requests:
      cpu: 500m
      memory: 1Gi
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70

frontend:
  replicaCount: 2
  image:
    repository: finainexus/frontend
    tag: latest
  service:
    type: ClusterIP
    port: 3001
  ingress:
    enabled: true
    className: nginx
    hosts:
      - host: app.finainexus.com
        paths:
          - path: /
            pathType: Prefix
    tls:
      - secretName: finainexus-app-tls
        hosts:
          - app.finainexus.com

postgresql:
  enabled: true
  auth:
    postgresPassword: ${DB_PASSWORD}
    username: finainexus
    password: ${DB_PASSWORD}
    database: finainexus_prod
  primary:
    persistence:
      enabled: true
      size: 100Gi
    resources:
      limits:
        cpu: 1000m
        memory: 4Gi
      requests:
        cpu: 500m
        memory: 2Gi

redis:
  enabled: true
  auth:
    enabled: true
    password: ${REDIS_PASSWORD}
  master:
    persistence:
      enabled: true
      size: 20Gi
    resources:
      limits:
        cpu: 500m
        memory: 2Gi
      requests:
        cpu: 250m
        memory: 1Gi

mongodb:
  enabled: true
  auth:
    enabled: true
    rootUsername: finainexus
    rootPassword: ${MONGO_PASSWORD}
    username: finainexus
    password: ${MONGO_PASSWORD}
    database: finainexus_prod
  persistence:
    enabled: true
    size: 50Gi
  resources:
    limits:
      cpu: 1000m
      memory: 4Gi
    requests:
      cpu: 500m
      memory: 2Gi

monitoring:
  prometheus:
    enabled: true
    server:
      persistentVolume:
        enabled: true
        size: 50Gi
  grafana:
    enabled: true
    adminPassword: ${GRAFANA_PASSWORD}
    persistence:
      enabled: true
      size: 10Gi
```

#### Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace finainexus

# Create secrets
kubectl create secret generic finainexus-secrets \
  --from-literal=db-password=${DB_PASSWORD} \
  --from-literal=redis-password=${REDIS_PASSWORD} \
  --from-literal=mongo-password=${MONGO_PASSWORD} \
  --from-literal=jwt-secret=${JWT_SECRET} \
  --from-literal=encryption-key=${ENCRYPTION_KEY} \
  --namespace finainexus

# Install with Helm
helm install finainexus finainexus/finainexus-platform \
  --namespace finainexus \
  --values values.production.yaml

# Check deployment status
kubectl get pods -n finainexus
kubectl get services -n finainexus
kubectl get ingress -n finainexus
```

### 3. Cloud Deployment

#### AWS Deployment

##### Using AWS EKS

```bash
# Create EKS cluster
eksctl create cluster \
  --name finainexus-prod \
  --region us-west-2 \
  --nodegroup-name workers \
  --node-type t3.large \
  --nodes 3 \
  --nodes-min 3 \
  --nodes-max 10 \
  --managed

# Configure kubectl
aws eks update-kubeconfig --region us-west-2 --name finainexus-prod

# Deploy using Helm
helm install finainexus finainexus/finainexus-platform \
  --namespace finainexus \
  --create-namespace \
  --values values.aws.yaml
```

##### Using AWS ECS

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name finainexus-prod

# Create task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service \
  --cluster finainexus-prod \
  --service-name finainexus-backend \
  --task-definition finainexus-backend:1 \
  --desired-count 3 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345],securityGroups=[sg-12345],assignPublicIp=ENABLED}"
```

#### Google Cloud Platform Deployment

##### Using Google Kubernetes Engine

```bash
# Create GKE cluster
gcloud container clusters create finainexus-prod \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type e2-standard-4 \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 10

# Get cluster credentials
gcloud container clusters get-credentials finainexus-prod --zone us-central1-a

# Deploy using Helm
helm install finainexus finainexus/finainexus-platform \
  --namespace finainexus \
  --create-namespace \
  --values values.gcp.yaml
```

## Database Setup

### 1. PostgreSQL Setup

```sql
-- Create database and user
CREATE DATABASE finainexus_prod;
CREATE USER finainexus WITH PASSWORD 'secure-password';
GRANT ALL PRIVILEGES ON DATABASE finainexus_prod TO finainexus;

-- Connect to database
\c finainexus_prod

-- Run migrations
\i apps/backend/src/database/migrations/001_create_users_table.sql
\i apps/backend/src/database/migrations/002_create_portfolios_table.sql
\i apps/backend/src/database/migrations/003_create_assets_table.sql
\i apps/backend/src/database/migrations/004_create_holdings_table.sql
\i apps/backend/src/database/migrations/005_create_trades_table.sql
```

### 2. Redis Setup

```bash
# Start Redis with configuration
redis-server /etc/redis/redis.conf

# Test connection
redis-cli ping
```

### 3. MongoDB Setup

```javascript
// Connect to MongoDB
use finainexus_prod

// Create collections and indexes
db.createCollection("market_data")
db.createCollection("trading_signals")
db.createCollection("user_analytics")

// Create indexes
db.market_data.createIndex({ "symbol": 1, "timestamp": -1 })
db.trading_signals.createIndex({ "assetId": 1, "timestamp": -1 })
db.user_analytics.createIndex({ "userId": 1, "timestamp": -1 })
```

## SSL/TLS Configuration

### 1. Obtain SSL Certificates

```bash
# Using Let's Encrypt with Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.finainexus.com -d app.finainexus.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. Configure Nginx

```nginx
# /etc/nginx/sites-available/finainexus
server {
    listen 80;
    server_name api.finainexus.com app.finainexus.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.finainexus.com;

    ssl_certificate /etc/letsencrypt/live/api.finainexus.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.finainexus.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 443 ssl http2;
    server_name app.finainexus.com;

    ssl_certificate /etc/letsencrypt/live/app.finainexus.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.finainexus.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring and Logging

### 1. Prometheus Configuration

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

scrape_configs:
  - job_name: 'finainexus-backend'
    static_configs:
      - targets: ['backend:3000']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'finainexus-frontend'
    static_configs:
      - targets: ['frontend:3001']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']

  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongodb:27017']
```

### 2. Grafana Dashboards

```json
{
  "dashboard": {
    "id": null,
    "title": "FinNexusAI Platform Overview",
    "tags": ["finainexus"],
    "timezone": "browser",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{endpoint}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          }
        ]
      }
    ]
  }
}
```

### 3. Log Aggregation

```yaml
# docker-compose.logging.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.5.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"

  logstash:
    image: docker.elastic.co/logstash/logstash:8.5.0
    volumes:
      - ./logging/logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    ports:
      - "5044:5044"
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.5.0
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

volumes:
  elasticsearch_data:
```

## Security Configuration

### 1. Firewall Setup

```bash
# UFW configuration
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp  # Backend API
sudo ufw allow 3001/tcp  # Frontend
sudo ufw enable
```

### 2. Security Headers

```javascript
// Security middleware configuration
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.finainexus.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### 3. Rate Limiting

```javascript
// Rate limiting configuration
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);
```

## Backup and Recovery

### 1. Database Backup

```bash
#!/bin/bash
# backup.sh

# PostgreSQL backup
pg_dump -h localhost -U finainexus -d finainexus_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# MongoDB backup
mongodump --host localhost:27017 --db finainexus_prod --out backup_$(date +%Y%m%d_%H%M%S)

# Redis backup
redis-cli --rdb backup_$(date +%Y%m%d_%H%M%S).rdb

# Compress backups
tar -czf backup_$(date +%Y%m%d_%H%M%S).tar.gz backup_*

# Upload to S3
aws s3 cp backup_$(date +%Y%m%d_%H%M%S).tar.gz s3://finainexus-backups/
```

### 2. Automated Backup

```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /path/to/backup.sh

# Weekly full backup
0 2 * * 0 /path/to/full-backup.sh
```

## Health Checks

### 1. Application Health Check

```javascript
// Health check endpoint
app.get('/api/v1/health', async (req, res) => {
  try {
    // Check database connection
    await databaseManager.query('SELECT 1');
    
    // Check Redis connection
    await redisClient.ping();
    
    // Check MongoDB connection
    await mongoClient.db().admin().ping();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
```

### 2. Load Balancer Health Check

```bash
# Nginx health check configuration
location /health {
    access_log off;
    return 200 "healthy\n";
    add_header Content-Type text/plain;
}
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues

```bash
# Check database status
sudo systemctl status postgresql

# Check connection
psql -h localhost -U finainexus -d finainexus_prod

# Check logs
sudo journalctl -u postgresql -f
```

#### 2. Memory Issues

```bash
# Check memory usage
free -h
htop

# Check Node.js memory usage
node --max-old-space-size=4096 apps/backend/src/index.js
```

#### 3. SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in /etc/ssl/certs/finainexus.crt -text -noout

# Test SSL connection
openssl s_client -connect api.finainexus.com:443 -servername api.finainexus.com
```

### Log Analysis

```bash
# Application logs
docker-compose logs -f backend

# System logs
sudo journalctl -u finainexus-backend -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Performance Optimization

### 1. Database Optimization

```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_trades_user_id_created_at ON trades(user_id, created_at);
CREATE INDEX CONCURRENTLY idx_holdings_portfolio_id_asset_id ON holdings(portfolio_id, asset_id);
CREATE INDEX CONCURRENTLY idx_assets_symbol_status ON assets(symbol, status);

-- Analyze tables for query optimization
ANALYZE trades;
ANALYZE holdings;
ANALYZE assets;
```

### 2. Application Optimization

```javascript
// Enable gzip compression
const compression = require('compression');
app.use(compression());

// Enable caching
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

// Cache middleware
const cache = (duration) => {
  return async (req, res, next) => {
    const key = req.originalUrl;
    const cached = await client.get(key);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    res.sendResponse = res.json;
    res.json = (body) => {
      client.setex(key, duration, JSON.stringify(body));
      res.sendResponse(body);
    };
    
    next();
  };
};
```

## Maintenance

### 1. Regular Updates

```bash
# Update dependencies
npm update

# Update Docker images
docker-compose pull
docker-compose up -d

# Update Kubernetes deployments
helm upgrade finainexus finainexus/finainexus-platform --values values.production.yaml
```

### 2. Database Maintenance

```sql
-- Vacuum and analyze tables
VACUUM ANALYZE trades;
VACUUM ANALYZE holdings;
VACUUM ANALYZE portfolios;

-- Update statistics
ANALYZE;
```

### 3. Log Rotation

```bash
# Configure logrotate
sudo nano /etc/logrotate.d/finainexus

# Add configuration
/var/log/finainexus/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 finainexus finainexus
}
```

## Support

For deployment support and questions:

- **Documentation**: https://docs.finainexus.com/deployment
- **Support Email**: deployment-support@finainexus.com
- **Discord**: https://discord.gg/finainexus
- **GitHub Issues**: https://github.com/finainexus/finainexus-ai/issues

## Conclusion

This deployment guide provides comprehensive instructions for deploying the FinNexusAI platform to production environments. Follow the steps carefully and ensure all security measures are in place before going live.

For additional support or customization needs, please contact our deployment team.
