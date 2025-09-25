<#
.SYNOPSIS
  Restore PostgreSQL into Kubernetes.
#>
param(
    [string]$Namespace = 'finainexus',
    [string]$BackupFile,
    [switch]$Encrypted,
    [string]$GpgPassphrase
)
. "$PSScriptRoot\utils\Logger.ps1"
Initialize-Log

try {
    if (-not $BackupFile) { Exit-OnError "Provide -BackupFile path to restore." }
    if ($Encrypted) {
        if (-not $GpgPassphrase) {
            $secure = Read-Host "Enter passphrase for decryption (hidden)" -AsSecureString
            $GpgPassphrase = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
        }
        $tmp = [System.IO.Path]::GetTempFileName() + '.sql'
        gpg --batch --yes --passphrase "$GpgPassphrase" -o $tmp -d $BackupFile
        $BackupFile = $tmp
    }

    $pod = kubectl get pods -n $Namespace -l app=postgres -o jsonpath='{.items[0].metadata.name}'
    if (-not $pod) { Exit-OnError "Postgres pod not found" }

    Write-Log "Copying backup file into pod..."
    kubectl cp $BackupFile "$Namespace/$pod:/tmp/restore.sql"
    Write-Log "Executing psql restore..."
    kubectl exec -n $Namespace $pod -- psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB -f /tmp/restore.sql
    if ($LASTEXITCODE -ne 0) { Exit-OnError "psql restore failed" }

    Write-Log "Restore completed."
}
catch {
    Exit-OnError "Restore-Database failed: $_"
}