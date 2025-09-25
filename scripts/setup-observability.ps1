param(
    [string]$Namespace = "monitoring",
    [string]$ReleaseName = "prometheus-stack",
    [switch]$DryRun
)

Write-Host "Setting up Observability Stack for FinNexus AI" -ForegroundColor Cyan
Write-Host "Namespace: $Namespace" -ForegroundColor Cyan
Write-Host "Release Name: $ReleaseName" -ForegroundColor Cyan

# Check if Helm is installed
try {
    $helmVersion = helm version --short 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Helm is not installed"
    }
    Write-Host "Helm version: $helmVersion" -ForegroundColor Green
}
catch {
    Write-Host "Please install Helm first: https://helm.sh/docs/intro/install/" -ForegroundColor Red
    exit 1
}

# Check kubectl connection
try {
    $context = kubectl config current-context 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "kubectl is not configured"
    }
    Write-Host "Connected to cluster: $context" -ForegroundColor Green
}
catch {
    Write-Host "Please configure kubectl first" -ForegroundColor Red
    exit 1
}

# Create monitoring namespace
Write-Host "Creating monitoring namespace..." -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "DRY RUN: Would create namespace $Namespace" -ForegroundColor Yellow
} else {
    kubectl create namespace $Namespace --dry-run=client -o yaml | kubectl apply -f -
    Write-Host "Namespace $Namespace created successfully" -ForegroundColor Green
}

# Add Helm repositories
Write-Host "Adding Helm repositories..." -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "DRY RUN: Would add Helm repositories" -ForegroundColor Yellow
} else {
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo add elastic https://helm.elastic.co
    helm repo update
    
    Write-Host "Helm repositories added successfully" -ForegroundColor Green
}

# Create Prometheus configuration
Write-Host "Creating Prometheus configuration..." -ForegroundColor Cyan
$prometheusValues = @"
prometheus:
  prometheusSpec:
    retention: 30d
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: standard
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 50Gi
    serviceMonitorSelectorNilUsesHelmValues: false
    ruleSelectorNilUsesHelmValues: false
    additionalScrapeConfigs:
      - job_name: 'finnexus-backend'
        static_configs:
          - targets: ['finnexus-backend-service:80']
        metrics_path: '/api/v1/metrics'
        scrape_interval: 10s
      - job_name: 'finnexus-frontend'
        static_configs:
          - targets: ['finnexus-frontend-service:80']
        metrics_path: '/api/metrics'
        scrape_interval: 30s

grafana:
  adminPassword: "FinNexus2024!"
  persistence:
    enabled: true
    storageClassName: standard
    size: 10Gi
  dashboardProviders:
    dashboardproviders.yaml:
      apiVersion: 1
      providers:
      - name: 'default'
        orgId: 1
        folder: ''
        type: file
        disableDeletion: false
        editable: true
        options:
          path: /var/lib/grafana/dashboards/default
  dashboards:
    default:
      kubernetes-cluster-monitoring:
        gnetId: 7249
        revision: 1
        datasource: Prometheus
      kubernetes-pod-monitoring:
        gnetId: 6417
        revision: 1
        datasource: Prometheus

alertmanager:
  alertmanagerSpec:
    storage:
      volumeClaimTemplate:
        spec:
          storageClassName: standard
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 10Gi
"@

# Save Prometheus values to file
$prometheusValues | Out-File -FilePath "prometheus-values.yaml" -Encoding UTF8

# Install Prometheus Stack
Write-Host "Installing Prometheus Stack..." -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "DRY RUN: Would install Prometheus Stack" -ForegroundColor Yellow
} else {
    helm install $ReleaseName prometheus-community/kube-prometheus-stack --namespace $Namespace --values prometheus-values.yaml --wait
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Prometheus Stack installed successfully" -ForegroundColor Green
    } else {
        Write-Host "Failed to install Prometheus Stack" -ForegroundColor Red
    }
}

# Install ELK Stack for logging
Write-Host "Installing ELK Stack for logging..." -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "DRY RUN: Would install ELK Stack" -ForegroundColor Yellow
} else {
    # Install Elasticsearch
    helm install elasticsearch elastic/elasticsearch --namespace $Namespace --set replicas=1 --set volumeClaimTemplate.storageClassName=standard --wait
    
    # Install Kibana
    helm install kibana elastic/kibana --namespace $Namespace --set service.type=ClusterIP --wait
    
    # Install Logstash
    helm install logstash elastic/logstash --namespace $Namespace --wait
    
    Write-Host "ELK Stack installed successfully" -ForegroundColor Green
}

# Install Jaeger for distributed tracing
Write-Host "Installing Jaeger for distributed tracing..." -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "DRY RUN: Would install Jaeger" -ForegroundColor Yellow
} else {
    helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
    helm repo update
    helm install jaeger jaegertracing/jaeger --namespace $Namespace --wait
    
    Write-Host "Jaeger installed successfully" -ForegroundColor Green
}

# Create custom monitoring dashboards
Write-Host "Creating custom monitoring dashboards..." -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "DRY RUN: Would create custom dashboards" -ForegroundColor Yellow
} else {
    # Create ConfigMap for custom dashboards
    $dashboardConfig = @"
apiVersion: v1
kind: ConfigMap
metadata:
  name: finnexus-dashboards
  namespace: $Namespace
data:
  finnexus-overview.json: |
    {
      "dashboard": {
        "title": "FinNexus AI Overview",
        "panels": [
          {
            "title": "API Response Time",
            "type": "graph",
            "targets": [
              {
                "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
                "legendFormat": "95th percentile"
              }
            ]
          }
        ]
      }
    }
"@
    
    $dashboardConfig | Out-File -FilePath "finnexus-dashboard.yaml" -Encoding UTF8
    kubectl apply -f finnexus-dashboard.yaml
    
    Write-Host "Custom dashboards created successfully" -ForegroundColor Green
}

# Show access information
Write-Host "Observability setup completed!" -ForegroundColor Green
Write-Host "Access URLs:" -ForegroundColor Cyan
Write-Host "  Grafana: kubectl port-forward -n $Namespace svc/$ReleaseName-grafana 3000:80" -ForegroundColor Yellow
Write-Host "  Prometheus: kubectl port-forward -n $Namespace svc/$ReleaseName-prometheus 9090:9090" -ForegroundColor Yellow
Write-Host "  Kibana: kubectl port-forward -n $Namespace svc/kibana-kibana 5601:5601" -ForegroundColor Yellow
Write-Host "  Jaeger: kubectl port-forward -n $Namespace svc/jaeger 16686:16686" -ForegroundColor Yellow

Write-Host "Default credentials:" -ForegroundColor Cyan
Write-Host "  Grafana: admin / FinNexus2024!" -ForegroundColor Yellow
