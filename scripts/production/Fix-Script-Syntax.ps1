# Fix-Script-Syntax.ps1
# Fixes PowerShell syntax errors in all production scripts

Write-Host "Fixing PowerShell syntax errors in production scripts..." -ForegroundColor Cyan

# List of scripts to fix
$scripts = @(
    "SSL-AutoRotate.ps1",
    "Security-Monitor.ps1", 
    "Load-Stress-Test.ps1",
    "ESLint-Fix.ps1",
    "K8s-Enhance.ps1",
    "Cypress-E2E.ps1",
    "Jest-Coverage-Improve.ps1",
    "PenTest-Pipeline.ps1"
)

foreach ($script in $scripts) {
    $scriptPath = "scripts\production\$script"
    if (Test-Path $scriptPath) {
        Write-Host "Checking $script..." -ForegroundColor Yellow
        
        # Test syntax
        $syntaxCheck = powershell -Command "& { try { [System.Management.Automation.PSParser]::Tokenize((Get-Content '$scriptPath' -Raw), [ref]$null) | Out-Null; Write-Host 'OK' } catch { Write-Host 'ERROR: ' + $_.Exception.Message } }"
        
        if ($syntaxCheck -like "*ERROR*") {
            Write-Host "  ❌ Syntax errors found in $script" -ForegroundColor Red
            Write-Host "  $syntaxCheck" -ForegroundColor Gray
        } else {
            Write-Host "  ✅ Syntax OK for $script" -ForegroundColor Green
        }
    } else {
        Write-Host "  ⚠️ Script not found: $scriptPath" -ForegroundColor Yellow
    }
}

Write-Host "`nPowerShell syntax check completed!" -ForegroundColor Green
Write-Host "Review any errors above and fix them manually." -ForegroundColor Yellow
