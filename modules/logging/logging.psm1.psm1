<#
  Centralized logger for FinNexusAi scripts
#>

function Initialize-Log {
    param(
        [string]$LogPath = (Join-Path $env:USERPROFILE 'FinAI_Logs'),
        [string]$Prefix = 'finai'
    )
    if (-not (Test-Path $LogPath)) {
        New-Item -ItemType Directory -Path $LogPath -Force | Out-Null
    }
    $global:LogFile = Join-Path $LogPath ("{0}-{1}.log" -f $Prefix, (Get-Date -Format 'yyyyMMdd'))
}

function Write-Log {
    param(
        [Parameter(Mandatory = $true)][string]$Message,
        [ValidateSet('INFO','WARN','ERROR','DEBUG')][string]$Level = 'INFO'
    )
    if (-not $global:LogFile) { Initialize-Log }
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss.fff'
    $line = "{0} [{1}] {2}" -f $ts, $Level, $Message
    try { Add-Content -Path $global:LogFile -Value $line } catch {}
    switch ($Level) {
        'ERROR' { Write-Host $line -ForegroundColor Red }
        'WARN'  { Write-Host $line -ForegroundColor Yellow }
        'DEBUG' { Write-Host $line -ForegroundColor Cyan }
        default { Write-Host $line -ForegroundColor Green }
    }
}

function Exit-OnError {
    param([string]$Message, [int]$Code = 1)
    Write-Log -Message $Message -Level 'ERROR'
    throw $Message
}

Export-ModuleMember -Function Initialize-Log,Write-Log,Exit-OnError
