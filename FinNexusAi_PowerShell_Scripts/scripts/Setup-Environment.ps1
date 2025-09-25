<#
.SYNOPSIS
  Install or verify local prerequisites for FinAI Nexus.
.DESCRIPTION
  Idempotent installer that ensures Docker, Node, npm, kubectl, helm are installed.
#>
param(
    [switch]$Force,
    [switch]$VerboseLogging
)
# Load config and logger
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. "$scriptDir\config.psd1"
. "$scriptDir\utils\Logger.ps1"
. "$scriptDir\utils\Commands.ps1"

Initialize-Log -LogPath (Resolve-Path -Path $scriptDir\..\logs -ErrorAction SilentlyContinue | ForEach-Object { $_.Path })  -ErrorAction SilentlyContinue

Write-Log "Starting Setup-Environment (Force=$Force)"

# Internal helper
function Ensure-Choco {
    if (-not (Test-CommandAvailable 'choco')) {
        if ($PSVersionTable.Platform -like '*Windows*') {
            if ($Force) {
                Write-Log "Installing Chocolatey..."
                Set-ExecutionPolicy Bypass -Scope Process -Force
                iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
            } else {
                Exit-OnError "Chocolatey not found. Rerun with -Force to auto-install."
            }
        } else {
            Write-Log "Chocolatey not required on non-Windows platform"
        }
    } else {
        Write-Log "Chocolatey available"
    }
}

try {
    if ($PSVersionTable.Platform -like '*Windows*') { Ensure-Choco }

    # Docker
    if (-not (Test-CommandAvailable 'docker')) {
        if ($Force -and (Test-CommandAvailable 'choco')) {
            Write-Log "Installing Docker Desktop via Chocolatey..."
            choco install docker-desktop -y
        } else {
            Exit-OnError "Docker not found. Install Docker Desktop and retry, or run with -Force to auto-install."
        }
    } else {
        Write-Log "Docker detected"
    }

    # Node
    if (-not (Test-CommandAvailable 'node')) {
        if ($Force -and (Test-CommandAvailable 'choco')) {
            Write-Log "Installing Node LTS via Chocolatey..."
            choco install nodejs-lts -y
        } else {
            Exit-OnError "Node.js not found. Install Node and retry, or run with -Force to auto-install."
        }
    } else {
        Write-Log "Node detected: $(node -v)"
    }

    # npm
    if (-not (Test-CommandAvailable 'npm')) {
        Exit-OnError "npm not available after Node installation. Verify Node installation."
    }

    # kubectl
    if (-not (Test-CommandAvailable 'kubectl')) {
        if ($Force -and (Test-CommandAvailable 'choco')) {
            Write-Log "Installing kubectl..."
            choco install kubernetes-cli -y
        } else {
            Write-Log "kubectl not found. Install manually or rerun with -Force."
        }
    } else {
        Write-Log "kubectl detected: $(kubectl version --client --short 2>$null)"
    }

    # helm
    if (-not (Test-CommandAvailable 'helm')) {
        if ($Force -and (Test-CommandAvailable 'choco')) {
            Write-Log "Installing Helm..."
            choco install kubernetes-helm -y
        } else {
            Write-Log "helm not found. Install manually or rerun with -Force."
        }
    } else {
        Write-Log "helm detected: $(helm version --short 2>$null)"
    }

    # prisma (npm global)
    if (-not (Test-CommandAvailable 'prisma')) {
        Write-Log "Installing Prisma CLI globally..."
        npm install -g prisma
    } else {
        Write-Log "prisma detected: $(prisma --version 2>$null)"
    }

    Write-Log "Environment setup completed successfully."
}
catch {
    Exit-OnError "Setup-Environment failed: $_"
}