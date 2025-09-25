# Load-Stress-Test.ps1
# Comprehensive Load and Stress Testing for FinNexusAI
# Uses Artillery for load testing and custom stress testing scenarios

param(
    [string]$TargetURL = "http://localhost:3000",
    [string]$HTTPSURL = "https://demo.finainexus.com",
    [int]$Duration = 300,  # 5 minutes
    [int]$ArrivalRate = 10,
    [int]$MaxUsers = 1000,
    [string]$ReportsPath = ".\reports\load-testing"
)

Write-Host "🚀 Starting FinNexusAI Load and Stress Testing..." -ForegroundColor Cyan

# Create reports directory
if (-not (Test-Path $ReportsPath)) {
    New-Item -ItemType Directory -Path $ReportsPath -Force
    Write-Host "✅ Created load testing reports directory: $ReportsPath" -ForegroundColor Green
}

# Install Artillery if not present
Write-Host "📦 Installing Artillery for load testing..." -ForegroundColor Yellow
npm install -g artillery
Write-Host "✅ Artillery installed successfully" -ForegroundColor Green

$currentDate = Get-Date -Format 'yyyyMMdd-HHmmss'

# Define comprehensive load testing scenarios
$scenarios = @(
    @{
        Name = "Basic Load Test"
        Description = "Standard user load testing"
        ArrivalRate = $ArrivalRate
        Duration = $Duration
        MaxUsers = $MaxUsers
    },
    @{
        Name = "Stress Test"
        Description = "High load stress testing"
        ArrivalRate = $ArrivalRate * 3
        Duration = $Duration
        MaxUsers = $MaxUsers * 2
    },
    @{
        Name = "Spike Test"
        Description = "Sudden traffic spikes"
        ArrivalRate = $ArrivalRate * 5
        Duration = 60  # 1 minute spike
        MaxUsers = $MaxUsers
    },
    @{
        Name = "Endurance Test"
        Description = "Long-running stability test"
        ArrivalRate = $ArrivalRate
        Duration = $Duration * 4  # 20 minutes
        MaxUsers = $MaxUsers
    }
)

# Create Artillery configuration for each scenario
foreach ($scenario in $scenarios) {
    Write-Host "🔧 Creating Artillery configuration for: $($scenario.Name)" -ForegroundColor Yellow
    
    $artilleryConfig = @"
config:
  target: '$TargetURL'
  phases:
    - duration: $($scenario.Duration)
      arrivalRate: $($scenario.ArrivalRate)
      name: "$($scenario.Name)"
  defaults:
    headers:
      User-Agent: "FinNexusAI-LoadTest/1.0"
      Accept: "application/json"
  variables:
    symbols: ["BTC", "ETH", "ADA", "SOL", "MATIC"]
    amounts: [100, 500, 1000, 5000]
scenarios:
  - name: "Health Check"
    weight: 10
    flow:
      - get:
          url: "/health"
          expect:
            - statusCode: 200
            - hasHeader: "content-type"
  
  - name: "Authentication Flow"
    weight: 20
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "loadtest@finnexusai.com"
            password: "LoadTest123!"
          expect:
            - statusCode: [200, 401]
      - get:
          url: "/api/auth/verify"
          headers:
            Authorization: "Bearer {{ authToken }}"
          expect:
            - statusCode: [200, 401]
  
  - name: "Trading Operations"
    weight: 30
    flow:
      - get:
          url: "/api/trade/buy"
          qs:
            symbol: "{{ symbols | random }}"
            amount: "{{ amounts | random }}"
          expect:
            - statusCode: [200, 401]
            - contentType: "application/json"
      - get:
          url: "/api/trade/sell"
          qs:
            symbol: "{{ symbols | random }}"
            amount: "{{ amounts | random }}"
          expect:
            - statusCode: [200, 401]
  
  - name: "AI Predictions"
    weight: 25
    flow:
      - get:
          url: "/api/ai/predict"
          qs:
            symbol: "{{ symbols | random }}"
          expect:
            - statusCode: [200, 401]
            - json: "$.prediction.sentiment"
  
  - name: "Sharia Compliance"
    weight: 15
    flow:
      - get:
          url: "/api/sharia/validate"
          qs:
            trade: "USD-{{ symbols | random }}"
          expect:
            - statusCode: [200, 401]
            - json: "$.validation.isHalal"
"@

    $configFile = Join-Path $ReportsPath "$($scenario.Name.Replace(' ', '-').ToLower())-config.yml"
    $artilleryConfig | Out-File -FilePath $configFile -Encoding UTF8
    Write-Host "   ✅ Configuration saved: $configFile" -ForegroundColor Green
}

