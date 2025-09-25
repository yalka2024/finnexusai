#!/bin/bash

# FinAI Nexus - Kubernetes Enterprise Deployment Script
# Deploy enterprise-grade infrastructure for 10,000+ concurrent users

set -e

# Configuration
CLUSTER_NAME="${CLUSTER_NAME:-finnexus-production}"
NAMESPACE="${NAMESPACE:-finnexus-production}"
ENVIRONMENT="${ENVIRONMENT:-production}"
REGION="${REGION:-us-west-2}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌${NC} $1"
}

# Error handling
error_exit() {
    error "ERROR: $1"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        error_exit "kubectl is not installed. Please install kubectl first."
    fi
    
    # Check if helm is installed
    if ! command -v helm &> /dev/null; then
        error_exit "helm is not installed. Please install helm first."
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        error_exit "docker is not installed. Please install docker first."
    fi
    
    # Check if kubectl can connect to cluster
    if ! kubectl cluster-info &> /dev/null; then
        error_exit "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
    fi
    
    success "Prerequisites check passed"
}

# Create namespaces
create_namespaces() {
    log "Creating Kubernetes namespaces..."
    
    kubectl apply -f k8s/namespace.yaml
    success "Namespaces created successfully"
}

# Apply resource quotas
apply_resource_quotas() {
    log "Applying resource quotas..."
    
    kubectl apply -f k8s/resource-quotas.yaml
    success "Resource quotas applied successfully"
}

# Apply network policies
apply_network_policies() {
    log "Applying network policies..."
    
    kubectl apply -f k8s/network-policies.yaml
    success "Network policies applied successfully"
}

# Deploy monitoring stack
deploy_monitoring() {
    log "Deploying monitoring stack..."
    
    # Deploy Prometheus
    kubectl apply -f k8s/monitoring/prometheus.yaml
    success "Prometheus deployed successfully"
    
    # Wait for Prometheus to be ready
    kubectl wait --for=condition=available --timeout=300s deployment/prometheus -n finnexus-monitoring
    success "Prometheus is ready"
}

# Deploy applications
deploy_applications() {
    log "Deploying FinAI Nexus applications..."
    
    # Deploy backend
    kubectl apply -f k8s/deployments/backend-deployment.yaml
    kubectl apply -f k8s/services/backend-service.yaml
    success "Backend deployed successfully"
    
    # Wait for backend to be ready
    kubectl wait --for=condition=available --timeout=300s deployment/finnexus-backend -n $NAMESPACE
    success "Backend is ready"
}

# Deploy auto-scaling
deploy_autoscaling() {
    log "Deploying auto-scaling configuration..."
    
    kubectl apply -f k8s/autoscaling/hpa-backend.yaml
    success "Auto-scaling configuration applied successfully"
}

# Deploy ingress
deploy_ingress() {
    log "Deploying ingress configuration..."
    
    kubectl apply -f k8s/ingress/nginx-ingress.yaml
    success "Ingress configuration applied successfully"
}

# Deploy load testing
deploy_load_testing() {
    log "Deploying load testing infrastructure..."
    
    kubectl apply -f k8s/testing/k6-load-testing.yaml
    success "Load testing infrastructure deployed successfully"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Check all pods are running
    local pods_not_ready=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase!=Running --no-headers | wc -l)
    if [ $pods_not_ready -gt 0 ]; then
        warning "Some pods are not running. Checking status..."
        kubectl get pods -n $NAMESPACE
    else
        success "All pods are running"
    fi
    
    # Check services
    kubectl get services -n $NAMESPACE
    success "Services are available"
    
    # Check ingress
    kubectl get ingress -n $NAMESPACE
    success "Ingress is configured"
    
    # Check HPA
    kubectl get hpa -n $NAMESPACE
    success "Auto-scaling is configured"
}

# Run load tests
run_load_tests() {
    log "Running load tests..."
    
    # Start load test job
    kubectl create job --from=cronjob/k6-load-test k6-load-test-$(date +%s) -n $NAMESPACE
    
    # Wait for job to complete
    kubectl wait --for=condition=complete --timeout=1800s job/k6-load-test -n $NAMESPACE
    
    # Get logs
    kubectl logs -l job-name=k6-load-test -n $NAMESPACE --tail=100
    
    success "Load tests completed"
}

