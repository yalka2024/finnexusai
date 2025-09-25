param(
    [string]$Environment = "production",
    [switch]$DryRun
)

Write-Host "🚀 Starting FinNexus AI Kubernetes Infrastructure Deployment" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Cyan
Write-Host "Dry Run: $DryRun" -ForegroundColor Cyan

# Check if kubectl is available
try {
    $context = kubectl config current-context 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "kubectl is not configured or cluster is not accessible"
    }
    Write-Host "✅ Connected to cluster: $context" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to connect to Kubernetes cluster: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please ensure kubectl is installed and configured" -ForegroundColor Yellow
    exit 1
}

# Deploy resources
$k8sFiles = @(
    "k8s/cluster-config.yaml",
    "k8s/backend-deployment.yaml", 
    "k8s/frontend-deployment.yaml",
    "k8s/hpa-config.yaml",
    "k8s/ingress-config.yaml",
    "k8s/secrets-config.yaml",
    "k8s/storage-config.yaml",
    "k8s/monitoring-config.yaml",
    "k8s/security-config.yaml"
)

foreach ($file in $k8sFiles) {
    if (Test-Path $file) {
        Write-Host "🚀 Deploying $file..." -ForegroundColor Cyan
        
        if ($DryRun) {
            Write-Host "🔍 DRY RUN: Would apply $file" -ForegroundColor Yellow
            kubectl apply --dry-run=client -f $file
        } else {
            try {
                kubectl apply -f $file
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "✅ $file deployed successfully" -ForegroundColor Green
                } else {
                    Write-Host "❌ Failed to deploy $file" -ForegroundColor Red
                }
            }
            catch {
                Write-Host "❌ Error deploying $file : $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "⚠️ File not found: $file" -ForegroundColor Yellow
    }
}

if (-not $DryRun) {
    Write-Host "`n⏳ Waiting for deployments to be ready..." -ForegroundColor Cyan
    
    # Wait for deployments
    kubectl rollout status deployment/finnexus-backend -n finnexus-ai --timeout=300s
    kubectl rollout status deployment/finnexus-frontend -n finnexus-ai --timeout=300s
    
    Write-Host "`n📊 Deployment Status:" -ForegroundColor Cyan
    kubectl get pods,svc,ingress -n finnexus-ai
}

Write-Host "`n🎉 Deployment completed!" -ForegroundColor Green
Write-Host "🔗 Access URLs:" -ForegroundColor Cyan
Write-Host "   Frontend: https://finnexusai.com" -ForegroundColor Green
Write-Host "   API: https://api.finnexusai.com" -ForegroundColor Green
