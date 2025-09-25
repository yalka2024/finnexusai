# Security-Monitor.ps1
# Enables script block logging and monitors threats in real-time

param(
    [string]$LogPath = ".\logs\security-$(Get-Date -Format 'yyyyMMdd').log"
)

# Enable PowerShell logging (Event IDs 4103/4104 for threats)
$regPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ScriptBlockLogging"
if (-not (Test-Path $regPath)) { New-Item -Path $regPath -Force }
Set-ItemProperty -Path $regPath -Name "EnableScriptBlockLogging" -Value 1

# Real-time monitoring loop (run for 1 hour; adjust for production)
$duration = New-TimeSpan -Hours 1
$endTime = (Get-Date).Add($duration)
while ((Get-Date) -lt $endTime) {
    # Monitor suspicious PowerShell executions (e.g., encoded commands, unusual parents)
    $events = Get-WinEvent -FilterHashtable @{LogName='Security'; ID=4688} -MaxEvents 100 | 
              Where-Object { $_.Message -match 'powershell.exe.*-EncodedCommand|powershell.exe.*-e' -or 
                             ($_.Message -match 'powershell.exe' -and $_.Message -notmatch 'conhost.exe|winlogon.exe') } 
    
    if ($events) {
        $events | ForEach-Object { 
            $threat = [PSCustomObject]@{Time=$_.TimeCreated; Message=$_.Message; Level='High'}
            $threat | Export-Csv -Path $LogPath -Append -NoTypeInformation
            Write-Host "Threat detected: $($threat.Message)" -ForegroundColor Red
            # Alert: Integrate with Prometheus (push metrics)
            Invoke-WebRequest -Uri "http://prometheus:9090/api/v1/admin/tsdb/snapshot" -Method POST  # Example push
        }
    }
    
    Start-Sleep -Seconds 10  # Poll every 10s
}

# Export summary for Grafana dashboard
Get-Content $LogPath | Select-String 'Threat' | Out-File ".\reports\threat-summary.txt"
Write-Host "Monitoring complete. Check $LogPath for threats." -ForegroundColor Yellow
