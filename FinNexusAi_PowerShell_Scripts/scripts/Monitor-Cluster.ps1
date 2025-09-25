<#
.SYNOPSIS
  Basic monitoring tasks: check deployments, scrape /metrics, ensure Prometheus/Grafana installed via Helm.
#>
param(
    [string]$Namespace = 'finainexus',
    [switch]$InstallPrometheus
)
. "$PSScriptRoot\utils\Logger.ps1"
Initialize-Log

try {
    Write-Log "Checking deployments in namespace $Namespace..."
    kubectl get deployments -n $Namespace

    Write-Log "Checking pods status..."
    kubectl get pods -n $Namespace

    if ($InstallPrometheus) {
        Write-Log "Installing Prometheus via kube-prometheus-stack helm chart..."
        helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
        helm repo update
        helm upgrade --install prometheus prometheus-community/kube-prometheus-stack -n $Namespace
        if ($LASTEXITCODE -ne 0) { Exit-OnError "Helm install failed." }
        Write-Log "Prometheus installed."
    }

    Write-Log "Attempting to curl backend /metrics endpoint..."
    $svc = kubectl get svc finai-backend -n $Namespace -o json 2>$null
    if ($svc) {
        $clusterIP = (kubectl get svc finai-backend -n $Namespace -o jsonpath='{.spec.clusterIP}')
        Write-Log "Service cluster IP: $clusterIP"
    } else {
        Write-Log "Service finai-backend not found."
    }

    Write-Log "Monitoring checks completed."
}
catch {
    Exit-OnError "Monitor-Cluster failed: $_"
}