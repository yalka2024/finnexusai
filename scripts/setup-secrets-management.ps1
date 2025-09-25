param(
    [string]$KeyVaultName = "finnexus-kv",
    [string]$ResourceGroup = "finnexus-rg",
    [string]$Location = "East US",
    [switch]$DryRun
)

Write-Host "Setting up Secrets Management for FinNexus AI" -ForegroundColor Cyan
Write-Host "Key Vault Name: $KeyVaultName" -ForegroundColor Cyan
Write-Host "Resource Group: $ResourceGroup" -ForegroundColor Cyan

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

# Create Key Vault
Write-Host "Creating Azure Key Vault..." -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "DRY RUN: Would create Key Vault $KeyVaultName" -ForegroundColor Yellow
} else {
    az keyvault create --resource-group $ResourceGroup --name $KeyVaultName --location $Location --sku standard --enable-rbac-authorization true
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Key Vault $KeyVaultName created successfully" -ForegroundColor Green
    }
}

# Generate and store secrets
Write-Host "Generating and storing secrets..." -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "DRY RUN: Would generate and store secrets" -ForegroundColor Yellow
} else {
    # Generate secure secrets
    $jwtSecret = -join ((65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
    $dbPassword = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    $encryptionKey = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    $apiKey = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 40 | ForEach-Object {[char]$_})
    
    # Store secrets in Key Vault
    az keyvault secret set --vault-name $KeyVaultName --name "jwt-secret" --value $jwtSecret
    az keyvault secret set --vault-name $KeyVaultName --name "db-password" --value $dbPassword
    az keyvault secret set --vault-name $KeyVaultName --name "encryption-key" --value $encryptionKey
    az keyvault secret set --vault-name $KeyVaultName --name "api-key" --value $apiKey
    az keyvault secret set --vault-name $KeyVaultName --name "domain-name" --value "finnexusai.com"
    
    Write-Host "Secrets stored in Key Vault successfully" -ForegroundColor Green
}

# Create Kubernetes secret for Key Vault integration
Write-Host "Creating Kubernetes secrets..." -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "DRY RUN: Would create Kubernetes secrets" -ForegroundColor Yellow
} else {
    # Create namespace if it doesn't exist
    kubectl create namespace finnexus-ai --dry-run=client -o yaml | kubectl apply -f -
    
    # Create generic secret with placeholder values (will be updated by CI/CD)
    kubectl create secret generic finnexus-secrets --from-literal=jwt-secret="placeholder" --from-literal=db-password="placeholder" --from-literal=encryption-key="placeholder" --from-literal=api-key="placeholder" --namespace=finnexus-ai --dry-run=client -o yaml | kubectl apply -f -
    
    Write-Host "Kubernetes secrets created successfully" -ForegroundColor Green
}

# Install External Secrets Operator for automatic secret sync
Write-Host "Installing External Secrets Operator..." -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "DRY RUN: Would install External Secrets Operator" -ForegroundColor Yellow
} else {
    # Install via Helm
    helm repo add external-secrets https://charts.external-secrets.io
    helm repo update
    helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace
    
    Write-Host "External Secrets Operator installed successfully" -ForegroundColor Green
}

Write-Host "Secrets Management setup completed!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Configure External Secrets to sync from Azure Key Vault" -ForegroundColor Yellow
Write-Host "2. Update your applications to use the synced secrets" -ForegroundColor Yellow
Write-Host "3. Set up automatic secret rotation policies" -ForegroundColor Yellow
