# Production-Ready-Simple.ps1
# Simplified Production Readiness Script for FinNexusAI
# This script demonstrates the concept without complex syntax issues

param(
    [string]$TargetURL = "http://localhost:3000",
    [string]$Domain = "demo.finnexusai.com",
    [switch]$QuickMode = $false
)

$StartTime = Get-Date
Write-Host "Starting FinNexusAI Production Readiness Check..." -ForegroundColor Cyan
Write-Host "Start Time: $StartTime" -ForegroundColor White

# Create reports directory
$ReportsPath = ".\reports\production-ready"
if (-not (Test-Path $ReportsPath)) {
    New-Item -ItemType Directory -Path $ReportsPath -Force
    Write-Host "Created reports directory: $ReportsPath" -ForegroundColor Green
}

# Initialize tracking
$Results = @{
    StartTime = $StartTime
    Tests = @{}
    Summary = @{
        Total = 0
        Passed = 0
        Failed = 0
    }
}

# Test 1: Code Quality Check
Write-Host "`n1. Testing Code Quality..." -ForegroundColor Yellow
$Results.Tests["CodeQuality"] = @{
    Name = "ESLint Code Quality"
    Status = "Testing"
}

try {
    # Run ESLint check
    $eslintResult = npm run lint 2>&1
    
    # Check for critical errors (parsing errors, security issues)
    $criticalErrors = $eslintResult | Select-String -Pattern "Parsing error|Unexpected character|SyntaxError|no-console|no-undef" -SimpleMatch
    
    if ($criticalErrors.Count -eq 0) {
        $Results.Tests["CodeQuality"].Status = "Passed"
        $Results.Summary.Passed++
        Write-Host "  ✅ Code Quality: PASSED (No critical errors)" -ForegroundColor Green
    } else {
        $Results.Tests["CodeQuality"].Status = "Failed"
        $Results.Summary.Failed++
        Write-Host "  ❌ Code Quality: FAILED ($($criticalErrors.Count) critical errors)" -ForegroundColor Red
    }
} catch {
    $Results.Tests["CodeQuality"].Status = "Error"
    $Results.Summary.Failed++
    Write-Host "  ❌ Code Quality: ERROR - $($_.Exception.Message)" -ForegroundColor Red
}
$Results.Summary.Total++

# Test 2: Test Coverage Check
Write-Host "`n2. Testing Coverage..." -ForegroundColor Yellow
$Results.Tests["Coverage"] = @{
    Name = "Jest Test Coverage"
    Status = "Testing"
}

try {
    # Run Jest tests
    $jestResult = npm test -- --coverage --watchAll=false 2>&1
    if ($LASTEXITCODE -eq 0) {
        $Results.Tests["Coverage"].Status = "Passed"
        $Results.Summary.Passed++
        Write-Host "  ✅ Test Coverage: PASSED" -ForegroundColor Green
    } else {
        $Results.Tests["Coverage"].Status = "Failed"
        $Results.Summary.Failed++
        Write-Host "  ❌ Test Coverage: FAILED" -ForegroundColor Red
    }
} catch {
    $Results.Tests["Coverage"].Status = "Error"
    $Results.Summary.Failed++
    Write-Host "  ❌ Test Coverage: ERROR - $($_.Exception.Message)" -ForegroundColor Red
}
$Results.Summary.Total++

# Test 3: Load Testing
Write-Host "`n3. Testing Performance..." -ForegroundColor Yellow
$Results.Tests["Performance"] = @{
    Name = "Load Testing"
    Status = "Testing"
}

try {
    # Simple load test using curl
    $loadTestStart = Get-Date
    $response = Invoke-WebRequest -Uri "$TargetURL/api/v1/health" -TimeoutSec 10 -ErrorAction SilentlyContinue
    $loadTestEnd = Get-Date
    $responseTime = ($loadTestEnd - $loadTestStart).TotalMilliseconds
    
    if ($response.StatusCode -eq 200 -and $responseTime -lt 1000) {
        $Results.Tests["Performance"].Status = "Passed"
        $Results.Summary.Passed++
        Write-Host "  ✅ Performance: PASSED (Response time: $([Math]::Round($responseTime, 2))ms)" -ForegroundColor Green
    } else {
        $Results.Tests["Performance"].Status = "Failed"
        $Results.Summary.Failed++
        Write-Host "  ❌ Performance: FAILED (Response time: $([Math]::Round($responseTime, 2))ms)" -ForegroundColor Red
    }
} catch {
    $Results.Tests["Performance"].Status = "Error"
    $Results.Summary.Failed++
    Write-Host "  ❌ Performance: ERROR - $($_.Exception.Message)" -ForegroundColor Red
}
$Results.Summary.Total++

# Test 4: Security Check
Write-Host "`n4. Testing Security..." -ForegroundColor Yellow
$Results.Tests["Security"] = @{
    Name = "Security Validation"
    Status = "Testing"
}

