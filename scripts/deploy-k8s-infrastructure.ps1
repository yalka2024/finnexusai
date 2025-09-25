#Requires -Version 7.0

<#
.SYNOPSIS
    Deploys the complete Kubernetes infrastructure for FinNexus AI platform.

.DESCRIPTION
    This script deploys all Kubernetes resources including:
    - Namespaces and cluster configuration
    - Backend and frontend deployments with HPA
    - Ingress configuration with TLS
    - Secrets management
    - Persistent storage
    - Monitoring and observability
    - Security hardening (RBAC, Network Policies)
    - Pod Security Policies

.PARAMETER Environment
    The deployment environment (dev, staging, production)

.PARAMETER SkipSecrets
    Skip secret creation (useful for dry runs)

.EXAMPLE
    .\deploy-k8s-infrastructure.ps1 -Environment production
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "staging", "production")]
    [string]$Environment,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipSecrets,
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Configuration
$K8sDir = "k8s"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$K8sPath = Join-Path $ProjectRoot $K8sDir

# Colors for output
$Colors = @{
    Success = "Green"
    Warning = "Yellow"
    Error = "Red"
    Info = "Cyan"
}

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Colors[$Color]
}

function Test-KubectlConnection {
    Write-ColorOutput "🔍 Testing kubectl connection..." -Color Info
    
    try {
        $context = kubectl config current-context 2>$null
        if ($LASTEXITCODE -ne 0) {
            throw "kubectl is not configured or cluster is not accessible"
        }
        Write-ColorOutput "✅ Connected to cluster: $context" -Color Success
        return $true
    }
    catch {
        Write-ColorOutput "❌ Failed to connect to Kubernetes cluster: $($_.Exception.Message)" -Color Error
        return $false
    }
}

function Deploy-K8sResources {
    param(
        [string]$ResourceType,
        [string]$FilePath
    )
    
    Write-ColorOutput "🚀 Deploying $ResourceType..." -Color Info
    
    if ($DryRun) {
        Write-ColorOutput "🔍 DRY RUN: Would apply $FilePath" -Color Warning
        kubectl apply --dry-run=client -f $FilePath
    } else {
        try {
            kubectl apply -f $FilePath
            if ($LASTEXITCODE -eq 0) {
                Write-ColorOutput "✅ $ResourceType deployed successfully" -Color Success
            } else {
                throw "kubectl apply failed with exit code $LASTEXITCODE"
            }
        }
        catch {
            Write-ColorOutput "❌ Failed to deploy $ResourceType : $($_.Exception.Message)" -Color Error
            throw
        }
    }
}

function Wait-ForDeployment {
    param(
        [string]$Namespace,
        [string]$DeploymentName,
        [int]$TimeoutMinutes = 10
    )
    
    if ($DryRun) {
        Write-ColorOutput "🔍 DRY RUN: Would wait for deployment $DeploymentName" -Color Warning
        return
    }
    
    Write-ColorOutput "⏳ Waiting for deployment $DeploymentName to be ready..." -Color Info
    
    try {
        kubectl wait --for=condition=available --timeout=${TimeoutMinutes}m deployment/$DeploymentName -n $Namespace
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ Deployment $DeploymentName is ready" -Color Success
        } else {
            throw "Deployment $DeploymentName failed to become ready within $TimeoutMinutes minutes"
        }
    }
    catch {
        Write-ColorOutput "❌ Timeout waiting for deployment $DeploymentName" -Color Error
        throw
    }
}

function Show-DeploymentStatus {
    Write-ColorOutput "`n📊 Deployment Status:" -Color Info
    
    $namespaces = @("finnexus-ai", "finnexus-monitoring", "finnexus-security", "finnexus-ingress", "finnexus-storage")
    
    foreach ($ns in $namespaces) {
        Write-ColorOutput "`n--- Namespace: $ns ---" -Color Info
        kubectl get pods,svc,ingress -n $ns 2>$null | Format-Table -AutoSize
    }
    
    Write-ColorOutput "`n--- Cluster-wide Resources ---" -Color Info
    kubectl get nodes,hpa,pvc -A | Format-Table -AutoSize
}

