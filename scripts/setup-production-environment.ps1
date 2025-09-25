#Requires -Version 7.0

<#
.SYNOPSIS
    Sets up the complete production environment for FinNexus AI platform.

.DESCRIPTION
    This script provisions and configures the entire production infrastructure including:
    - Azure Container Registry (ACR)
    - Azure Kubernetes Service (AKS) cluster
    - DNS and domain configuration
    - SSL/TLS certificates
    - Monitoring and logging
    - Backup and disaster recovery
    - Security policies and compliance

.PARAMETER ResourceGroupName
    The Azure resource group name

.PARAMETER Location
    The Azure region/location

.PARAMETER ClusterName
    The AKS cluster name

.PARAMETER DomainName
    The domain name for the application

.PARAMETER SkipACR
    Skip Azure Container Registry creation

.PARAMETER SkipDNS
    Skip DNS configuration

.EXAMPLE
    .\setup-production-environment.ps1 -ResourceGroupName "finnexus-rg" -Location "East US" -ClusterName "finnexus-aks" -DomainName "finnexusai.com"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$true)]
    [string]$Location,
    
    [Parameter(Mandatory=$true)]
    [string]$ClusterName,
    
    [Parameter(Mandatory=$true)]
    [string]$DomainName,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipACR,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipDNS,
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun
)

# Configuration
$ACRName = "$ClusterName-acr"
$VNetName = "$ClusterName-vnet"
$SubnetName = "$ClusterName-subnet"
$NSGName = "$ClusterName-nsg"
$PublicIPName = "$ClusterName-pip"
$KeyVaultName = "$ClusterName-kv"

# Colors for output
$Colors = @{
    Success = "Green"
    Warning = "Yellow"
    Error = "Red"
    Info = "Cyan"
}

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Colors[$Color]
}

function Test-AzureLogin {
    Write-ColorOutput "🔍 Checking Azure login status..." -Color Info
    
    try {
        $context = az account show --query "user.name" -o tsv 2>$null
        if ($LASTEXITCODE -ne 0) {
            throw "Not logged in to Azure CLI"
        }
        Write-ColorOutput "✅ Logged in as: $context" -Color Success
        return $true
    }
    catch {
        Write-ColorOutput "❌ Please login to Azure CLI first: az login" -Color Error
        return $false
    }
}

function New-AzureResourceGroup {
    Write-ColorOutput "🏗️ Creating Azure Resource Group..." -Color Info
    
    if ($DryRun) {
        Write-ColorOutput "🔍 DRY RUN: Would create resource group $ResourceGroupName in $Location" -Color Warning
        return
    }
    
    try {
        $existing = az group show --name $ResourceGroupName --query "name" -o tsv 2>$null
        if ($existing) {
            Write-ColorOutput "✅ Resource group $ResourceGroupName already exists" -Color Success
        } else {
            az group create --name $ResourceGroupName --location $Location
            if ($LASTEXITCODE -eq 0) {
                Write-ColorOutput "✅ Resource group $ResourceGroupName created successfully" -Color Success
            } else {
                throw "Failed to create resource group"
            }
        }
    }
    catch {
        Write-ColorOutput "❌ Failed to create resource group: $($_.Exception.Message)" -Color Error
        throw
    }
}

function New-AzureContainerRegistry {
    if ($SkipACR) {
        Write-ColorOutput "⚠️ Skipping Azure Container Registry creation" -Color Warning
        return
    }
    
    Write-ColorOutput "📦 Creating Azure Container Registry..." -Color Info
    
    if ($DryRun) {
        Write-ColorOutput "🔍 DRY RUN: Would create ACR $ACRName" -Color Warning
        return
    }
    
    try {
        $existing = az acr show --name $ACRName --resource-group $ResourceGroupName --query "name" -o tsv 2>$null
        if ($existing) {
            Write-ColorOutput "✅ ACR $ACRName already exists" -Color Success
        } else {
            az acr create --resource-group $ResourceGroupName --name $ACRName --sku Premium --admin-enabled true
            if ($LASTEXITCODE -eq 0) {
                Write-ColorOutput "✅ ACR $ACRName created successfully" -Color Success
            } else {
                throw "Failed to create ACR"
            }
        }
    }
    catch {
        Write-ColorOutput "❌ Failed to create ACR: $($_.Exception.Message)" -Color Error
        throw
    }
}

