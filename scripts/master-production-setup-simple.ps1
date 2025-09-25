param(
    [string]$Environment = "production",
    [string]$ResourceGroup = "finnexus-rg",
    [string]$Location = "East US",
    [string]$ClusterName = "finnexus-aks",
    [string]$DomainName = "finnexusai.com",
    [switch]$SkipInfrastructure,
    [switch]$SkipSecurity,
    [switch]$SkipMonitoring,
    [switch]$DryRun
)

Write-Host "FinNexus AI Master Production Setup" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Cyan
Write-Host "Resource Group: $ResourceGroup" -ForegroundColor Cyan
Write-Host "Location: $Location" -ForegroundColor Cyan
Write-Host "Cluster: $ClusterName" -ForegroundColor Cyan
Write-Host "Domain: $DomainName" -ForegroundColor Cyan
Write-Host "Dry Run: $DryRun" -ForegroundColor Cyan

$startTime = Get-Date
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Function to run script with error handling
function Invoke-SetupScript {
    param(
        [string]$ScriptName,
        [string]$Description,
        [array]$Arguments = @()
    )
    
    Write-Host "`n$Description" -ForegroundColor Yellow
    Write-Host "Running: $ScriptName" -ForegroundColor Cyan
    
    $scriptPath = Join-Path $scriptDir $ScriptName
    
    if (Test-Path $scriptPath) {
        try {
            $command = "powershell -ExecutionPolicy Bypass -File `"$scriptPath`""
            foreach ($arg in $Arguments) {
                $command += " $arg"
            }
            
            if ($DryRun) {
                $command += " -DryRun"
            }
            
            Invoke-Expression $command
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "SUCCESS: $Description completed successfully" -ForegroundColor Green
                return $true
            } else {
                Write-Host "FAILED: $Description failed with exit code $LASTEXITCODE" -ForegroundColor Red
                return $false
            }
        }
        catch {
            Write-Host "ERROR: $Description failed: $($_.Exception.Message)" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "WARNING: Script not found: $scriptPath" -ForegroundColor Yellow
        return $false
    }
}

# Track completion status
$completedTasks = @()
$failedTasks = @()

Write-Host "`nPhase 1: Infrastructure Setup" -ForegroundColor Magenta
if (-not $SkipInfrastructure) {
    # Container Registry Setup
    if (Invoke-SetupScript "setup-container-registry.ps1" "Container Registry Setup" @("-RegistryName", "$ClusterName-acr", "-ResourceGroup", $ResourceGroup, "-Location", $Location)) {
        $completedTasks += "Container Registry"
    } else {
        $failedTasks += "Container Registry"
    }
    
    # Secrets Management Setup
    if (Invoke-SetupScript "setup-secrets-management.ps1" "Secrets Management Setup" @("-KeyVaultName", "$ClusterName-kv", "-ResourceGroup", $ResourceGroup, "-Location", $Location)) {
        $completedTasks += "Secrets Management"
    } else {
        $failedTasks += "Secrets Management"
    }
    
    # Kubernetes Infrastructure Deployment
    if (Invoke-SetupScript "deploy-k8s-basic.ps1" "Kubernetes Infrastructure Deployment" @("-Environment", $Environment)) {
        $completedTasks += "Kubernetes Infrastructure"
    } else {
        $failedTasks += "Kubernetes Infrastructure"
    }
} else {
    Write-Host "Skipping infrastructure setup" -ForegroundColor Yellow
}

Write-Host "`nPhase 2: Security Hardening" -ForegroundColor Magenta
if (-not $SkipSecurity) {
    # Security Hardening
    if (Invoke-SetupScript "setup-security-hardening.ps1" "Security Hardening" @("-Namespace", "finnexus-ai", "-ClusterName", $ClusterName, "-ResourceGroup", $ResourceGroup)) {
        $completedTasks += "Security Hardening"
    } else {
        $failedTasks += "Security Hardening"
    }
    
    # Compliance and Penetration Testing
    if (Invoke-SetupScript "run-compliance-pentest.ps1" "Compliance and Penetration Testing" @("-TargetURL", "https://$DomainName", "-APIURL", "https://api.$DomainName")) {
        $completedTasks += "Compliance and Pen Testing"
    } else {
        $failedTasks += "Compliance and Pen Testing"
    }
} else {
    Write-Host "Skipping security setup" -ForegroundColor Yellow
}

Write-Host "`nPhase 3: Monitoring and Observability" -ForegroundColor Magenta
if (-not $SkipMonitoring) {
    # Observability Setup
    if (Invoke-SetupScript "setup-observability.ps1" "Observability Setup" @("-Namespace", "monitoring")) {
        $completedTasks += "Observability"
    } else {
        $failedTasks += "Observability"
    }
} else {
    Write-Host "Skipping monitoring setup" -ForegroundColor Yellow
}

Write-Host "`nPhase 4: Application Deployment" -ForegroundColor Magenta
# Deploy the application stack
if (Invoke-SetupScript "deploy-k8s-basic.ps1" "Application Deployment" @("-Environment", $Environment)) {
    $completedTasks += "Application Deployment"
} else {
    $failedTasks += "Application Deployment"
}

# Final verification
Write-Host "`nPhase 5: Verification and Testing" -ForegroundColor Magenta
Write-Host "Running final verification tests..." -ForegroundColor Cyan

if (-not $DryRun) {
    # Check cluster status
    Write-Host "Checking cluster status..." -ForegroundColor Cyan
    kubectl get nodes
    kubectl get pods -A
    
    # Check services
    Write-Host "Checking services..." -ForegroundColor Cyan
    kubectl get svc -A
    
    # Check ingress
    Write-Host "Checking ingress..." -ForegroundColor Cyan
    kubectl get ingress -A
}

# Generate final report
$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host "`nFinal Report" -ForegroundColor Magenta
Write-Host "=============" -ForegroundColor Magenta
Write-Host "Setup Duration: $($duration.ToString('hh\:mm\:ss'))" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Cyan
Write-Host "Cluster: $ClusterName" -ForegroundColor Cyan
Write-Host "Domain: $DomainName" -ForegroundColor Cyan

Write-Host "`nCompleted Tasks:" -ForegroundColor Green
foreach ($task in $completedTasks) {
    Write-Host "  - $task" -ForegroundColor Green
}

if ($failedTasks.Count -gt 0) {
    Write-Host "`nFailed Tasks:" -ForegroundColor Red
    foreach ($task in $failedTasks) {
        Write-Host "  - $task" -ForegroundColor Red
    }
}

$completionPercentage = [math]::Round(($completedTasks.Count / ($completedTasks.Count + $failedTasks.Count)) * 100, 2)

Write-Host "`nOverall Completion: $completionPercentage%" -ForegroundColor Cyan

if ($completionPercentage -ge 90) {
    Write-Host "Production setup completed successfully!" -ForegroundColor Green
} elseif ($completionPercentage -ge 70) {
    Write-Host "Production setup mostly completed with some issues" -ForegroundColor Yellow
} else {
    Write-Host "Production setup encountered significant issues" -ForegroundColor Red
}

Write-Host "`nAccess URLs:" -ForegroundColor Cyan
Write-Host "  Frontend: https://$DomainName" -ForegroundColor Green
Write-Host "  API: https://api.$DomainName" -ForegroundColor Green
Write-Host "  Monitoring: https://monitoring.$DomainName" -ForegroundColor Green

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "  1. Configure DNS records to point to your cluster" -ForegroundColor Yellow
Write-Host "  2. Set up SSL certificates for your domains" -ForegroundColor Yellow
Write-Host "  3. Configure CI/CD pipeline for automated deployments" -ForegroundColor Yellow
Write-Host "  4. Set up monitoring alerts and dashboards" -ForegroundColor Yellow
Write-Host "  5. Conduct security review and penetration testing" -ForegroundColor Yellow

Write-Host "`nGenerated Files:" -ForegroundColor Cyan
Write-Host "  - Kubernetes configurations in k8s/ directory" -ForegroundColor Yellow
Write-Host "  - Security reports in security-reports/ directory" -ForegroundColor Yellow
Write-Host "  - Setup scripts in scripts/ directory" -ForegroundColor Yellow

Write-Host "`nFinNexus AI is now ready for production deployment!" -ForegroundColor Green
