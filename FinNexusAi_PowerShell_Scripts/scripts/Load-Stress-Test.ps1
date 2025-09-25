# Load-Stress-Test.ps1
# Requires: npm install -g artillery

param(
    [string]$TargetURL = "http://localhost:3000",
    [int]$Duration = 300  # 5 min
)

# Define simple YAML scenario (auto-generate)
$yamlScenario = @"
config:
  target: '$TargetURL'
  phases:
    - duration: $Duration
      arrivalRate: 10  # Ramp to 100 users
scenarios:
  - flow:
    - get:
        url: '/api/v1/portfolio'
"@
$yamlScenario | Out-File -FilePath "artillery-stress.yml" -Encoding UTF8

# Run stress test
npx artillery run artillery-stress.yml --output reports/stress-report.json

# Parse results for thresholds (e.g., <10ms latency as per audit)
$report = Get-Content "reports/stress-report.json" | ConvertFrom-Json
$avgLatency = $report.aggregate.latency.mean
if ($avgLatency -gt 10) {
    Write-Host "Stress test failed: Avg latency $avgLatency ms. Optimize Redis caching." -ForegroundColor Red
} else {
    Write-Host "Stress test passed: $avgLatency ms latency." -ForegroundColor Green
}