function Show-ResourceUsage {
    Write-ColorOutput "`n📈 Resource Usage:" -Color Info
    kubectl top nodes 2>$null | Format-Table -AutoSize
    kubectl top pods -A 2>$null | Format-Table -AutoSize
}

# Main execution
Write-ColorOutput "🚀 Starting FinNexus AI Kubernetes Infrastructure Deployment" -Color Info
Write-ColorOutput "Environment: $Environment" -Color Info
Write-ColorOutput "Dry Run: $DryRun" -Color Info

# Check prerequisites
if (-not (Test-KubectlConnection)) {
    exit 1
}

# Validate k8s directory exists
if (-not (Test-Path $K8sPath)) {
    Write-ColorOutput "❌ Kubernetes configuration directory not found: $K8sPath" -Color Error
    exit 1
}

# Deploy resources in order
try {
    Write-ColorOutput "`n📋 Phase 1: Cluster Configuration" -Color Info
    Deploy-K8sResources "Cluster Configuration" (Join-Path $K8sPath "cluster-config.yaml")
    
    Write-ColorOutput "`n🔐 Phase 2: Secrets Management" -Color Info
    if (-not $SkipSecrets) {
        Deploy-K8sResources "Secrets Configuration" (Join-Path $K8sPath "secrets-config.yaml")
    } else {
        Write-ColorOutput "⚠️ Skipping secrets deployment" -Color Warning
    }
    
    Write-ColorOutput "`n💾 Phase 3: Persistent Storage" -Color Info
    Deploy-K8sResources "Storage Configuration" (Join-Path $K8sPath "storage-config.yaml")
    
    Write-ColorOutput "`n🛡️ Phase 4: Security Hardening" -Color Info
    Deploy-K8sResources "Security Configuration" (Join-Path $K8sPath "security-config.yaml")
    
    Write-ColorOutput "`n🚀 Phase 5: Application Deployments" -Color Info
    Deploy-K8sResources "Backend Deployment" (Join-Path $K8sPath "backend-deployment.yaml")
    Deploy-K8sResources "Frontend Deployment" (Join-Path $K8sPath "frontend-deployment.yaml")
    
    Write-ColorOutput "`n📊 Phase 6: Auto-scaling Configuration" -Color Info
    Deploy-K8sResources "HPA Configuration" (Join-Path $K8sPath "hpa-config.yaml")
    
    Write-ColorOutput "`n🌐 Phase 7: Ingress and TLS" -Color Info
    Deploy-K8sResources "Ingress Configuration" (Join-Path $K8sPath "ingress-config.yaml")
    
    Write-ColorOutput "`n📈 Phase 8: Monitoring and Observability" -Color Info
    Deploy-K8sResources "Monitoring Configuration" (Join-Path $K8sPath "monitoring-config.yaml")
    
    # Wait for deployments to be ready (only if not dry run)
    if (-not $DryRun) {
        Write-ColorOutput "`n⏳ Waiting for deployments to be ready..." -Color Info
        Wait-ForDeployment "finnexus-ai" "finnexus-backend"
        Wait-ForDeployment "finnexus-ai" "finnexus-frontend"
        Wait-ForDeployment "finnexus-monitoring" "prometheus"
    }
    
    Write-ColorOutput "`n🎉 Deployment completed successfully!" -Color Success
    
    # Show status
    Show-DeploymentStatus
    Show-ResourceUsage
    
    Write-ColorOutput "`n🔗 Access URLs:" -Color Info
    Write-ColorOutput "Frontend: https://finnexusai.com" -Color Success
    Write-ColorOutput "API: https://api.finnexusai.com" -Color Success
    Write-ColorOutput "Monitoring: https://monitoring.finnexusai.com" -Color Success
    
}
catch {
    Write-ColorOutput "`n❌ Deployment failed: $($_.Exception.Message)" -Color Error
    Write-ColorOutput "Stack trace: $($_.ScriptStackTrace)" -Color Error
    exit 1
}

Write-ColorOutput "`n✅ FinNexus AI platform is now deployed and ready!" -Color Success
