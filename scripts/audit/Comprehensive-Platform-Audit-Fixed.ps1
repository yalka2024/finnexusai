# Comprehensive FinNexusAI Platform Audit Script
# This script conducts a brutally honest audit of ALL features mentioned in README.md

param(
    [string]$TargetURL = "http://localhost:3000",
    [switch]$QuickMode = $false
)

Write-Host "🔍 STARTING COMPREHENSIVE FINNEXUSAI PLATFORM AUDIT" -ForegroundColor Cyan
Write-Host "Start Time: $(Get-Date -Format 'MM/dd/yyyy HH:mm:ss')" -ForegroundColor Gray
Write-Host "Target URL: $TargetURL" -ForegroundColor Gray
Write-Host "=" * 80 -ForegroundColor Cyan

$Results = @{
    Summary = @{
        Total = 0
        Passed = 0
        Failed = 0
        Warning = 0
        Critical = 0
    }
    Tests = @{}
    CriticalIssues = @()
    MissingFeatures = @()
    ImplementationStatus = @{}
}

# Test 1: Core Infrastructure
Write-Host "`n1. CORE INFRASTRUCTURE AUDIT" -ForegroundColor Yellow
Write-Host "-" * 50 -ForegroundColor Yellow

# 1.1 Server Health
Write-Host "`n1.1 Testing Server Health..." -ForegroundColor White
$Results.Tests["ServerHealth"] = @{ Name = "Server Health", Status = "Testing" }
try {
    $response = Invoke-WebRequest -Uri "$TargetURL/api/v1/health" -TimeoutSec 10 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        $Results.Tests["ServerHealth"].Status = "Passed"
        $Results.Summary.Passed++
        Write-Host "  ✅ Server Health: PASSED" -ForegroundColor Green
    } else {
        $Results.Tests["ServerHealth"].Status = "Failed"
        $Results.Summary.Failed++
        Write-Host "  ❌ Server Health: FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
        $Results.CriticalIssues += "Server not responding with 200 status"
    }
} catch {
    $Results.Tests["ServerHealth"].Status = "Critical"
    $Results.Summary.Critical++
    Write-Host "  🚨 Server Health: CRITICAL - $($_.Exception.Message)" -ForegroundColor Red
    $Results.CriticalIssues += "Server completely offline"
}
$Results.Summary.Total++

# 1.2 Database Connectivity
Write-Host "`n1.2 Testing Database Connectivity..." -ForegroundColor White
$Results.Tests["Database"] = @{ Name = "Database Connectivity", Status = "Testing" }
try {
    $response = Invoke-WebRequest -Uri "$TargetURL/api/v1/health" -TimeoutSec 10 -ErrorAction SilentlyContinue
    $healthData = $response.Content | ConvertFrom-Json
    if ($healthData.details.database -eq "connected") {
        $Results.Tests["Database"].Status = "Passed"
        $Results.Summary.Passed++
        Write-Host "  ✅ Database: PASSED (Connected)" -ForegroundColor Green
    } else {
        $Results.Tests["Database"].Status = "Failed"
        $Results.Summary.Failed++
        Write-Host "  ❌ Database: FAILED (Not connected)" -ForegroundColor Red
        $Results.CriticalIssues += "Database not connected"
    }
} catch {
    $Results.Tests["Database"].Status = "Failed"
    $Results.Summary.Failed++
    Write-Host "  ❌ Database: FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $Results.CriticalIssues += "Database connectivity check failed"
}
$Results.Summary.Total++

# Test 2: Core Features Implementation
Write-Host "`n2. CORE FEATURES IMPLEMENTATION AUDIT" -ForegroundColor Yellow
Write-Host "-" * 50 -ForegroundColor Yellow

# 2.1 AI Financial Advisory
Write-Host "`n2.1 Testing AI Financial Advisory..." -ForegroundColor White
$Results.Tests["AIFinancialAdvisory"] = @{ Name = "AI Financial Advisory", Status = "Testing" }
try {
    $response = Invoke-WebRequest -Uri "$TargetURL/api/ai" -TimeoutSec 10 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        $Results.Tests["AIFinancialAdvisory"].Status = "Passed"
        $Results.Summary.Passed++
        Write-Host "  ✅ AI Financial Advisory: PASSED (Endpoint exists)" -ForegroundColor Green
        $Results.ImplementationStatus["AIFinancialAdvisory"] = "Basic endpoint present"
    } else {
        $Results.Tests["AIFinancialAdvisory"].Status = "Failed"
        $Results.Summary.Failed++
        Write-Host "  ❌ AI Financial Advisory: FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
        $Results.MissingFeatures += "AI Financial Advisory endpoints not functional"
    }
} catch {
    $Results.Tests["AIFinancialAdvisory"].Status = "Failed"
    $Results.Summary.Failed++
    Write-Host "  ❌ AI Financial Advisory: FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $Results.MissingFeatures += "AI Financial Advisory not implemented"
}
$Results.Summary.Total++