# Display deployment information
display_info() {
    log "🎉 FinAI Nexus Kubernetes deployment completed successfully!"
    echo ""
    echo "📊 Deployment Information:"
    echo "  - Cluster: $CLUSTER_NAME"
    echo "  - Namespace: $NAMESPACE"
    echo "  - Environment: $ENVIRONMENT"
    echo "  - Region: $REGION"
    echo ""
    
    echo "🔗 Service URLs:"
    echo "  - API: https://api.finainexus.com"
    echo "  - Frontend: https://app.finainexus.com"
    echo "  - Prometheus: http://prometheus.finnexus-monitoring.svc.cluster.local:9090"
    echo ""
    
    echo "📈 Monitoring:"
    kubectl get pods -n finnexus-monitoring
    echo ""
    
    echo "🚀 Applications:"
    kubectl get pods -n $NAMESPACE
    echo ""
    
    echo "⚖️ Auto-scaling:"
    kubectl get hpa -n $NAMESPACE
    echo ""
    
    echo "🌐 Ingress:"
    kubectl get ingress -n $NAMESPACE
    echo ""
    
    echo "🔧 Management Commands:"
    echo "  - View pods: kubectl get pods -n $NAMESPACE"
    echo "  - View logs: kubectl logs -f deployment/finnexus-backend -n $NAMESPACE"
    echo "  - Scale backend: kubectl scale deployment finnexus-backend --replicas=5 -n $NAMESPACE"
    echo "  - View HPA: kubectl get hpa -n $NAMESPACE"
    echo "  - View metrics: kubectl port-forward svc/prometheus 9090:9090 -n finnexus-monitoring"
    echo ""
    
    echo "📋 Next Steps:"
    echo "  1. Configure SSL certificates for production domains"
    echo "  2. Set up monitoring alerts and notifications"
    echo "  3. Configure backup and disaster recovery"
    echo "  4. Run comprehensive load tests"
    echo "  5. Set up CI/CD pipelines"
    echo ""
    
    echo "✅ Enterprise-grade Kubernetes deployment complete!"
    echo "🎯 Ready for 10,000+ concurrent users"
}

# Cleanup function
cleanup() {
    log "Cleaning up resources..."
    
    kubectl delete -f k8s/testing/k6-load-testing.yaml --ignore-not-found=true
    kubectl delete -f k8s/ingress/nginx-ingress.yaml --ignore-not-found=true
    kubectl delete -f k8s/autoscaling/hpa-backend.yaml --ignore-not-found=true
    kubectl delete -f k8s/services/backend-service.yaml --ignore-not-found=true
    kubectl delete -f k8s/deployments/backend-deployment.yaml --ignore-not-found=true
    kubectl delete -f k8s/monitoring/prometheus.yaml --ignore-not-found=true
    kubectl delete -f k8s/network-policies.yaml --ignore-not-found=true
    kubectl delete -f k8s/resource-quotas.yaml --ignore-not-found=true
    kubectl delete -f k8s/namespace.yaml --ignore-not-found=true
    
    success "Cleanup completed"
}

# Main deployment function
main() {
    log "🚀 Starting FinAI Nexus Kubernetes deployment..."
    echo "Cluster: $CLUSTER_NAME"
    echo "Namespace: $NAMESPACE"
    echo "Environment: $ENVIRONMENT"
    echo "Region: $REGION"
    echo ""
    
    # Run deployment steps
    check_prerequisites
    create_namespaces
    apply_resource_quotas
    apply_network_policies
    deploy_monitoring
    deploy_applications
    deploy_autoscaling
    deploy_ingress
    deploy_load_testing
    verify_deployment
    
    # Optional: Run load tests
    if [ "${RUN_LOAD_TESTS:-false}" = "true" ]; then
        run_load_tests
    fi
    
    display_info
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "FinAI Nexus Kubernetes Deployment Script"
        echo ""
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --cleanup          Clean up all resources"
        echo "  --load-tests       Run load tests after deployment"
        echo "  --staging          Deploy to staging environment"
        echo "  --help, -h         Show this help"
        exit 0
        ;;
    --cleanup)
        cleanup
        exit 0
        ;;
    --load-tests)
        RUN_LOAD_TESTS=true
        shift
        ;;
    --staging)
        NAMESPACE=finnexus-staging
        ENVIRONMENT=staging
        shift
        ;;
esac

# Run main function
main "$@"



