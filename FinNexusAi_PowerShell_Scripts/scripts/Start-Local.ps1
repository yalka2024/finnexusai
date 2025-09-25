<#
.SYNOPSIS
  Start the full local stack with docker-compose (idempotent).
#>
param(
    [switch]$Recreate,
    [string]$ComposeFile = "$PSScriptRoot\..\docker-compose.yml"
)
. "$PSScriptRoot\config.psd1"
. "$PSScriptRoot\utils\Logger.ps1"

Initialize-Log

try {
    if (-not (Test-Path $ComposeFile)) { Exit-OnError "Compose file not found: $ComposeFile" }
    Write-Log "Starting local stack with compose file: $ComposeFile"
    $args = @("-f",$ComposeFile,"up","--build","-d")
    if ($Recreate) { $args += "--force-recreate" }
    & docker-compose @args
    if ($LASTEXITCODE -ne 0) { Exit-OnError "docker-compose up failed with exit code $LASTEXITCODE" }
    Write-Log "Local stack started. Waiting for services..."
    Start-Sleep -Seconds 5
    Write-Log "Frontend: http://localhost:3000 | Backend: http://localhost:5000"
}
catch {
    Exit-OnError "Start-Local failed: $_"
}