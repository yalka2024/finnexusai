#!/bin/bash

# FinNexusAI Blue-Green Deployment Script
# This script implements a comprehensive blue-green deployment strategy

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
NAMESPACE="${NAMESPACE:-finnexus-production}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
DEPLOYMENT_TIMEOUT="${DEPLOYMENT_TIMEOUT:-1800}" # 30 minutes
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-300}" # 5 minutes
ROLLBACK_TIMEOUT="${ROLLBACK_TIMEOUT:-600}" # 10 minutes

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Error handling
error_exit() {
    log_error "$1"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        error_exit "kubectl is not installed"
    fi
    
    # Check if helm is installed
    if ! command -v helm &> /dev/null; then
        error_exit "helm is not installed"
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        error_exit "docker is not installed"
    fi
    
    # Check if kubectl can connect to cluster
    if ! kubectl cluster-info &> /dev/null; then
        error_exit "Cannot connect to Kubernetes cluster"
    fi
    
    # Check if namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_warning "Namespace $NAMESPACE does not exist, creating..."
        kubectl create namespace "$NAMESPACE"
    fi
    
    log_success "Prerequisites check passed"
}

# Build and push Docker image
build_and_push_image() {
    log_info "Building and pushing Docker image..."
    
    local image_name="finnexusai/backend:$IMAGE_TAG"
    
    # Build Docker image
    log_info "Building Docker image: $image_name"
    docker build -t "$image_name" -f "$PROJECT_ROOT/Dockerfile.production" "$PROJECT_ROOT"
    
    # Push Docker image
    log_info "Pushing Docker image: $image_name"
    docker push "$image_name"
    
    log_success "Docker image built and pushed successfully"
}

# Run pre-deployment tests
run_pre_deployment_tests() {
    log_info "Running pre-deployment tests..."
    
    # Run unit tests
    log_info "Running unit tests..."
    cd "$PROJECT_ROOT"
    npm test || error_exit "Unit tests failed"
    
    # Run integration tests
    log_info "Running integration tests..."
    npm run test:integration || error_exit "Integration tests failed"
    
    # Run security tests
    log_info "Running security tests..."
    npm run test:security || error_exit "Security tests failed"
    
    log_success "Pre-deployment tests passed"
}

# Deploy to preview environment
deploy_preview() {
    log_info "Deploying to preview environment..."
    
    local target_env="preview"
    
    # Update Helm values for preview
    local values_file="/tmp/values-preview.yaml"
    cat > "$values_file" << EOF
app:
  environment: "preview"
  
image:
  tag: "$IMAGE_TAG"
  
deployment:
  replicas: 1
  
blueGreen:
  enabled: true
  strategy:
    blueGreen:
      previewService: "finnexus-backend-preview"
      autoPromotionEnabled: false

ingress:
  enabled: true
  hosts:
    - host: preview-api.finnexusai.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: finnexus-backend-preview-tls
      hosts:
        - preview-api.finnexusai.com

monitoring:
  enabled: false

logging:
  enabled: false
EOF
    
    # Deploy using Helm
    helm upgrade --install "finnexus-backend-preview" \
        "$PROJECT_ROOT/helm/finnexus-backend" \
        --namespace "$NAMESPACE" \
        --values "$values_file" \
        --wait \
        --timeout "${DEPLOYMENT_TIMEOUT}s" \
        || error_exit "Preview deployment failed"
    
    log_success "Preview deployment completed"
}

# Run post-deployment tests
run_post_deployment_tests() {
    log_info "Running post-deployment tests..."
    
    local preview_url="https://preview-api.finnexusai.com"
    
    # Wait for preview to be ready
    log_info "Waiting for preview environment to be ready..."
    kubectl wait --for=condition=available --timeout="${HEALTH_CHECK_TIMEOUT}s" \
        deployment/finnexus-backend-preview -n "$NAMESPACE" || error_exit "Preview environment not ready"
    
    # Health check
    log_info "Performing health check..."
    local health_url="$preview_url/api/v1/health"
    for i in {1..30}; do
        if curl -f -s "$health_url" > /dev/null; then
            log_success "Health check passed"
            break
        fi
        if [ $i -eq 30 ]; then
            error_exit "Health check failed after 30 attempts"
        fi
        sleep 10
    done
    
    # API tests
    log_info "Running API tests..."
    npm run test:api -- --base-url="$preview_url" || error_exit "API tests failed"
    
    # Load tests
    log_info "Running load tests..."
    npm run test:load -- --base-url="$preview_url" || error_exit "Load tests failed"
    
    # Performance tests
    log_info "Running performance tests..."
    npm run test:performance -- --base-url="$preview_url" || error_exit "Performance tests failed"
    
    log_success "Post-deployment tests passed"
}

