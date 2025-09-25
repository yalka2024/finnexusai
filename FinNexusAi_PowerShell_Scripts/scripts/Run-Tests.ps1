<#
.SYNOPSIS
  Run unit and integration tests for backend and frontend.
#>
param(
    [switch]$RunE2E,
    [string]$BackendPath = "$PSScriptRoot\..\backend",
    [string]$FrontendPath = "$PSScriptRoot\..\frontend"
)
. "$PSScriptRoot\utils\Logger.ps1"
Initialize-Log

try {
    # Backend tests
    if (Test-Path $BackendPath) {
        Push-Location $BackendPath
        Write-Log "Installing backend dependencies..."
        npm ci
        Write-Log "Running backend tests..."
        npm test
        if ($LASTEXITCODE -ne 0) { Exit-OnError "Backend tests failed." }
        Pop-Location
    }

    # Frontend tests (unit/build)
    if (Test-Path $FrontendPath) {
        Push-Location $FrontendPath
        Write-Log "Installing frontend dependencies..."
        npm ci
        Write-Log "Building frontend..."
        npm run build
        if ($LASTEXITCODE -ne 0) { Exit-OnError "Frontend build/tests failed." }
        Pop-Location
    }

    if ($RunE2E) {
        Write-Log "Running E2E tests (Cypress)..."
        # assume cypress configured in frontend
        Push-Location $FrontendPath
        npm run cypress:run
        if ($LASTEXITCODE -ne 0) { Exit-OnError "E2E tests failed." }
        Pop-Location
    }

    Write-Log "All tests completed successfully."
}
catch {
    Exit-OnError "Run-Tests failed: $_"
}