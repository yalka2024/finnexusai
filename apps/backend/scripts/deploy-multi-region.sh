#!/bin/bash

# deploy-multi-region.sh
# Multi-region deployment script for FinNexusAI Backend

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
K8S_DIR="$PROJECT_ROOT/k8s"
HELM_DIR="$PROJECT_ROOT/helm"

# Default values
IMAGE_TAG="${1:-latest}"
DEPLOYMENT_STRATEGY="${2:-rolling}" # rolling, blue-green, canary
REGIONS="${3:-us-east-1,us-west-2,eu-west-1,ap-southeast-1}"
NAMESPACE="${NAMESPACE:-finnexus}"
KUBECONFIG_PATH="${KUBECONFIG_PATH:-$HOME/.kube/config}"
DRY_RUN="${DRY_RUN:-false}"
VERIFY_DEPLOYMENT="${VERIFY_DEPLOYMENT:-true}"
ROLLBACK_ON_FAILURE="${ROLLBACK_ON_FAILURE:-true}"

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

# Parse regions
IFS=',' read -ra REGION_ARRAY <<< "$REGIONS"

echo "🚀 Starting Multi-Region Deployment for FinNexusAI Backend"
echo "=========================================================="
echo "Image Tag: ${IMAGE_TAG}"
echo "Deployment Strategy: ${DEPLOYMENT_STRATEGY}"
echo "Regions: ${REGIONS}"
echo "Namespace: ${NAMESPACE}"
echo "Kubeconfig: ${KUBECONFIG_PATH}"
echo "Dry Run: ${DRY_RUN}"
echo "=========================================================="

# Validate prerequisites
validate_prerequisites() {
    log_info "Validating prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install it."
        exit 1
    fi
    
    # Check if helm is installed
    if ! command -v helm &> /dev/null; then
        log_error "helm is not installed. Please install it."
        exit 1
    fi
    
    # Check if kubeconfig exists
    if [[ ! -f "$KUBECONFIG_PATH" ]]; then
        log_error "Kubeconfig file not found at: $KUBECONFIG_PATH"
        exit 1
    fi
    
    log_success "Prerequisites validated successfully"
}

# Check cluster connectivity
check_cluster_connectivity() {
    local region=$1
    log_info "Checking connectivity to cluster in region: $region"
    
    # Set region-specific kubeconfig
    local region_kubeconfig="${KUBECONFIG_PATH}-${region}"
    
    if [[ ! -f "$region_kubeconfig" ]]; then
        log_warning "Region-specific kubeconfig not found: $region_kubeconfig"
        log_info "Using default kubeconfig for region: $region"
        region_kubeconfig="$KUBECONFIG_PATH"
    fi
    
    # Test cluster connectivity
    if ! kubectl --kubeconfig "$region_kubeconfig" cluster-info &> /dev/null; then
        log_error "Cannot connect to cluster in region: $region"
        return 1
    fi
    
    log_success "Connected to cluster in region: $region"
    return 0
}

# Deploy to single region
deploy_to_region() {
    local region=$1
    local region_kubeconfig="${KUBECONFIG_PATH}-${region}"
    
    log_info "Deploying to region: $region"
    
    # Use default kubeconfig if region-specific not found
    if [[ ! -f "$region_kubeconfig" ]]; then
        region_kubeconfig="$KUBECONFIG_PATH"
    fi
    
    # Set region-specific environment variables
    export REGION="$region"
    export PRIMARY_REGION="false"
    
    # Set primary region flag for us-east-1
    if [[ "$region" == "us-east-1" ]]; then
        export PRIMARY_REGION="true"
    fi
    
    # Deploy using Helm
    local helm_args=(
        "upgrade" "--install" "finnexus-backend-${region}"
        "${HELM_DIR}/finnexus-backend"
        "--namespace" "$NAMESPACE"
        "--kubeconfig" "$region_kubeconfig"
        "--set" "image.tag=${IMAGE_TAG}"
        "--set" "region=${region}"
        "--set" "primaryRegion=${PRIMARY_REGION}"
        "--set" "multiRegion.enabled=true"
        "--set" "multiRegion.regions={${REGIONS}}"
        "--set" "ingress.host=api-${region}.finnexusai.com"
        "--atomic"
        "--timeout" "10m"
    )
    
    if [[ "$DRY_RUN" == "true" ]]; then
        helm_args+=("--dry-run")
    fi
    
    if [[ "$VERIFY_DEPLOYMENT" == "true" ]]; then
        helm_args+=("--wait")
    fi
    
    # Execute deployment
    if helm "${helm_args[@]}"; then
        log_success "Deployment to region $region completed successfully"
        return 0
    else
        log_error "Deployment to region $region failed"
        return 1
    fi
}

