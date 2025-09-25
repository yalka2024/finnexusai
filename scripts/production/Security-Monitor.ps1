# Security-Monitor.ps1
# Real-Time Security Threat Detection and Monitoring for FinNexusAI
# Enables script block logging and monitors threats in real-time

param(
    [string]$LogPath = ".\logs\security",
    [int]$DurationHours = 24,
    [string]$PrometheusEndpoint = "http://localhost:9090",
    [string]$GrafanaEndpoint = "http://localhost:3001"
)

Write-Host "🛡️ Starting FinNexusAI Security Monitoring System..." -ForegroundColor Cyan

# Create logs directory
if (-not (Test-Path $LogPath)) {
    New-Item -ItemType Directory -Path $LogPath -Force
    Write-Host "✅ Created security logs directory: $LogPath" -ForegroundColor Green
}

$currentDate = Get-Date -Format 'yyyyMMdd'
$logFile = Join-Path $LogPath "security-$currentDate.log"
$threatLogFile = Join-Path $LogPath "threats-$currentDate.log"

# Enable PowerShell logging (Event IDs 4103/4104 for threats)
Write-Host "🔧 Configuring PowerShell security logging..." -ForegroundColor Yellow

$regPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ScriptBlockLogging"
if (-not (Test-Path $regPath)) { 
    New-Item -Path $regPath -Force | Out-Null
}
Set-ItemProperty -Path $regPath -Name "EnableScriptBlockLogging" -Value 1

# Enable module logging
$moduleRegPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ModuleLogging"
if (-not (Test-Path $moduleRegPath)) { 
    New-Item -Path $moduleRegPath -Force | Out-Null
}
Set-ItemProperty -Path $moduleRegPath -Name "EnableModuleLogging" -Value 1

Write-Host "✅ PowerShell security logging enabled" -ForegroundColor Green

# Initialize threat counters
$threatCount = 0
$suspiciousProcessCount = 0
$maliciousScriptCount = 0
$unauthorizedAccessCount = 0

# Real-time monitoring loop
$duration = New-TimeSpan -Hours $DurationHours
$endTime = (Get-Date).Add($duration)
$startTime = Get-Date

Write-Host "🔍 Starting real-time threat monitoring for $DurationHours hours..." -ForegroundColor Yellow
Write-Host "   Start Time: $startTime" -ForegroundColor White
Write-Host "   End Time: $endTime" -ForegroundColor White
Write-Host "   Log File: $logFile" -ForegroundColor White

