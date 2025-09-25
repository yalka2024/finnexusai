#!/bin/bash

# FinAI Nexus - Production Deployment Script
# Complete production deployment with all monitoring and security features

set -e

# Configuration
ENVIRONMENT="${ENVIRONMENT:-production}"
BACKUP_ENABLED="${BACKUP_ENABLED:-true}"
SSL_ENABLED="${SSL_ENABLED:-true}"
MONITORING_ENABLED="${MONITORING_ENABLED:-true}"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        error_exit "Docker is not installed"
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        error_exit "Docker Compose is not installed"
    fi
    
    # Check if .env.production exists
    if [ ! -f ".env.production" ]; then
        error_exit ".env.production file not found. Run 'node scripts/generate-production-secrets.js' first"
    fi
    
    log "✅ Prerequisites check passed"
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."
    
    mkdir -p monitoring/prometheus
    mkdir -p monitoring/grafana/provisioning/datasources
    mkdir -p monitoring/grafana/dashboards
    mkdir -p monitoring/alertmanager
    mkdir -p monitoring/loki
    mkdir -p nginx/ssl
    mkdir -p backups
    mkdir -p logs
    
    log "✅ Directories created"
}

# Setup SSL certificates
setup_ssl() {
    if [ "$SSL_ENABLED" = "true" ]; then
        log "Setting up SSL certificates..."
        
        if [ "$ENVIRONMENT" = "production" ]; then
            # Production: Use Let's Encrypt
            chmod +x scripts/setup-ssl.sh
            ./scripts/setup-ssl.sh
        else
            # Testing: Generate self-signed certificates
            SSL_MODE=testing chmod +x scripts/setup-ssl.sh
            ./scripts/setup-ssl.sh
        fi
        
        log "✅ SSL setup completed"
    else
        log "⚠️ SSL setup skipped"
    fi
}

# Setup monitoring
setup_monitoring() {
    if [ "$MONITORING_ENABLED" = "true" ]; then
        log "Setting up monitoring stack..."
        
        # Create alertmanager configuration
        cat > monitoring/alertmanager/alertmanager.yml << 'EOF'
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@finainexus.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
- name: 'web.hook'
  webhook_configs:
  - url: 'http://localhost:5001/'
    send_resolved: true

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'dev', 'instance']
EOF

        # Create Loki configuration
        cat > monitoring/loki/loki-config.yml << 'EOF'
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    address: 127.0.0.1
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
    final_sleep: 0s
  chunk_idle_period: 1h
  max_chunk_age: 1h
  chunk_target_size: 1048576
  chunk_retain_period: 30s
  max_transfer_retries: 0

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 168h