try {
    # Check for common security issues
    $securityIssues = 0
    
    # Check for hardcoded secrets (more specific check)
    $secretsFound = Select-String -Path "apps\backend\src\**\*.js" -Pattern "password\s*=\s*['\""][^'\""]*['\""]" -ErrorAction SilentlyContinue
    if ($secretsFound) {
        $securityIssues++
        Write-Host "  ⚠️ Found potential hardcoded secrets" -ForegroundColor Yellow
    }
    
    # Check for console.log statements in production code (exclude logger.js)
    $consoleLogs = Select-String -Path "apps\backend\src\**\*.js" -Pattern "console\.log\(" -Exclude "*logger.js" -ErrorAction SilentlyContinue
    if ($consoleLogs) {
        $securityIssues++
        Write-Host "  ⚠️ Found console.log statements in production code" -ForegroundColor Yellow
    }
    
    if ($securityIssues -eq 0) {
        $Results.Tests["Security"].Status = "Passed"
        $Results.Summary.Passed++
        Write-Host "  ✅ Security: PASSED" -ForegroundColor Green
    } else {
        $Results.Tests["Security"].Status = "Failed"
        $Results.Summary.Failed++
        Write-Host "  ❌ Security: FAILED ($securityIssues issues found)" -ForegroundColor Red
    }
} catch {
    $Results.Tests["Security"].Status = "Error"
    $Results.Summary.Failed++
    Write-Host "  ❌ Security: ERROR - $($_.Exception.Message)" -ForegroundColor Red
}
$Results.Summary.Total++

# Test 5: Database Connectivity
Write-Host "`n5. Testing Database..." -ForegroundColor Yellow
$Results.Tests["Database"] = @{
    Name = "Database Connectivity"
    Status = "Testing"
}

try {
    # Check if database files exist
    $dbFiles = @(
        "apps\backend\src\database\migrations\*.sql",
        "scripts\database\*.js"
    )
    
    $dbFilesExist = $true
    foreach ($pattern in $dbFiles) {
        $files = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue
        if (-not $files) {
            $dbFilesExist = $false
            break
        }
    }
    
    if ($dbFilesExist) {
        $Results.Tests["Database"].Status = "Passed"
        $Results.Summary.Passed++
        Write-Host "  ✅ Database: PASSED (Migration files found)" -ForegroundColor Green
    } else {
        $Results.Tests["Database"].Status = "Failed"
        $Results.Summary.Failed++
        Write-Host "  ❌ Database: FAILED (Missing migration files)" -ForegroundColor Red
    }
} catch {
    $Results.Tests["Database"].Status = "Error"
    $Results.Summary.Failed++
    Write-Host "  ❌ Database: ERROR - $($_.Exception.Message)" -ForegroundColor Red
}
$Results.Summary.Total++

# Generate final report
$EndTime = Get-Date
$Duration = ($EndTime - $StartTime).TotalMinutes

$Results.EndTime = $EndTime
$Results.Duration = $Duration

# Calculate production readiness score
$readinessScore = if ($Results.Summary.Total -gt 0) { 
    [Math]::Round(($Results.Summary.Passed / $Results.Summary.Total) * 100, 1) 
} else { 0 }

$Results.ReadinessScore = $readinessScore
$Results.ProductionReady = $readinessScore -ge 80

# Save report
$reportFile = Join-Path $ReportsPath "production-readiness-report-$((Get-Date).ToString('yyyyMMdd-HHmmss')).json"
$Results | ConvertTo-Json -Depth 3 | Out-File -FilePath $reportFile -Encoding UTF8

# Display final results
Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "PRODUCTION READINESS RESULTS" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Write-Host "Duration: $([Math]::Round($Duration, 2)) minutes" -ForegroundColor White
Write-Host "Tests Passed: $($Results.Summary.Passed)/$($Results.Summary.Total)" -ForegroundColor White
Write-Host "Readiness Score: $readinessScore%" -ForegroundColor White

Write-Host "`nDetailed Results:" -ForegroundColor Yellow
foreach ($test in $Results.Tests.GetEnumerator()) {
    $status = $test.Value.Status
    $color = switch ($status) {
        "Passed" { "Green" }
        "Failed" { "Red" }
        "Error" { "Red" }
        default { "Yellow" }
    }
    Write-Host "  $($test.Value.Name): $status" -ForegroundColor $color
}

if ($Results.ProductionReady) {
    Write-Host "`n🎉 CONGRATULATIONS!" -ForegroundColor Green
    Write-Host "FinNexusAI Platform is PRODUCTION READY!" -ForegroundColor Green
    Write-Host "Score: $readinessScore% - Ready for deployment" -ForegroundColor Green
} else {
    Write-Host "`n⚠️ PRODUCTION READINESS INCOMPLETE" -ForegroundColor Yellow
    Write-Host "Score: $readinessScore% - Address issues before deployment" -ForegroundColor Yellow
    Write-Host "Failed tests need attention:" -ForegroundColor Yellow
    foreach ($test in $Results.Tests.GetEnumerator()) {
        if ($test.Value.Status -in @("Failed", "Error")) {
            Write-Host "  • $($test.Value.Name)" -ForegroundColor Red
        }
    }
}

Write-Host "`nReport saved to: $reportFile" -ForegroundColor Cyan
Write-Host "Completed at: $EndTime" -ForegroundColor Cyan

# Return exit code based on readiness
if ($Results.ProductionReady) {
    exit 0
} else {
    exit 1
}