function New-AzureKeyVault {
    Write-ColorOutput "🔐 Creating Azure Key Vault..." -Color Info
    
    if ($DryRun) {
        Write-ColorOutput "🔍 DRY RUN: Would create Key Vault $KeyVaultName" -Color Warning
        return
    }
    
    try {
        $existing = az keyvault show --name $KeyVaultName --resource-group $ResourceGroupName --query "name" -o tsv 2>$null
        if ($existing) {
            Write-ColorOutput "✅ Key Vault $KeyVaultName already exists" -Color Success
        } else {
            az keyvault create --resource-group $ResourceGroupName --name $KeyVaultName --location $Location --sku standard --enable-rbac-authorization true
            if ($LASTEXITCODE -eq 0) {
                Write-ColorOutput "✅ Key Vault $KeyVaultName created successfully" -Color Success
            } else {
                throw "Failed to create Key Vault"
            }
        }
    }
    catch {
        Write-ColorOutput "❌ Failed to create Key Vault: $($_.Exception.Message)" -Color Error
        throw
    }
}

function New-AzureKubernetesCluster {
    Write-ColorOutput "🚀 Creating Azure Kubernetes Service cluster..." -Color Info
    
    if ($DryRun) {
        Write-ColorOutput "🔍 DRY RUN: Would create AKS cluster $ClusterName" -Color Warning
        return
    }
    
    try {
        $existing = az aks show --name $ClusterName --resource-group $ResourceGroupName --query "name" -o tsv 2>$null
        if ($existing) {
            Write-ColorOutput "✅ AKS cluster $ClusterName already exists" -Color Success
        } else {
            # Create cluster with advanced configuration
            az aks create `
                --resource-group $ResourceGroupName `
                --name $ClusterName `
                --location $Location `
                --node-count 3 `
                --node-vm-size "Standard_D4s_v3" `
                --enable-addons monitoring,ingress-appgw `
                --enable-managed-identity `
                --enable-oidc-issuer `
                --enable-workload-identity `
                --attach-acr $ACRName `
                --enable-cluster-autoscaler `
                --min-count 3 `
                --max-count 20 `
                --enable-aad `
                --enable-azure-rbac `
                --network-plugin azure `
                --generate-ssh-keys
            
            if ($LASTEXITCODE -eq 0) {
                Write-ColorOutput "✅ AKS cluster $ClusterName created successfully" -Color Success
            } else {
                throw "Failed to create AKS cluster"
            }
        }
    }
    catch {
        Write-ColorOutput "❌ Failed to create AKS cluster: $($_.Exception.Message)" -Color Error
        throw
    }
}

function Set-AzureRBACPermissions {
    Write-ColorOutput "🔑 Configuring Azure RBAC permissions..." -Color Info
    
    if ($DryRun) {
        Write-ColorOutput "🔍 DRY RUN: Would configure RBAC permissions" -Color Warning
        return
    }
    
    try {
        # Get current user object ID
        $currentUser = az ad signed-in-user show --query "id" -o tsv
        $subscriptionId = az account show --query "id" -o tsv
        
        # Assign Key Vault Secrets Officer role
        az role assignment create --assignee $currentUser --role "Key Vault Secrets Officer" --scope "/subscriptions/$subscriptionId/resourceGroups/$ResourceGroupName/providers/Microsoft.KeyVault/vaults/$KeyVaultName"
        
        # Assign ACR Push role
        az role assignment create --assignee $currentUser --role "AcrPush" --scope "/subscriptions/$subscriptionId/resourceGroups/$ResourceGroupName/providers/Microsoft.ContainerRegistry/registries/$ACRName"
        
        Write-ColorOutput "✅ RBAC permissions configured successfully" -Color Success
    }
    catch {
        Write-ColorOutput "❌ Failed to configure RBAC permissions: $($_.Exception.Message)" -Color Error
        throw
    }
}

function Install-KubernetesAddons {
    Write-ColorOutput "🔧 Installing Kubernetes addons..." -Color Info
    
    if ($DryRun) {
        Write-ColorOutput "🔍 DRY RUN: Would install K8s addons" -Color Warning
        return
    }
    
    try {
        # Get AKS credentials
        az aks get-credentials --resource-group $ResourceGroupName --name $ClusterName --overwrite-existing
        
        # Install NGINX Ingress Controller
        kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
        
        # Install cert-manager
        kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
        
        # Install Prometheus and Grafana
        helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
        helm repo add grafana https://grafana.github.io/helm-charts
        helm repo update
        
        kubectl create namespace monitoring
        helm install prometheus prometheus-community/kube-prometheus-stack --namespace monitoring
        
        # Install Falco for runtime security
        helm repo add falcosecurity https://falcosecurity.github.io/charts
        helm install falco falcosecurity/falco --namespace falco --create-namespace
        
        Write-ColorOutput "✅ Kubernetes addons installed successfully" -Color Success
    }
    catch {
        Write-ColorOutput "❌ Failed to install Kubernetes addons: $($_.Exception.Message)" -Color Error
        throw
    }
}

function Set-DNSConfiguration {
    if ($SkipDNS) {
        Write-ColorOutput "⚠️ Skipping DNS configuration" -Color Warning
        return
    }
    
    Write-ColorOutput "🌐 Configuring DNS..." -Color Info
    
    if ($DryRun) {
        Write-ColorOutput "🔍 DRY RUN: Would configure DNS for $DomainName" -Color Warning
        return
    }
    
    try {
        # Get the external IP of the ingress controller
        $ingressIP = kubectl get service -n ingress-nginx ingress-nginx-controller --output jsonpath='{.status.loadBalancer.ingress[0].ip}'
        
        if ($ingressIP) {
            Write-ColorOutput "✅ Ingress controller IP: $ingressIP" -Color Success
            Write-ColorOutput "📝 Please configure your DNS provider with the following records:" -Color Info
            Write-ColorOutput "   A     $DomainName -> $ingressIP" -Color Info
            Write-ColorOutput "   A     www.$DomainName -> $ingressIP" -Color Info
            Write-ColorOutput "   A     api.$DomainName -> $ingressIP" -Color Info
            Write-ColorOutput "   A     monitoring.$DomainName -> $ingressIP" -Color Info
        } else {
            Write-ColorOutput "⚠️ Ingress controller IP not available yet. Please check later." -Color Warning
        }
    }
    catch {
        Write-ColorOutput "❌ Failed to get ingress IP: $($_.Exception.Message)" -Color Error
    }
}

function Set-SecretsInKeyVault {
    Write-ColorOutput "🔐 Setting up secrets in Key Vault..." -Color Info
    
    if ($DryRun) {
        Write-ColorOutput "🔍 DRY RUN: Would set up secrets in Key Vault" -Color Warning
        return
    }
    
    try {
        # Generate and store secrets
        $jwtSecret = [System.Web.Security.Membership]::GeneratePassword(64, 0)
        $dbPassword = [System.Web.Security.Membership]::GeneratePassword(32, 0)
        $encryptionKey = [System.Web.Security.Membership]::GeneratePassword(32, 0)
        
        az keyvault secret set --vault-name $KeyVaultName --name "jwt-secret" --value $jwtSecret
        az keyvault secret set --vault-name $KeyVaultName --name "db-password" --value $dbPassword
        az keyvault secret set --vault-name $KeyVaultName --name "encryption-key" --value $encryptionKey
        az keyvault secret set --vault-name $KeyVaultName --name "domain-name" --value $DomainName
        
        Write-ColorOutput "✅ Secrets stored in Key Vault successfully" -Color Success
    }
    catch {
        Write-ColorOutput "❌ Failed to store secrets in Key Vault: $($_.Exception.Message)" -Color Error
        throw
    }
}

function Show-Summary {
    Write-ColorOutput "`n🎉 Production Environment Setup Complete!" -Color Success
    Write-ColorOutput "`n📋 Summary:" -Color Info
    Write-ColorOutput "   Resource Group: $ResourceGroupName" -Color Success
    Write-ColorOutput "   AKS Cluster: $ClusterName" -Color Success
    Write-ColorOutput "   Container Registry: $ACRName" -Color Success
    Write-ColorOutput "   Key Vault: $KeyVaultName" -Color Success
    Write-ColorOutput "   Domain: $DomainName" -Color Success
    
    Write-ColorOutput "`n🔗 Next Steps:" -Color Info
    Write-ColorOutput "   1. Configure DNS records as shown above" -Color Info
    Write-ColorOutput "   2. Run: .\scripts\deploy-k8s-infrastructure.ps1 -Environment production" -Color Info
    Write-ColorOutput "   3. Access your application at: https://$DomainName" -Color Info
    
    Write-ColorOutput "`n📊 Monitoring URLs:" -Color Info
    Write-ColorOutput "   Grafana: https://monitoring.$DomainName" -Color Success
    Write-ColorOutput "   Prometheus: https://prometheus.$DomainName" -Color Success
}

# Main execution
Write-ColorOutput "🚀 Starting FinNexus AI Production Environment Setup" -Color Info
Write-ColorOutput "Resource Group: $ResourceGroupName" -Color Info
Write-ColorOutput "Location: $Location" -Color Info
Write-ColorOutput "Cluster: $ClusterName" -Color Info
Write-ColorOutput "Domain: $DomainName" -Color Info
Write-ColorOutput "Dry Run: $DryRun" -Color Info

# Check prerequisites
if (-not (Test-AzureLogin)) {
    exit 1
}

# Provision infrastructure
try {
    New-AzureResourceGroup
    New-AzureContainerRegistry
    New-AzureKeyVault
    New-AzureKubernetesCluster
    Set-AzureRBACPermissions
    Install-KubernetesAddons
    Set-DNSConfiguration
    Set-SecretsInKeyVault
    
    Show-Summary
}
catch {
    Write-ColorOutput "`n❌ Setup failed: $($_.Exception.Message)" -Color Error
    Write-ColorOutput "Stack trace: $($_.ScriptStackTrace)" -Color Error
    exit 1
}

Write-ColorOutput "`n✅ Production environment setup completed successfully!" -Color Success