while ((Get-Date) -lt $endTime) {
    $currentTime = Get-Date
    
    try {
        # Monitor suspicious PowerShell executions
        $events = Get-WinEvent -FilterHashtable @{LogName='Security'; ID=4688} -MaxEvents 100 -ErrorAction SilentlyContinue | 
                  Where-Object { 
                      $_.Message -match 'powershell.exe.*-EncodedCommand|powershell.exe.*-e' -or 
                      ($_.Message -match 'powershell.exe' -and $_.Message -notmatch 'conhost.exe|winlogon.exe|explorer.exe') -or
                      $_.Message -match 'cmd.exe.*\/c.*powershell'
                  }
        
        if ($events) {
            foreach ($event in $events) {
                $threatCount++
                $threat = [PSCustomObject]@{
                    Time = $event.TimeCreated
                    EventID = $event.Id
                    Message = $event.Message
                    Level = 'High'
                    Category = 'Suspicious PowerShell'
                    Source = 'Security Monitor'
                }
                
                $threat | Export-Csv -Path $threatLogFile -Append -NoTypeInformation
                Write-Host "🚨 THREAT DETECTED: $($threat.Category) at $($threat.Time)" -ForegroundColor Red
                
                # Send alert to Prometheus
                $prometheusAlert = @{
                    timestamp = [DateTimeOffset]::Now.ToUnixTimeSeconds()
                    alertname = "SuspiciousPowerShellExecution"
                    severity = "high"
                    instance = $env:COMPUTERNAME
                    description = $threat.Message
                } | ConvertTo-Json
                
                try {
                    Invoke-WebRequest -Uri "$PrometheusEndpoint/api/v1/admin/tsdb/snapshot" -Method POST -Body $prometheusAlert -ContentType "application/json" -TimeoutSec 5 -ErrorAction SilentlyContinue
                } catch {
                    # Prometheus not available, log locally
                }
            }
        }
        
        # Monitor for malicious scripts (Event ID 4104)
        $scriptEvents = Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-PowerShell/Operational'; ID=4104} -MaxEvents 50 -ErrorAction SilentlyContinue |
                       Where-Object {
                           $_.Message -match 'Invoke-Expression|IEX|DownloadString|WebClient|Net.WebClient' -or
                           $_.Message -match 'base64|encoded|obfuscated' -or
                           $_.Message -match 'bypass|executionpolicy'
                       }
        
        if ($scriptEvents) {
            foreach ($scriptEvent in $scriptEvents) {
                $maliciousScriptCount++
                $scriptThreat = [PSCustomObject]@{
                    Time = $scriptEvent.TimeCreated
                    EventID = $scriptEvent.Id
                    Message = $scriptEvent.Message
                    Level = 'Critical'
                    Category = 'Malicious Script'
                    Source = 'PowerShell Monitor'
                }
                
                $scriptThreat | Export-Csv -Path $threatLogFile -Append -NoTypeInformation
                Write-Host "🚨 CRITICAL: Malicious script detected at $($scriptThreat.Time)" -ForegroundColor Red
            }
        }
        
        # Monitor failed login attempts
        $failedLogins = Get-WinEvent -FilterHashtable @{LogName='Security'; ID=4625} -MaxEvents 20 -ErrorAction SilentlyContinue |
                       Where-Object { $_.TimeCreated -gt (Get-Date).AddMinutes(-5) }
        
        if ($failedLogins.Count -gt 10) {
            $unauthorizedAccessCount++
            $accessThreat = [PSCustomObject]@{
                Time = Get-Date
                EventID = 4625
                Message = "Multiple failed login attempts detected: $($failedLogins.Count) in last 5 minutes"
                Level = 'High'
                Category = 'Unauthorized Access'
                Source = 'Login Monitor'
            }
            
            $accessThreat | Export-Csv -Path $threatLogFile -Append -NoTypeInformation
            Write-Host "🚨 HIGH: Multiple failed login attempts detected" -ForegroundColor Red
        }
        
        # Log monitoring status
        $status = [PSCustomObject]@{
            Time = $currentTime
            ThreatsDetected = $threatCount
            SuspiciousProcesses = $suspiciousProcessCount
            MaliciousScripts = $maliciousScriptCount
            UnauthorizedAccess = $unauthorizedAccessCount
            Status = 'Monitoring'
        }
        
        $status | Export-Csv -Path $logFile -Append -NoTypeInformation
        
        # Display progress
        if ($currentTime.Minute % 5 -eq 0) {
            Write-Host "📊 Monitoring Status: Threats=$threatCount, Scripts=$maliciousScriptCount, Access=$unauthorizedAccessCount" -ForegroundColor Cyan
        }
        
    } catch {
        Write-Host "⚠️ Error in monitoring loop: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    Start-Sleep -Seconds 30  # Check every 30 seconds
}

# Generate monitoring summary
$summary = [PSCustomObject]@{
    StartTime = $startTime
    EndTime = Get-Date
    Duration = $DurationHours
    TotalThreats = $threatCount
    SuspiciousProcesses = $suspiciousProcessCount
    MaliciousScripts = $maliciousScriptCount
    UnauthorizedAccess = $unauthorizedAccessCount
    LogFile = $logFile
    ThreatLogFile = $threatLogFile
}

$summaryPath = Join-Path $LogPath "security-summary-$currentDate.json"
$summary | ConvertTo-Json -Depth 3 | Out-File -FilePath $summaryPath -Encoding UTF8

Write-Host "✅ Security monitoring completed!" -ForegroundColor Green
Write-Host "📊 Monitoring Summary:" -ForegroundColor Cyan
Write-Host "   Duration: $DurationHours hours" -ForegroundColor White
Write-Host "   Total Threats: $threatCount" -ForegroundColor White
Write-Host "   Malicious Scripts: $maliciousScriptCount" -ForegroundColor White
Write-Host "   Unauthorized Access: $unauthorizedAccessCount" -ForegroundColor White
Write-Host "   Summary: $summaryPath" -ForegroundColor White
Write-Host "   Threat Log: $threatLogFile" -ForegroundColor White

# Export summary for Grafana dashboard
$grafanaMetrics = @"
# HELP finnexusai_security_threats_total Total number of security threats detected
# TYPE finnexusai_security_threats_total counter
finnexusai_security_threats_total{category="suspicious_powershell"} $threatCount
finnexusai_security_threats_total{category="malicious_script"} $maliciousScriptCount
finnexusai_security_threats_total{category="unauthorized_access"} $unauthorizedAccessCount

# HELP finnexusai_security_monitoring_duration_seconds Duration of security monitoring in seconds
# TYPE finnexusai_security_monitoring_duration_seconds gauge
finnexusai_security_monitoring_duration_seconds $($DurationHours * 3600)
"@

$metricsPath = Join-Path $LogPath "security-metrics-$currentDate.prom"
$grafanaMetrics | Out-File -FilePath $metricsPath -Encoding UTF8

Write-Host "📈 Grafana metrics exported: $metricsPath" -ForegroundColor Green
Write-Host "💡 Import metrics to Prometheus for Grafana visualization" -ForegroundColor Yellow
