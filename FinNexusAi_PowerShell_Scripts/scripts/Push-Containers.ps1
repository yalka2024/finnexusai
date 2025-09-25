param(
    [string]$Registry,
    [string]$Tag = 'latest',
    [string]$Username,
    [string]$Password
)
. "$PSScriptRoot\config.psd1"
. "$PSScriptRoot\utils\Logger.ps1"
Initialize-Log

if (-not $Registry) { $Registry = (Get-Item $PSScriptRoot\config.psd1).GetValue('DockerRegistry') }

try {
    if ($Username -and $Password) {
        Write-Log "Logging in to container registry $Registry..."
        docker login -u $Username -p $Password
        if ($LASTEXITCODE -ne 0) { Exit-OnError "Docker login failed." }
    }

    $frontendImage = "{0}/finainexus-frontend:{1}" -f $Registry, $Tag
    $backendImage  = "{0}/finainexus-backend:{1}" -f $Registry, $Tag

    Write-Log "Pushing $frontendImage"
    docker push $frontendImage
    if ($LASTEXITCODE -ne 0) { Exit-OnError "Push frontend failed." }

    Write-Log "Pushing $backendImage"
    docker push $backendImage
    if ($LASTEXITCODE -ne 0) { Exit-OnError "Push backend failed." }

    Write-Log "Push complete."
}
catch {
    Exit-OnError "Push-Containers failed: $_"
}