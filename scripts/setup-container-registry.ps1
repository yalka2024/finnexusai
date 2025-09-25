param(
    [string]$RegistryName = "finnexusai-registry",
    [string]$ResourceGroup = "finnexus-rg",
    [string]$Location = "East US",
    [switch]$DryRun
)

Write-Host "Setting up Container Registry for FinNexus AI" -ForegroundColor Cyan
Write-Host "Registry Name: $RegistryName" -ForegroundColor Cyan
Write-Host "Resource Group: $ResourceGroup" -ForegroundColor Cyan
Write-Host "Location: $Location" -ForegroundColor Cyan

# Check Azure CLI login
try {
    $context = az account show --query "user.name" -o tsv 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Not logged in to Azure CLI"
    }
    Write-Host "Connected to Azure as: $context" -ForegroundColor Green
}
catch {
    Write-Host "Please login to Azure CLI first: az login" -ForegroundColor Red
    exit 1
}

# Create resource group if it doesn't exist
Write-Host "Creating resource group..." -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "DRY RUN: Would create resource group $ResourceGroup" -ForegroundColor Yellow
} else {
    az group create --name $ResourceGroup --location $Location
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Resource group $ResourceGroup created successfully" -ForegroundColor Green
    }
}

# Create Azure Container Registry
Write-Host "Creating Azure Container Registry..." -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "DRY RUN: Would create ACR $RegistryName" -ForegroundColor Yellow
} else {
    az acr create --resource-group $ResourceGroup --name $RegistryName --sku Premium --admin-enabled true --location $Location
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Container Registry $RegistryName created successfully" -ForegroundColor Green
    }
}

# Get registry credentials
Write-Host "Getting registry credentials..." -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "DRY RUN: Would get registry credentials" -ForegroundColor Yellow
} else {
    $loginServer = az acr show --name $RegistryName --resource-group $ResourceGroup --query "loginServer" -o tsv
    $username = az acr credential show --name $RegistryName --resource-group $ResourceGroup --query "username" -o tsv
    $password = az acr credential show --name $RegistryName --resource-group $ResourceGroup --query "passwords[0].value" -o tsv
    
    Write-Host "Registry Details:" -ForegroundColor Green
    Write-Host "  Login Server: $loginServer" -ForegroundColor Green
    Write-Host "  Username: $username" -ForegroundColor Green
    Write-Host "  Password: [HIDDEN]" -ForegroundColor Green
    
    # Create Kubernetes secret for registry
    Write-Host "Creating Kubernetes registry secret..." -ForegroundColor Cyan
    kubectl create secret docker-registry acr-secret --docker-server=$loginServer --docker-username=$username --docker-password=$password --docker-email=admin@finnexusai.com --namespace=finnexus-ai
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Kubernetes registry secret created successfully" -ForegroundColor Green
    }
}

Write-Host "Container Registry setup completed!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Build and push your Docker images to $RegistryName" -ForegroundColor Yellow
Write-Host "2. Update your Kubernetes deployments to use the new registry" -ForegroundColor Yellow
Write-Host "3. Run the deployment script to apply changes" -ForegroundColor Yellow
