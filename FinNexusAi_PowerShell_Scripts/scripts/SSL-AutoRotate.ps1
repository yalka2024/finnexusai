# SSL-AutoRotate.ps1
# Requires: Install-Module Posh-ACME -Scope CurrentUser
# RunAs: Admin

param(
    [string]$Domain = "demo.finainexus.com",
    [string]$Email = "admin@finainexus.com",
    [int]$DaysUntilExpiry = 30,
    [string]$K8sNamespace = "default"
)

# Install/Import Posh-ACME if needed
if (-not (Get-Module -ListAvailable -Name Posh-ACME)) {
    Install-Module Posh-ACME -Scope CurrentUser -Force
}
Import-Module Posh-ACME

Set-PAServer LE_PROD  # Production Let's Encrypt

# Check if cert exists and needs renewal
$cert = Get-PACertificate -Domain $Domain
if ($cert -and ((Get-Date) - $cert.Expires).Days -gt $DaysUntilExpiry) {
    Write-Host "Certificate valid. Exiting." -ForegroundColor Green
    exit 0
}

# Generate/Renew cert
New-PAOrder -Domain $Domain -Contact $Email -Force
$certPath = (Get-PAOrder).CertificateFile

# Export to PFX for K8s secrets
$PFXPass = ConvertTo-SecureString -String "YourStrongPFXPassword" -AsPlainText -Force
Export-PfxCertificate -Cert $certPath -FilePath ".\certs\$Domain.pfx" -Password $PFXPass

# Apply to K8s NGINX ingress (update secret)
kubectl create secret tls finainexus-tls --cert=".\certs\$Domain.crt" --key=".\certs\$Domain.key" -n $K8sNamespace --dry-run=client -o yaml | kubectl apply -f -
kubectl rollout restart deployment/nginx-ingress-controller -n ingress-nginx  # Restart ingress

Write-Host "SSL Certificate rotated and applied to K8s." -ForegroundColor Green
