<#
.SYNOPSIS
  Deploy manifests to Kubernetes with readiness checks.
#>
param(
    [string]$Namespace = 'finainexus',
    [string]$KubeContext
)
. "$PSScriptRoot\config.psd1"
. "$PSScriptRoot\utils\Logger.ps1"
Initialize-Log

if ($KubeContext) {
    & kubectl config use-context $KubeContext
    if ($LASTEXITCODE -ne 0) { Exit-OnError "Failed to switch kubecontext to $KubeContext" }
}

try {
    Write-Log "Ensuring namespace $Namespace exists..."
    $ns = kubectl get namespace $Namespace --ignore-not-found
    if (-not $ns) {
        kubectl create namespace $Namespace
        if ($LASTEXITCODE -ne 0) { Exit-OnError "Failed to create namespace $Namespace" }
    } else {
        Write-Log "Namespace exists."
    }

    $manifests = @( "$PSScriptRoot\..\k8s\namespace.yml", "$PSScriptRoot\..\k8s\postgres-deployment.yml", "$PSScriptRoot\..\k8s\backend-deployment.yml" )
    foreach ($m in $manifests) {
        if (-not (Test-Path $m)) { Write-Log "Manifest not found: $m" ; continue }
        Write-Log "Applying $m..."
        kubectl apply -f $m -n $Namespace
        if ($LASTEXITCODE -ne 0) { Exit-OnError "kubectl apply failed for $m" }
    }

    # Wait for backend deployment to become ready
    Write-Log "Waiting for backend rollout..."
    kubectl rollout status deployment/finai-backend -n $Namespace --timeout=120s
    if ($LASTEXITCODE -ne 0) { Exit-OnError "Backend rollout failed or timed out." }

    Write-Log "Kubernetes deployment successful."
}
catch {
    Exit-OnError "Deploy-K8s failed: $_"
}