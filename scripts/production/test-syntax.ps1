# Test script to verify PowerShell syntax
param(
    [string]$TestMessage = "Hello World"
)

Write-Host "Testing PowerShell syntax..." -ForegroundColor Green
Write-Host "Message: $TestMessage" -ForegroundColor White
Write-Host "✅ Syntax test passed!" -ForegroundColor Green
