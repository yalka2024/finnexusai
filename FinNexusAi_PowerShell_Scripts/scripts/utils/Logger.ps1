<#
.SYNOPSIS
  Central logging utilities for FinAI PowerShell scripts.
#>
param()

function Initialize-Log {
    param(
        [string]$LogPath = (Join-Path $env:USERPROFILE 'FinAI_Logs'),
        [string]$LogFilePrefix = 'finai'
    )
    if (-not (Test-Path $LogPath)) {
        New-Item -ItemType Directory -Path $LogPath -Force | Out-Null
    }
    $global:LogPath = $LogPath
    $date = Get-Date -Format 'yyyyMMdd'
    $global:LogFile = Join-Path $LogPath ("{0}-{1}.log" -f $LogFilePrefix, $date)
    if (-not (Test-Path $global:LogFile)) {
        New-Item -Path $global:LogFile -ItemType File -Force | Out-Null
    }
}

function Write-Log {
    param(
        [Parameter(Mandatory=$true)][string]$Message,
        [ValidateSet('INFO','WARN','ERROR','DEBUG')][string]$Level = 'INFO'
    )
    if (-not $global:LogPath) { Initialize-Log }
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss.fff'
    $line = "{0} [{1}] {2}" -f $ts, $Level, $Message
    Add-Content -Path $global:LogFile -Value $line
    switch ($Level) {
        'ERROR' { Write-Host $line -ForegroundColor Red }
        'WARN'  { Write-Host $line -ForegroundColor Yellow }
        'DEBUG' { Write-Host $line -ForegroundColor DarkCyan }
        default { Write-Host $line -ForegroundColor Green }
    }
}

function Exit-OnError {
    param([string]$Message, [int]$Code=1)
    Write-Log -Message $Message -Level 'ERROR'
    throw $Message
}