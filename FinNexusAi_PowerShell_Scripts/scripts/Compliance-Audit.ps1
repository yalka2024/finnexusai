<#
.SYNOPSIS
  Run a quick automated compliance audit for items relevant to SOC2/GDPR/PCI.
#>
param(
    [string]$ReportPath = "$PSScriptRoot\..\compliance-report.txt"
)
. "$PSScriptRoot\utils\Logger.ps1"
Initialize-Log

$checks = @()
# Example checks:
$checks += @{ Name='SecretsInRepo'; Description='Search for common secret patterns in repo'; Result=$null }
$checks += @{ Name='TLSForServices'; Description='Check if backend service uses TLS (LoadBalancer type)'; Result=$null }
$checks += @{ Name='DBBackupsScheduled'; Description='Check backup dir exists'; Result=$null }

try {
    Write-Log "Running compliance checks..."

    # SecretsInRepo (very basic grep)
    $repoRoot = (Resolve-Path "$PSScriptRoot\..").Path
    $secretsFound = Select-String -Path "$repoRoot\**\*" -Pattern "PASSWORD|SECRET|API_KEY" -SimpleMatch -ErrorAction SilentlyContinue
    $checks[0].Result = if ($secretsFound) { "WARN: possible secrets found: $($secretsFound.Count)" } else { "OK" }

    # TLSForServices
    $svc = kubectl get svc finai-backend -n finainexus -o json 2>$null
    if ($svc) {
        $type = kubectl get svc finai-backend -n finainexus -o jsonpath='{.spec.type}'
        $checks[1].Result = if ($type -eq 'LoadBalancer' -or $type -eq 'NodePort') { "WARN: external service type ($type) requires TLS termination" } else { "OK" }
    } else {
        $checks[1].Result = "WARN: backend service not found"
    }

    # DBBackupsScheduled (simple)
    $backupDir = (Get-Item "$PSScriptRoot\config.psd1").GetValue('BackupDir')
    $checks[2].Result = if (Test-Path $backupDir) { "OK" } else { "WARN: backup dir missing ($backupDir)" }

    # Write report
    New-Item -Path $ReportPath -Force -ItemType File | Out-Null
    Add-Content -Path $ReportPath -Value ("Compliance Report - {0}" -f (Get-Date))

    foreach ($c in $checks) {
        Add-Content -Path $ReportPath -Value ("{0}: {1} - {2}" -f $c.Name, $c.Description, $c.Result)
    }

    Write-Log "Compliance audit completed. Report: $ReportPath"
}
catch {
    Exit-OnError "Compliance-Audit failed: $_"
}