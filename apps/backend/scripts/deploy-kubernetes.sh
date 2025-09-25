#!/bin/bash

# FinNexusAI Kubernetes Deployment Script
# This script deploys the FinNexusAI backend to Kubernetes with comprehensive configuration

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
NAMESPACE="${NAMESPACE:-finnexus-production}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
DEPLOYMENT_TIMEOUT="${DEPLOYMENT_TIMEOUT:-600}" # 10 minutes
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-300}" # 5 minutes

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

# Deploy using Helm
deploy_with_helm() {
    log_info "Deploying with Helm..."
    
    # Update Helm dependencies
    log_info "Updating Helm dependencies..."
    helm dependency update "$PROJECT_ROOT/helm/finnexus-backend"
    
    # Deploy using Helm
    log_info "Deploying FinNexusAI backend..."
    helm upgrade --install "finnexus-backend" \
        "$PROJECT_ROOT/helm/finnexus-backend" \
        --namespace "$NAMESPACE" \
        --set image.tag="$IMAGE_TAG" \
        --set app.environment="production" \
        --set app.namespace="$NAMESPACE" \
        --wait \
        --timeout "${DEPLOYMENT_TIMEOUT}s" \
        || error_exit "Helm deployment failed"
    
    log_success "Helm deployment completed"
}

# Deploy using kubectl
deploy_with_kubectl() {
    log_info "Deploying with kubectl..."
    
    # Apply manifests
    log_info "Applying Kubernetes manifests..."
    kubectl apply -f "$PROJECT_ROOT/k8s/production/" -n "$NAMESPACE" || error_exit "kubectl deployment failed"
    
    # Wait for deployment
    log_info "Waiting for deployment to be ready..."
    kubectl wait --for=condition=available --timeout="${DEPLOYMENT_TIMEOUT}s" \
        deployment/finnexus-backend -n "$NAMESPACE" || error_exit "Deployment not ready"
    
    log_success "kubectl deployment completed"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check deployment status
    log_info "Checking deployment status..."
    kubectl get deployment finnexus-backend -n "$NAMESPACE" -o wide
    
    # Check pod status
    log_info "Checking pod status..."
    kubectl get pods -l app=finnexus-backend -n "$NAMESPACE" -o wide
    
    # Check service status
    log_info "Checking service status..."
    kubectl get services -l app=finnexus-backend -n "$NAMESPACE" -o wide
    
    # Check ingress status
    log_info "Checking ingress status..."
    kubectl get ingress -l app=finnexus-backend -n "$NAMESPACE" -o wide
    
    # Health check
    log_info "Performing health check..."
    local health_url="https://api.finnexusai.com/api/v1/health"
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
    
    log_success "Deployment verification completed"
}

# Main deployment function
main() {
    log_info "Starting Kubernetes deployment..."
    log_info "Image tag: $IMAGE_TAG"
    log_info "Namespace: $NAMESPACE"
    log_info "Deployment timeout: $DEPLOYMENT_TIMEOUT seconds"
    
    # Check prerequisites
    check_prerequisites
    
    # Deploy using Helm (preferred) or kubectl
    if [ "${USE_HELM:-true}" = "true" ]; then
        deploy_with_helm
    else
        deploy_with_kubectl
    fi
    
    # Verify deployment
    verify_deployment
    
    log_success "🎉 Kubernetes deployment completed successfully!"
}

# Handle script interruption
trap 'log_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"
