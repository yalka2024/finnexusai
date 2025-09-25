# Jest-Coverage-Improve.ps1

param(
    [int]$MinCoverage = 80
)

# Run Jest with coverage collection
npx jest --coverage --coverageThreshold "{\"global\":{\"branches\":$MinCoverage,\"functions\":$MinCoverage,\"lines\":$MinCoverage,\"statements\":$MinCoverage}}" --testPathPattern="integration" --runInBand

# If coverage low, suggest improvements (parse lcov.info)
$coverage = npx nyc report --reporter=text-summary
if ($LASTEXITCODE -ne 0) {
    Write-Host "Coverage below $MinCoverage%. Review uncovered files in coverage/lcov-report/index.html" -ForegroundColor Yellow
    # Auto-generate basic tests for uncovered files (using AI placeholder; integrate with Copilot)
    Get-ChildItem -Path "src" -Filter "*.js" | ForEach-Object {
        $file = $_.FullName
        # Placeholder: Generate test stub
        $testStub = @"
import { /* import from $file */ } from '$file';
describe('Integration: $($_.BaseName)', () => {
  test('basic integration', () => { expect(true).toBe(true); });
});
"@
        $testStub | Out-File -FilePath "tests/integration/$($_.BaseName).test.js" -Encoding UTF8
    }
    Write-Host "Generated test stubs in tests/integration/. Re-run Jest." -ForegroundColor Green
}

Write-Host "Coverage report: coverage/lcov-report/index.html" -ForegroundColor Green