storage_config:
  boltdb:
    directory: /loki/index

  filesystem:
    directory: /loki/chunks

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h
EOF

        # Create Promtail configuration
        cat > monitoring/promtail/promtail-config.yml << 'EOF'
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: containers
    static_configs:
    - targets:
        - localhost
      labels:
        job: containerlogs
        __path__: /var/log/containers/*log

    pipeline_stages:
    - json:
        expressions:
          output: log
          stream: stream
          attrs:
    - json:
        expressions:
          tag:
        source: attrs
    - regex:
        expression: (?P<container_name>(?:[^|]*))\|
        source: tag
    - timestamp:
        format: RFC3339Nano
        source: time
    - labels:
        stream:
        container_name:
    - output:
        source: output
EOF

        log "✅ Monitoring configuration created"
    else
        log "⚠️ Monitoring setup skipped"
    fi
}

# Backup existing data
backup_existing() {
    if [ "$BACKUP_ENABLED" = "true" ]; then
        log "Creating backup of existing data..."
        
        # Make backup script executable
        chmod +x scripts/backup-database.sh
        
        # Run backup if databases exist
        if docker ps | grep -q postgres; then
            ./scripts/backup-database.sh || log "⚠️ Backup failed, continuing with deployment"
        fi
        
        log "✅ Backup completed"
    else
        log "⚠️ Backup skipped"
    fi
}

# Deploy application
deploy_application() {
    log "Deploying FinAI Nexus application..."
    
    # Stop existing containers
    log "Stopping existing containers..."
    docker-compose -f docker-compose.production.yml down || true
    
    # Pull latest images
    log "Pulling latest images..."
    docker-compose -f docker-compose.production.yml pull
    
    # Build and start services
    log "Building and starting services..."
    docker-compose -f docker-compose.production.yml up --build -d
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 30
    
    # Check service health
    check_service_health
    
    log "✅ Application deployed successfully"
}

# Check service health
check_service_health() {
    log "Checking service health..."
    
    local services=("backend" "frontend" "postgres" "mongodb" "redis")
    local failed_services=()
    
    for service in "${services[@]}"; do
        if docker ps | grep -q "finnexusai-${service}"; then
            log "✅ $service is running"
        else
            log "❌ $service is not running"
            failed_services+=("$service")
        fi
    done
    
    if [ ${#failed_services[@]} -gt 0 ]; then
        log "❌ Some services failed to start: ${failed_services[*]}"
        log "Checking logs..."
        docker-compose -f docker-compose.production.yml logs
        error_exit "Service health check failed"
    fi
    
    # Test API endpoints
    test_api_endpoints
    
    log "✅ All services are healthy"
}

# Test API endpoints
test_api_endpoints() {
    log "Testing API endpoints..."
    
    local base_url="http://localhost:3001"
    local endpoints=("/health" "/api/license-free-launch/health" "/metrics")
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f -s "$base_url$endpoint" > /dev/null; then
            log "✅ $endpoint is responding"
        else
            log "❌ $endpoint is not responding"
        fi
    done
}

# Setup monitoring services
deploy_monitoring() {
    if [ "$MONITORING_ENABLED" = "true" ]; then
        log "Deploying monitoring stack..."
        
        # Deploy monitoring stack
        docker-compose -f docker-compose.monitoring.yml up -d
        
        # Wait for monitoring services
        sleep 20
        
        # Check monitoring services
        local monitoring_services=("prometheus" "grafana" "alertmanager" "loki")
        for service in "${monitoring_services[@]}"; do
            if docker ps | grep -q "finnexus-$service"; then
                log "✅ $service is running"
            else
                log "❌ $service failed to start"
            fi
        done
        
        log "✅ Monitoring stack deployed"
    fi
}

# Setup automated backups
setup_backups() {
    if [ "$BACKUP_ENABLED" = "true" ]; then
        log "Setting up automated backups..."
        
        # Make backup script executable
        chmod +x scripts/backup-database.sh
        
        # Add to crontab
        (crontab -l 2>/dev/null; echo "0 2 * * * /app/scripts/backup-database.sh >> /var/log/finnexus-backup.log 2>&1") | crontab -
        
        log "✅ Automated backups configured"
    fi
}

# Display deployment information
display_info() {
    log "🎉 FinAI Nexus deployment completed successfully!"
    echo ""
    echo "📊 Service URLs:"
    echo "  - API: https://api.finainexus.com"
    echo "  - Frontend: https://app.finainexus.com"
    echo "  - Health Check: http://localhost:3001/health"
    echo "  - Metrics: http://localhost:3001/metrics"
    echo ""
    
    if [ "$MONITORING_ENABLED" = "true" ]; then
        echo "📈 Monitoring URLs:"
        echo "  - Prometheus: http://localhost:9090"
        echo "  - Grafana: http://localhost:3001 (admin/${GRAFANA_PASSWORD:-admin123})"
        echo "  - Alertmanager: http://localhost:9093"
        echo ""
    fi
    
    echo "🔧 Management Commands:"
    echo "  - View logs: docker-compose -f docker-compose.production.yml logs -f"
    echo "  - Restart services: docker-compose -f docker-compose.production.yml restart"
    echo "  - Stop services: docker-compose -f docker-compose.production.yml down"
    echo "  - Backup databases: ./scripts/backup-database.sh"
    echo "  - Restore databases: ./scripts/restore-database.sh -a"
    echo ""
    
    echo "📋 Next Steps:"
    echo "  1. Configure DNS to point to this server"
    echo "  2. Set up SSL certificates (if not done automatically)"
    echo "  3. Configure monitoring alerts"
    echo "  4. Test all functionality"
    echo "  5. Set up regular backups"
    echo ""
    
    echo "✅ Production deployment complete!"
}

# Main deployment function
main() {
    log "🚀 Starting FinAI Nexus production deployment..."
    echo "Environment: $ENVIRONMENT"
    echo "SSL Enabled: $SSL_ENABLED"
    echo "Monitoring Enabled: $MONITORING_ENABLED"
    echo "Backup Enabled: $BACKUP_ENABLED"
    echo ""
    
    # Run deployment steps
    check_prerequisites
    create_directories
    setup_ssl
    setup_monitoring
    backup_existing
    deploy_application
    deploy_monitoring
    setup_backups
    display_info
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "FinAI Nexus Production Deployment Script"
        echo ""
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --no-ssl          Skip SSL setup"
        echo "  --no-monitoring   Skip monitoring setup"
        echo "  --no-backup       Skip backup setup"
        echo "  --staging         Deploy to staging environment"
        echo "  --help, -h        Show this help"
        exit 0
        ;;
    --no-ssl)
        SSL_ENABLED=false
        shift
        ;;
    --no-monitoring)
        MONITORING_ENABLED=false
        shift
        ;;
    --no-backup)
        BACKUP_ENABLED=false
        shift
        ;;
    --staging)
        ENVIRONMENT=staging
        shift
        ;;
esac

# Run main function
main "$@"