# Verify deployment in region
verify_deployment() {
    local region=$1
    local region_kubeconfig="${KUBECONFIG_PATH}-${region}"
    
    log_info "Verifying deployment in region: $region"
    
    # Use default kubeconfig if region-specific not found
    if [[ ! -f "$region_kubeconfig" ]]; then
        region_kubeconfig="$KUBECONFIG_PATH"
    fi
    
    # Check if pods are running
    local pod_status
    pod_status=$(kubectl --kubeconfig "$region_kubeconfig" get pods -n "$NAMESPACE" -l app.kubernetes.io/name=finnexus-backend -o jsonpath='{.items[*].status.phase}')
    
    if [[ "$pod_status" == *"Running"* ]]; then
        log_success "Pods are running in region: $region"
    else
        log_error "Pods are not running in region: $region"
        return 1
    fi
    
    # Check service endpoints
    local service_endpoints
    service_endpoints=$(kubectl --kubeconfig "$region_kubeconfig" get endpoints -n "$NAMESPACE" -l app.kubernetes.io/name=finnexus-backend -o jsonpath='{.items[*].subsets[*].addresses[*].ip}')
    
    if [[ -n "$service_endpoints" ]]; then
        log_success "Service endpoints are available in region: $region"
    else
        log_error "Service endpoints are not available in region: $region"
        return 1
    fi
    
    # Health check
    local health_url="https://api-${region}.finnexusai.com/api/v1/health"
    log_info "Performing health check: $health_url"
    
    if curl -sf "$health_url" > /dev/null; then
        log_success "Health check passed for region: $region"
    else
        log_warning "Health check failed for region: $region"
        return 1
    fi
    
    return 0
}

# Rollback deployment in region
rollback_deployment() {
    local region=$1
    local region_kubeconfig="${KUBECONFIG_PATH}-${region}"
    
    log_info "Rolling back deployment in region: $region"
    
    # Use default kubeconfig if region-specific not found
    if [[ ! -f "$region_kubeconfig" ]]; then
        region_kubeconfig="$KUBECONFIG_PATH"
    fi
    
    # Rollback using Helm
    if helm rollback "finnexus-backend-${region}" -n "$NAMESPACE" --kubeconfig "$region_kubeconfig"; then
        log_success "Rollback completed for region: $region"
        return 0
    else
        log_error "Rollback failed for region: $region"
        return 1
    fi
}

# Deploy global load balancer
deploy_global_load_balancer() {
    log_info "Deploying global load balancer..."
    
    local region_kubeconfig="${KUBECONFIG_PATH}-us-east-1"
    if [[ ! -f "$region_kubeconfig" ]]; then
        region_kubeconfig="$KUBECONFIG_PATH"
    fi
    
    # Apply global load balancer configuration
    if kubectl --kubeconfig "$region_kubeconfig" apply -f "${K8S_DIR}/multi-region/global-load-balancer.yaml"; then
        log_success "Global load balancer deployed successfully"
    else
        log_error "Global load balancer deployment failed"
        return 1
    fi
    
    # Wait for load balancer to be ready
    log_info "Waiting for global load balancer to be ready..."
    kubectl --kubeconfig "$region_kubeconfig" wait --for=condition=ready pod -l app=global-load-balancer -n "$NAMESPACE" --timeout=300s
    
    return 0
}

# Main deployment function
main() {
    local failed_regions=()
    local successful_regions=()
    
    # Validate prerequisites
    validate_prerequisites
    
    # Deploy to each region
    for region in "${REGION_ARRAY[@]}"; do
        log_info "Processing region: $region"
        
        # Check cluster connectivity
        if ! check_cluster_connectivity "$region"; then
            log_error "Cannot connect to cluster in region: $region"
            failed_regions+=("$region")
            continue
        fi
        
        # Deploy to region
        if deploy_to_region "$region"; then
            successful_regions+=("$region")
            
            # Verify deployment if enabled
            if [[ "$VERIFY_DEPLOYMENT" == "true" ]]; then
                if ! verify_deployment "$region"; then
                    log_error "Deployment verification failed for region: $region"
                    
                    # Rollback if enabled
                    if [[ "$ROLLBACK_ON_FAILURE" == "true" ]]; then
                        rollback_deployment "$region"
                    fi
                    
                    failed_regions+=("$region")
                fi
            fi
        else
            failed_regions+=("$region")
        fi
    done
    
    # Deploy global load balancer if at least one region succeeded
    if [[ ${#successful_regions[@]} -gt 0 ]]; then
        if deploy_global_load_balancer; then
            log_success "Global load balancer deployed successfully"
        else
            log_warning "Global load balancer deployment failed"
        fi
    fi
    
    # Summary
    echo ""
    echo "📊 Deployment Summary"
    echo "===================="
    echo "Successful regions: ${#successful_regions[@]}"
    for region in "${successful_regions[@]}"; do
        echo "  ✅ $region"
    done
    
    echo "Failed regions: ${#failed_regions[@]}"
    for region in "${failed_regions[@]}"; do
        echo "  ❌ $region"
    done
    
    # Exit with appropriate code
    if [[ ${#failed_regions[@]} -eq 0 ]]; then
        log_success "Multi-region deployment completed successfully"
        exit 0
    else
        log_error "Multi-region deployment completed with failures"
        exit 1
    fi
}

# Cleanup function
cleanup() {
    log_info "Cleaning up..."
    # Add cleanup logic here if needed
}

# Set trap for cleanup
trap cleanup EXIT

# Run main function
main "$@"