# Run load tests for each scenario
foreach ($scenario in $scenarios) {
    Write-Host "🧪 Running $($scenario.Name)..." -ForegroundColor Cyan
    Write-Host "   Duration: $($scenario.Duration) seconds" -ForegroundColor White
    Write-Host "   Arrival Rate: $($scenario.ArrivalRate) users/second" -ForegroundColor White
    Write-Host "   Max Users: $($scenario.MaxUsers)" -ForegroundColor White
    
    $configFile = Join-Path $ReportsPath "$($scenario.Name.Replace(' ', '-').ToLower())-config.yml"
    $reportFile = Join-Path $ReportsPath "$($scenario.Name.Replace(' ', '-').ToLower())-report-$currentDate.json"
    $summaryFile = Join-Path $ReportsPath "$($scenario.Name.Replace(' ', '-').ToLower())-summary-$currentDate.txt"
    
    try {
        # Run Artillery test
        $artilleryOutput = artillery run $configFile --output $reportFile 2>&1
        
        # Parse results
        $report = Get-Content $reportFile | ConvertFrom-Json
        
        # Extract key metrics
        $metrics = $report.aggregate
        $avgLatency = [Math]::Round($metrics.latency.mean, 2)
        $maxLatency = [Math]::Round($metrics.latency.max, 2)
        $minLatency = [Math]::Round($metrics.latency.min, 2)
        $totalRequests = $metrics.counters.requests
        $totalErrors = $metrics.counters.errors
        $successRate = [Math]::Round((($totalRequests - $totalErrors) / $totalRequests) * 100, 2)
        
        # Performance thresholds (as per audit requirements)
        $latencyThreshold = 10  # 10ms as per audit
        $successThreshold = 99.9  # 99.9% success rate
        
        # Generate summary
        $summary = @"
FinNexusAI Load Test Summary - $($scenario.Name)
================================================
Test Duration: $($scenario.Duration) seconds
Arrival Rate: $($scenario.ArrivalRate) users/second
Max Users: $($scenario.MaxUsers)

PERFORMANCE METRICS:
===================
Total Requests: $totalRequests
Total Errors: $totalErrors
Success Rate: $successRate%
Average Latency: $avgLatency ms
Min Latency: $minLatency ms
Max Latency: $maxLatency ms

PERFORMANCE EVALUATION:
======================
Latency Target (< $latencyThreshold ms): $(if ($avgLatency -le $latencyThreshold) { '✅ PASS' } else { '❌ FAIL' })
Success Rate Target (> $successThreshold%): $(if ($successRate -ge $successThreshold) { '✅ PASS' } else { '❌ FAIL' })

RECOMMENDATIONS:
===============
$(if ($avgLatency -gt $latencyThreshold) { '- Optimize database queries and add caching' } else { '- Latency performance is excellent' })
$(if ($successRate -lt $successThreshold) { '- Investigate error causes and improve error handling' } else { '- Success rate meets enterprise standards' })
$(if ($maxLatency -gt $avgLatency * 5) { '- Address latency spikes with connection pooling' } else { '- Latency consistency is good' })

Test Report: $reportFile
Generated: $(Get-Date)
"@

        $summary | Out-File -FilePath $summaryFile -Encoding UTF8
        
        Write-Host "   📊 Results Summary:" -ForegroundColor Cyan
        Write-Host "      Total Requests: $totalRequests" -ForegroundColor White
        Write-Host "      Success Rate: $successRate%" -ForegroundColor White
        Write-Host "      Avg Latency: $avgLatency ms" -ForegroundColor White
        Write-Host "      Max Latency: $maxLatency ms" -ForegroundColor White
        
        # Evaluate performance
        if ($avgLatency -le $latencyThreshold -and $successRate -ge $successThreshold) {
            Write-Host "   ✅ $($scenario.Name) PASSED performance requirements" -ForegroundColor Green
        } else {
            Write-Host "   ❌ $($scenario.Name) FAILED performance requirements" -ForegroundColor Red
            if ($avgLatency -gt $latencyThreshold) {
                Write-Host "      ⚠️ Average latency ($avgLatency ms) exceeds threshold ($latencyThreshold ms)" -ForegroundColor Yellow
            }
            if ($successRate -lt $successThreshold) {
                Write-Host "      ⚠️ Success rate ($successRate%) below threshold ($successThreshold%)" -ForegroundColor Yellow
            }
        }
        
    } catch {
        Write-Host "   ❌ $($scenario.Name) failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# High-Frequency Trading (HFT) Stress Test
Write-Host "⚡ Running High-Frequency Trading Stress Test..." -ForegroundColor Cyan

$hftConfig = @"
config:
  target: '$TargetURL'
  phases:
    - duration: 60
      arrivalRate: 1000
      name: "HFT Stress Test"
  defaults:
    headers:
      User-Agent: "FinNexusAI-HFT-Test/1.0"
scenarios:
  - name: "Ultra-Fast Trading"
    weight: 100
    flow:
      - loop:
          - get:
              url: "/api/trade/buy"
              qs:
                symbol: "BTC"
                amount: "1"
          - get:
              url: "/api/trade/sell"
              qs:
                symbol: "BTC"
                amount: "1"
          - get:
              url: "/api/ai/predict"
              qs:
                symbol: "BTC"
        count: 10
"@

$hftConfigFile = Join-Path $ReportsPath "hft-stress-config.yml"
$hftReportFile = Join-Path $ReportsPath "hft-stress-report-$currentDate.json"
$hftConfig | Out-File -FilePath $hftConfigFile -Encoding UTF8

try {
    Write-Host "   🚀 Executing HFT stress test (1000 requests/second)..." -ForegroundColor Yellow
    artillery run $hftConfigFile --output $hftReportFile
    
    $hftReport = Get-Content $hftReportFile | ConvertFrom-Json
    $hftLatency = [Math]::Round($hftReport.aggregate.latency.mean, 2)
    
    if ($hftLatency -lt 1) {
        Write-Host "   ✅ HFT Test PASSED - Sub-millisecond execution ($hftLatency ms)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ HFT Test - Latency higher than expected ($hftLatency ms)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ HFT stress test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Generate comprehensive load testing report
$loadTestReport = @{
    TestRun = $currentDate
    TargetURL = $TargetURL
    Scenarios = $scenarios
    Summary = @{
        TotalTests = $scenarios.Count
        PassedTests = 0
        FailedTests = 0
        AverageLatency = 0
        MinLatency = [Double]::MaxValue
        MaxLatency = 0
        OverallSuccessRate = 0
    }
    Recommendations = @()
    PerformanceMetrics = @{
        LatencyThreshold = 10
        SuccessRateThreshold = 99.9
        HFTLatencyThreshold = 1
    }
}

# Analyze all test results
$totalRequests = 0
$totalErrors = 0
$totalLatency = 0
$testCount = 0

foreach ($scenario in $scenarios) {
    $reportFile = Join-Path $ReportsPath "$($scenario.Name.Replace(' ', '-').ToLower())-report-$currentDate.json"
    if (Test-Path $reportFile) {
        try {
            $report = Get-Content $reportFile | ConvertFrom-Json
            $metrics = $report.aggregate
            
            $totalRequests += $metrics.counters.requests
            $totalErrors += $metrics.counters.errors
            $totalLatency += $metrics.latency.mean
            
            $avgLatency = $metrics.latency.mean
            $successRate = (($metrics.counters.requests - $metrics.counters.errors) / $metrics.counters.requests) * 100
            
            if ($avgLatency -le 10 -and $successRate -ge 99.9) {
                $loadTestReport.Summary.PassedTests++
            } else {
                $loadTestReport.Summary.FailedTests++
            }
            
            $loadTestReport.Summary.MinLatency = [Math]::Min($loadTestReport.Summary.MinLatency, $avgLatency)
            $loadTestReport.Summary.MaxLatency = [Math]::Max($loadTestReport.Summary.MaxLatency, $avgLatency)
            
            $testCount++
        } catch {
            Write-Host "   ⚠️ Could not parse report for $($scenario.Name)" -ForegroundColor Yellow
        }
    }
}

if ($testCount -gt 0) {
    $loadTestReport.Summary.AverageLatency = [Math]::Round($totalLatency / $testCount, 2)
    $loadTestReport.Summary.OverallSuccessRate = [Math]::Round((($totalRequests - $totalErrors) / $totalRequests) * 100, 2)
}

# Generate recommendations
if ($loadTestReport.Summary.AverageLatency -gt 10) {
    $loadTestReport.Recommendations += "Optimize database queries and implement Redis caching for better latency"
}
if ($loadTestReport.Summary.OverallSuccessRate -lt 99.9) {
    $loadTestReport.Recommendations += "Investigate error causes and improve error handling mechanisms"
}
if ($loadTestReport.Summary.MaxLatency -gt $loadTestReport.Summary.AverageLatency * 3) {
    $loadTestReport.Recommendations += "Address latency spikes with connection pooling and load balancing"
}

$loadTestReport.Recommendations += "Implement horizontal pod autoscaling for traffic spikes"
$loadTestReport.Recommendations += "Add circuit breakers for external service calls"
$loadTestReport.Recommendations += "Monitor and alert on performance degradation"

# Save comprehensive report
$finalReportFile = Join-Path $ReportsPath "load-testing-comprehensive-report-$currentDate.json"
$loadTestReport | ConvertTo-Json -Depth 4 | Out-File -FilePath $finalReportFile -Encoding UTF8

Write-Host "✅ Load and Stress Testing completed!" -ForegroundColor Green
Write-Host "📊 Comprehensive Results:" -ForegroundColor Cyan
Write-Host "   Total Tests: $($loadTestReport.Summary.TotalTests)" -ForegroundColor White
Write-Host "   Passed: $($loadTestReport.Summary.PassedTests)" -ForegroundColor White
Write-Host "   Failed: $($loadTestReport.Summary.FailedTests)" -ForegroundColor White
Write-Host "   Average Latency: $($loadTestReport.Summary.AverageLatency) ms" -ForegroundColor White
Write-Host "   Overall Success Rate: $($loadTestReport.Summary.OverallSuccessRate)%" -ForegroundColor White
Write-Host "   Comprehensive Report: $finalReportFile" -ForegroundColor White

# Performance evaluation
if ($loadTestReport.Summary.PassedTests -eq $loadTestReport.Summary.TotalTests) {
    Write-Host "🎉 ALL LOAD TESTS PASSED - System ready for production traffic!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Some load tests failed - Review recommendations before production deployment" -ForegroundColor Yellow
}

Write-Host "💡 Recommendations:" -ForegroundColor Yellow
foreach ($recommendation in $loadTestReport.Recommendations) {
    Write-Host "   • $recommendation" -ForegroundColor Gray
}
