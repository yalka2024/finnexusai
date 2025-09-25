# ESLint-Fix.ps1

# Run ESLint fix
npx eslint . --fix --ext .js,.ts --max-warnings 0

# Count remaining issues
$lintOutput = npx eslint . --format json
$issues = ($lintOutput | ConvertFrom-Json).results | ForEach-Object { $_.messages.Count } | Measure-Object -Sum
$color = if ($issues.Sum -eq 0) { 'Green' } else { 'Yellow' }
Write-Host "Fixed linting. Remaining issues: $($issues.Sum)" -ForegroundColor $color

if ($issues.Sum -gt 0) {
    $lintOutput | ConvertFrom-Json | ForEach-Object { 
        $_.messages | ForEach-Object { Write-Host "$($_.filePath):$($_.line): $($_.message)" -ForegroundColor Red } 
    }
}
