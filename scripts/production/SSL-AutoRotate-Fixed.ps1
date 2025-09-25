# SSL-AutoRotate.ps1
# Automated SSL/TLS Certificate Rotation for FinNexusAI
# Requires: Install-Module Posh-ACME -Scope CurrentUser
# RunAs: Admin

param(
    [string]$Domain = "demo.finnexusai.com",
    [string]$Email = "admin@finnexusai.com",
    [int]$DaysUntilExpiry = 30,
    [string]$K8sNamespace = "default",
    [string]$CertPath = ".\certs"
)

Write-Host "Starting SSL Certificate Auto-Rotation for FinNexusAI..." -ForegroundColor Cyan

# Create certificates directory
if (-not (Test-Path $CertPath)) {
    New-Item -ItemType Directory -Path $CertPath -Force
    Write-Host "Created certificates directory: $CertPath" -ForegroundColor Green
}

# Install/Import Posh-ACME if needed
if (-not (Get-Module -ListAvailable -Name Posh-ACME)) {
    Write-Host "Installing Posh-ACME module..." -ForegroundColor Yellow
    Install-Module Posh-ACME -Scope CurrentUser -Force
    Write-Host "Posh-ACME module installed" -ForegroundColor Green
}

Import-Module Posh-ACME
Write-Host "Posh-ACME module imported" -ForegroundColor Green

# Set Let's Encrypt production server
Set-PAServer LE_PROD
Write-Host "Configured Let's Encrypt production server" -ForegroundColor Green

# Check if certificate exists and needs renewal
$cert = Get-PACertificate -Domain $Domain -ErrorAction SilentlyContinue
if ($cert -and ((Get-Date) - $cert.Expires).Days -gt $DaysUntilExpiry) {
    Write-Host "Certificate valid until $($cert.Expires). No renewal needed." -ForegroundColor Green
    exit 0
}

Write-Host "Certificate needs renewal. Starting renewal process..." -ForegroundColor Yellow

try {
    # Generate/Renew certificate
    New-PAOrder -Domain $Domain -Contact $Email -Force
    $certPath = (Get-PAOrder).CertificateFile
    
    Write-Host "Certificate renewed successfully" -ForegroundColor Green
    
    # Export to PFX for K8s secrets
    $PFXPass = ConvertTo-SecureString -String "FinNexusAI2024!StrongPassword" -AsPlainText -Force
    $pfxPath = Join-Path $CertPath "$Domain.pfx"
    Export-PfxCertificate -Cert $certPath -FilePath $pfxPath -Password $PFXPass
    
    Write-Host "Certificate exported to PFX format" -ForegroundColor Green
    
    # Apply to K8s NGINX ingress (update secret)
    $certFile = Join-Path $CertPath "$Domain.crt"
    $keyFile = Join-Path $CertPath "$Domain.key"
    
    kubectl create secret tls finnexusai-tls --cert=$certFile --key=$keyFile -n $K8sNamespace --dry-run=client -o yaml | kubectl apply -f -
    
    Write-Host "SSL certificate applied to Kubernetes" -ForegroundColor Green
    
    # Restart ingress controller
    kubectl rollout restart deployment/nginx-ingress-controller -n ingress-nginx
    
    Write-Host "Ingress controller restarted" -ForegroundColor Green
    
    # Verify certificate deployment
    $secretStatus = kubectl get secret finnexusai-tls -n $K8sNamespace
    if ($secretStatus) {
        Write-Host "Certificate secret verified in Kubernetes" -ForegroundColor Green
    }
    
    Write-Host "SSL Certificate rotation completed successfully!" -ForegroundColor Green
    Write-Host "Certificate Details:" -ForegroundColor Cyan
    Write-Host "   Domain: $Domain" -ForegroundColor White
    Write-Host "   Expires: $($cert.Expires)" -ForegroundColor White
    Write-Host "   Namespace: $K8sNamespace" -ForegroundColor White
    
} catch {
    Write-Host "SSL Certificate rotation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Schedule next check (recommend daily via Task Scheduler)
Write-Host "Tip: Schedule this script to run daily via Windows Task Scheduler" -ForegroundColor Yellow
$scriptPath = $MyInvocation.MyCommand.Path
Write-Host "   Command: powershell.exe -ExecutionPolicy Bypass -File `"$scriptPath`"" -ForegroundColor Gray
