<#
.SYNOPSIS
  Build Docker images for frontend and backend with robust tagging.
#>
param(
    [string]$Registry,
    [string]$Tag = 'latest'
)
. "$PSScriptRoot\config.psd1"
. "$PSScriptRoot\utils\Logger.ps1"
Initialize-Log

if (-not $Registry) { $Registry = (Get-Item $PSScriptRoot\config.psd1).GetValue('DockerRegistry') }

try {
    $frontendImage = "{0}/finainexus-frontend:{1}" -f $Registry, $Tag
    $backendImage  = "{0}/finainexus-backend:{1}" -f $Registry, $Tag

    Write-Log "Building frontend image $frontendImage..."
    docker build -t $frontendImage "$PSScriptRoot\..\..\apps\frontend"
    if ($LASTEXITCODE -ne 0) { Exit-OnError "Frontend build failed." }

    Write-Log "Building backend image $backendImage..."
    docker build -t $backendImage "$PSScriptRoot\..\..\apps\backend"
    if ($LASTEXITCODE -ne 0) { Exit-OnError "Backend build failed." }

    Write-Log "Images built successfully."
}
catch {
    Exit-OnError "Build-Containers failed: $_"
}