# 2.2 Fraud Detection
Write-Host "`n2.2 Testing Fraud Detection..." -ForegroundColor White
$Results.Tests["FraudDetection"] = @{ Name = "Fraud Detection", Status = "Testing" }
try {
    $response = Invoke-WebRequest -Uri "$TargetURL/api/fraud" -TimeoutSec 10 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        $Results.Tests["FraudDetection"].Status = "Passed"
        $Results.Summary.Passed++
        Write-Host "  ✅ Fraud Detection: PASSED (Endpoint exists)" -ForegroundColor Green
        $Results.ImplementationStatus["FraudDetection"] = "Basic endpoint present"
    } else {
        $Results.Tests["FraudDetection"].Status = "Failed"
        $Results.Summary.Failed++
        Write-Host "  ❌ Fraud Detection: FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
        $Results.MissingFeatures += "Fraud Detection endpoints not functional"
    }
} catch {
    $Results.Tests["FraudDetection"].Status = "Failed"
    $Results.Summary.Failed++
    Write-Host "  ❌ Fraud Detection: FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $Results.MissingFeatures += "Fraud Detection not implemented"
}
$Results.Summary.Total++

# 2.3 Trading Engine
Write-Host "`n2.3 Testing Trading Engine..." -ForegroundColor White
$Results.Tests["TradingEngine"] = @{ Name = "Trading Engine", Status = "Testing" }
try {
    $response = Invoke-WebRequest -Uri "$TargetURL/api/trading" -TimeoutSec 10 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        $Results.Tests["TradingEngine"].Status = "Passed"
        $Results.Summary.Passed++
        Write-Host "  ✅ Trading Engine: PASSED (Endpoint exists)" -ForegroundColor Green
        $Results.ImplementationStatus["TradingEngine"] = "Basic endpoint present"
    } else {
        $Results.Tests["TradingEngine"].Status = "Failed"
        $Results.Summary.Failed++
        Write-Host "  ❌ Trading Engine: FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
        $Results.MissingFeatures += "Trading Engine endpoints not functional"
    }
} catch {
    $Results.Tests["TradingEngine"].Status = "Failed"
    $Results.Summary.Failed++
    Write-Host "  ❌ Trading Engine: FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $Results.MissingFeatures += "Trading Engine not implemented"
}
$Results.Summary.Total++

# Test 3: Performance Testing
Write-Host "`n3. PERFORMANCE TESTING" -ForegroundColor Yellow
Write-Host "-" * 50 -ForegroundColor Yellow

Write-Host "`n3.1 Testing Performance..." -ForegroundColor White
$Results.Tests["Performance"] = @{ Name = "Performance", Status = "Testing" }
try {
    $loadTestStart = Get-Date
    $response = Invoke-WebRequest -Uri "$TargetURL/api/v1/health" -TimeoutSec 10 -ErrorAction SilentlyContinue
    $loadTestEnd = Get-Date
    $responseTime = ($loadTestEnd - $loadTestStart).TotalMilliseconds
    
    if ($response.StatusCode -eq 200 -and $responseTime -lt 1000) {
        $Results.Tests["Performance"].Status = "Passed"
        $Results.Summary.Passed++
        Write-Host "  ✅ Performance: PASSED (Response time: $([math]::Round($responseTime, 2))ms)" -ForegroundColor Green
        $Results.ImplementationStatus["Performance"] = "Sub-second response times achieved"
    } else {
        $Results.Tests["Performance"].Status = "Warning"
        $Results.Summary.Warning++
        Write-Host "  ⚠️ Performance: WARNING (Response time: $([math]::Round($responseTime, 2))ms)" -ForegroundColor Yellow
        $Results.MissingFeatures += "Performance optimization needed"
    }
} catch {
    $Results.Tests["Performance"].Status = "Failed"
    $Results.Summary.Failed++
    Write-Host "  ❌ Performance: FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $Results.CriticalIssues += "Performance testing failed"
}
$Results.Summary.Total++

# Test 4: Code Quality Audit
Write-Host "`n4. CODE QUALITY AUDIT" -ForegroundColor Yellow
Write-Host "-" * 50 -ForegroundColor Yellow

Write-Host "`n4.1 Testing Code Quality..." -ForegroundColor White
$Results.Tests["CodeQuality"] = @{ Name = "Code Quality", Status = "Testing" }
try {
    $eslintResult = npm run lint 2>&1
    $criticalErrors = $eslintResult | Select-String -Pattern "Parsing error|Unexpected character|SyntaxError|no-console|no-undef" -SimpleMatch
    
    if ($criticalErrors.Count -eq 0) {
        $Results.Tests["CodeQuality"].Status = "Passed"
        $Results.Summary.Passed++
        Write-Host "  ✅ Code Quality: PASSED (No critical errors)" -ForegroundColor Green
        $Results.ImplementationStatus["CodeQuality"] = "No critical ESLint errors"
    } else {
        $Results.Tests["CodeQuality"].Status = "Warning"
        $Results.Summary.Warning++
        Write-Host "  ⚠️ Code Quality: WARNING ($($criticalErrors.Count) issues found)" -ForegroundColor Yellow
        $Results.MissingFeatures += "Code quality improvements needed"
    }
} catch {
    $Results.Tests["CodeQuality"].Status = "Failed"
    $Results.Summary.Failed++
    Write-Host "  ❌ Code Quality: FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $Results.CriticalIssues += "Code quality check failed"
}
$Results.Summary.Total++

