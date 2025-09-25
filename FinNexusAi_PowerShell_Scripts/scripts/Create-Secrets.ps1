<#
.SYNOPSIS
  Create or update Kubernetes secrets from env or prompt.
#>
param(
    [string]$Namespace = 'finainexus',
    [string]$XApiKey,
    [string]$DbPassword,
    [string]$StripeSecret
)
. "$PSScriptRoot\config.psd1"
. "$PSScriptRoot\utils\Logger.ps1"
Initialize-Log

function Read-SecretIfBlank([string]$val, [string]$prompt) {
    if ($val) { return $val }
    return Read-Host -AsSecureString $prompt | ConvertFrom-SecureString
}

try {
    if (-not (kubectl get namespace $Namespace --ignore-not-found)) {
        Write-Log "Namespace $Namespace does not exist; creating..."
        kubectl create namespace $Namespace
    }

    if (-not $XApiKey) {
        $secure = Read-Host "Enter X_API_KEY (input hidden)" -AsSecureString
        $XApiKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
    }
    if (-not $DbPassword) {
        $secure = Read-Host "Enter DB password (input hidden)" -AsSecureString
        $DbPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
    }
    if (-not $StripeSecret) {
        $secure = Read-Host "Enter Stripe secret (input hidden)" -AsSecureString
        $StripeSecret = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
    }

    kubectl delete secret finai-secrets -n $Namespace --ignore-not-found
    kubectl create secret generic finai-secrets `
        --from-literal=x-api-key="$XApiKey" `
        --from-literal=db-password="$DbPassword" `
        --from-literal=stripe-secret="$StripeSecret" -n $Namespace

    Write-Log "Secrets created/updated in namespace $Namespace."
}
catch {
    Exit-OnError "Create-Secrets failed: $_"
}