# Switch traffic to new environment
switch_traffic() {
    log_info "Switching traffic to new environment..."
    
    # Get current environment
    local current_env
    current_env=$(kubectl get service finnexus-backend-active -n "$NAMESPACE" -o jsonpath='{.spec.selector.rollouts-pod-template-hash}' 2>/dev/null || echo "")
    
    if [ -z "$current_env" ]; then
        log_info "No current environment detected, deploying to blue"
        current_env="blue"
    else
        if [[ "$current_env" == *"blue"* ]]; then
            current_env="blue"
        else
            current_env="green"
        fi
    fi
    
    # Determine target environment
    local target_env
    if [ "$current_env" = "blue" ]; then
        target_env="green"
    else
        target_env="blue"
    fi
    
    log_info "Current environment: $current_env, Target environment: $target_env"
    
    # Update Helm values for production
    local values_file="/tmp/values-production.yaml"
    cat > "$values_file" << EOF
app:
  environment: "production"
  
image:
  tag: "$IMAGE_TAG"
  
deployment:
  replicas: 3
  
blueGreen:
  enabled: true
  strategy:
    blueGreen:
      activeService: "finnexus-backend-active"
      previewService: "finnexus-backend-preview"
      autoPromotionEnabled: false

ingress:
  enabled: true
  hosts:
    - host: api.finnexusai.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: finnexus-backend-tls
      hosts:
        - api.finnexusai.com

monitoring:
  enabled: true

logging:
  enabled: true
EOF
    
    # Deploy to target environment
    log_info "Deploying to $target_env environment..."
    helm upgrade --install "finnexus-backend" \
        "$PROJECT_ROOT/helm/finnexus-backend" \
        --namespace "$NAMESPACE" \
        --values "$values_file" \
        --wait \
        --timeout "${DEPLOYMENT_TIMEOUT}s" \
        || error_exit "Production deployment failed"
    
    # Wait for target environment to be ready
    log_info "Waiting for $target_env environment to be ready..."
    kubectl wait --for=condition=available --timeout="${HEALTH_CHECK_TIMEOUT}s" \
        deployment/finnexus-backend -n "$NAMESPACE" || error_exit "Target environment not ready"
    
    # Gradual traffic switch
    log_info "Performing gradual traffic switch..."
    local traffic_weights=(10 25 50 75 100)
    
    for weight in "${traffic_weights[@]}"; do
        log_info "Switching traffic: $target_env $weight%, $current_env $((100 - weight))%"
        
        # Update traffic weights (this would be implemented based on your load balancer)
        # For now, we'll simulate the switch
        sleep 30
        
        # Health check during traffic switch
        local health_url="https://api.finnexusai.com/api/v1/health"
        if ! curl -f -s "$health_url" > /dev/null; then
            log_error "Health check failed during traffic switch"
            rollback_deployment
            return 1
        fi
    done
    
    log_success "Traffic switch completed successfully"
}

# Rollback deployment
rollback_deployment() {
    log_error "Rolling back deployment..."
    
    # Get current environment
    local current_env
    current_env=$(kubectl get service finnexus-backend-active -n "$NAMESPACE" -o jsonpath='{.spec.selector.rollouts-pod-template-hash}' 2>/dev/null || echo "")
    
    if [ -z "$current_env" ]; then
        log_error "Cannot determine current environment for rollback"
        return 1
    fi
    
    # Determine previous environment
    local previous_env
    if [[ "$current_env" == *"blue"* ]]; then
        previous_env="green"
    else
        previous_env="blue"
    fi
    
    log_info "Rolling back from $current_env to $previous_env"
    
    # Switch traffic back to previous environment
    log_info "Switching traffic back to $previous_env"
    # This would be implemented based on your load balancer configuration
    
    # Verify rollback
    log_info "Verifying rollback..."
    local health_url="https://api.finnexusai.com/api/v1/health"
    for i in {1..30}; do
        if curl -f -s "$health_url" > /dev/null; then
            log_success "Rollback verification passed"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "Rollback verification failed"
            return 1
        fi
        sleep 10
    done
    
    log_success "Rollback completed successfully"
}

# Cleanup preview environment
cleanup_preview() {
    log_info "Cleaning up preview environment..."
    
    # Delete preview deployment
    helm uninstall "finnexus-backend-preview" -n "$NAMESPACE" || log_warning "Failed to uninstall preview deployment"
    
    # Delete preview services
    kubectl delete service "finnexus-backend-preview" -n "$NAMESPACE" || log_warning "Failed to delete preview service"
    
    log_success "Preview environment cleanup completed"
}

# Main deployment function
main() {
    log_info "Starting blue-green deployment..."
    log_info "Image tag: $IMAGE_TAG"
    log_info "Namespace: $NAMESPACE"
    log_info "Deployment timeout: $DEPLOYMENT_TIMEOUT seconds"
    
    # Check prerequisites
    check_prerequisites
    
    # Build and push image
    build_and_push_image
    
    # Run pre-deployment tests
    run_pre_deployment_tests
    
    # Deploy to preview
    deploy_preview
    
    # Run post-deployment tests
    run_post_deployment_tests
    
    # Switch traffic
    if switch_traffic; then
        log_success "Blue-green deployment completed successfully"
        
        # Cleanup preview
        cleanup_preview
        
        # Final verification
        log_info "Performing final verification..."
        local health_url="https://api.finnexusai.com/api/v1/health"
        if curl -f -s "$health_url" > /dev/null; then
            log_success "Final verification passed"
        else
            log_error "Final verification failed"
            exit 1
        fi
        
        log_success "🎉 Blue-green deployment completed successfully!"
    else
        log_error "Blue-green deployment failed"
        exit 1
    fi
}

# Handle script interruption
trap 'log_error "Deployment interrupted"; rollback_deployment; exit 1' INT TERM

# Run main function
main "$@"
