<#
.SYNOPSIS
  Run Prisma migrations and seed DB in the backend container or locally.
#>
param(
    [string]$BackendPath = "$PSScriptRoot\..\backend",
    [switch]$RunInContainer,
    [string]$ContainerName = 'finainexus_backend'
)
. "$PSScriptRoot\config.psd1"
. "$PSScriptRoot\utils\Logger.ps1"
Initialize-Log

try {
    if ($RunInContainer) {
        Write-Log "Running migrations inside container $ContainerName..."
        docker exec -i $ContainerName sh -c "cd /app && npx prisma migrate deploy && node prisma/seed.js"
        if ($LASTEXITCODE -ne 0) { Exit-OnError "Container migration failed." }
    } else {
        Push-Location $BackendPath
        Write-Log "Installing backend dependencies (local)..."
        npm ci
        Write-Log "Generating Prisma client..."
        npx prisma generate
        Write-Log "Applying migrations..."
        npx prisma migrate deploy
        Write-Log "Running seed script..."
        node prisma/seed.js
        Pop-Location
    }
    Write-Log "Database seeded successfully."
}
catch {
    Exit-OnError "Seed-Database failed: $_"
}