<#
.SYNOPSIS
  Backup PostgreSQL running in Kubernetes (supports encryption).
#>
param(
    [string]$Namespace = 'finainexus',
    [string]$BackupDir,
    [switch]$Encrypt,
    [string]$GpgPassphrase
)
. "$PSScriptRoot\config.psd1"
. "$PSScriptRoot\utils\Logger.ps1"
Initialize-Log

if (-not $BackupDir) { $BackupDir = (Get-Item $PSScriptRoot\config.psd1).GetValue('BackupDir') }

try {
    if (-not (Test-Path $BackupDir)) { New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null }

    $timestamp = Get-Date -Format 'yyyyMMddHHmmss'
    $file = Join-Path $BackupDir ("finai-backup-$timestamp.sql")

    Write-Log "Starting pg_dump from postgres pod..."
    # Find postgres pod
    $pod = kubectl get pods -n $Namespace -l app=postgres -o jsonpath='{.items[0].metadata.name}'
    if (-not $pod) { Exit-OnError "Postgres pod not found in namespace $Namespace" }

    kubectl exec -n $Namespace $pod -- pg_dump -U $env:POSTGRES_USER $env:POSTGRES_DB > $file
    if ($LASTEXITCODE -ne 0) { Exit-OnError "pg_dump failed" }

    if ($Encrypt) {
        if (-not $GpgPassphrase) {
            $secure = Read-Host "Enter passphrase for encryption (hidden)" -AsSecureString
            $GpgPassphrase = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
        }
        $encFile = "$file.gpg"
        Write-Log "Encrypting backup to $encFile"
        # Use gpg if available
        if (Test-Path (Get-Command gpg -ErrorAction SilentlyContinue).Source) {
            gpg --batch --yes --passphrase "$GpgPassphrase" -c --cipher-algo AES256 -o $encFile $file
            Remove-Item $file
            Write-Log "Backup encrypted to $encFile"
        } else {
            Write-Log "gpg not available; leaving unencrypted file."
        }
    }

    Write-Log "Backup completed: $file"
}
catch {
    Exit-OnError "Backup-Database failed: $_"
}