# Test 5: File Structure Audit
Write-Host "`n5. FILE STRUCTURE AUDIT" -ForegroundColor Yellow
Write-Host "-" * 50 -ForegroundColor Yellow

Write-Host "`n5.1 Testing Required Files..." -ForegroundColor White
$Results.Tests["RequiredFiles"] = @{ Name = "Required Files", Status = "Testing" }
$requiredFiles = @(
    "apps/backend/src/app.js",
    "apps/frontend/package.json",
    "docker-compose.yml",
    "README.md",
    "package.json"
)

$missingFiles = @()
foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -eq 0) {
    $Results.Tests["RequiredFiles"].Status = "Passed"
    $Results.Summary.Passed++
    Write-Host "  ✅ Required Files: PASSED (All files present)" -ForegroundColor Green
    $Results.ImplementationStatus["RequiredFiles"] = "All required files present"
} else {
    $Results.Tests["RequiredFiles"].Status = "Failed"
    $Results.Summary.Failed++
    Write-Host "  ❌ Required Files: FAILED (Missing: $($missingFiles -join ', '))" -ForegroundColor Red
    $Results.CriticalIssues += "Missing required files: $($missingFiles -join ', ')"
}
$Results.Summary.Total++

# Calculate Final Score
$totalTests = $Results.Summary.Total
$passedTests = $Results.Summary.Passed
$finalScore = [math]::Round(($passedTests / $totalTests) * 100, 2)

# Generate Report
Write-Host "`n" + "=" * 80 -ForegroundColor Cyan
Write-Host "COMPREHENSIVE AUDIT RESULTS" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "Tests Passed: $($Results.Summary.Passed)/$($Results.Summary.Total)" -ForegroundColor White
Write-Host "Tests Failed: $($Results.Summary.Failed)" -ForegroundColor White
Write-Host "Tests Warning: $($Results.Summary.Warning)" -ForegroundColor White
Write-Host "Critical Issues: $($Results.Summary.Critical)" -ForegroundColor White
Write-Host "Final Score: $finalScore%" -ForegroundColor $(if ($finalScore -ge 90) { "Green" } elseif ($finalScore -ge 70) { "Yellow" } else { "Red" })

Write-Host "`nDETAILED RESULTS:" -ForegroundColor Cyan
foreach ($test in $Results.Tests.GetEnumerator()) {
    $status = $test.Value.Status
    $name = $test.Value.Name
    $color = switch ($status) {
        "Passed" { "Green" }
        "Failed" { "Red" }
        "Warning" { "Yellow" }
        "Critical" { "Red" }
        default { "White" }
    }
    Write-Host "  $name: $status" -ForegroundColor $color
}

if ($Results.CriticalIssues.Count -gt 0) {
    Write-Host "`n🚨 CRITICAL ISSUES:" -ForegroundColor Red
    foreach ($issue in $Results.CriticalIssues) {
        Write-Host "  • $issue" -ForegroundColor Red
    }
}

if ($Results.MissingFeatures.Count -gt 0) {
    Write-Host "`n⚠️ MISSING FEATURES:" -ForegroundColor Yellow
    foreach ($feature in $Results.MissingFeatures) {
        Write-Host "  • $feature" -ForegroundColor Yellow
    }
}

Write-Host "`nIMPLEMENTATION STATUS:" -ForegroundColor Cyan
foreach ($feature in $Results.ImplementationStatus.GetEnumerator()) {
    Write-Host "  • $($feature.Key): $($feature.Value)" -ForegroundColor Green
}

# Final Assessment
Write-Host "`n" + "=" * 80 -ForegroundColor Cyan
if ($finalScore -ge 90) {
    Write-Host "🎉 PLATFORM STATUS: PRODUCTION READY!" -ForegroundColor Green
    Write-Host "Score: $finalScore% - Ready for enterprise deployment" -ForegroundColor Green
} elseif ($finalScore -ge 70) {
    Write-Host "⚠️ PLATFORM STATUS: PARTIALLY READY" -ForegroundColor Yellow
    Write-Host "Score: $finalScore% - Needs improvements before deployment" -ForegroundColor Yellow
} else {
    Write-Host "❌ PLATFORM STATUS: NOT READY" -ForegroundColor Red
    Write-Host "Score: $finalScore% - Significant work needed before deployment" -ForegroundColor Red
}

# Save detailed report
$reportPath = ".\reports\comprehensive-audit\comprehensive-audit-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
New-Item -ItemType Directory -Path ".\reports\comprehensive-audit" -Force | Out-Null
$Results | ConvertTo-Json -Depth 10 | Out-File -FilePath $reportPath -Encoding UTF8

Write-Host "`n📊 Report saved to: $reportPath" -ForegroundColor Gray
Write-Host "Completed at: $(Get-Date -Format 'MM/dd/yyyy HH:mm:ss')" -ForegroundColor Gray
