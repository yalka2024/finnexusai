param(
    [string]$ComposeFile = "$PSScriptRoot\..\docker-compose.yml",
    [switch]$RemoveVolumes
)
. "$PSScriptRoot\config.psd1"
. "$PSScriptRoot\utils\Logger.ps1"
Initialize-Log

try {
    if (-not (Test-Path $ComposeFile)) { Write-Log "Compose file not found; nothing to stop."; return }
    $args = @("-f",$ComposeFile,"down")
    if ($RemoveVolumes) { $args += "--volumes" }
    & docker-compose @args
    if ($LASTEXITCODE -ne 0) { Exit-OnError "docker-compose down failed with exit code $LASTEXITCODE" }
    Write-Log "Local stack stopped."
}
catch {
    Exit-OnError "Stop-Local failed: $_"
}