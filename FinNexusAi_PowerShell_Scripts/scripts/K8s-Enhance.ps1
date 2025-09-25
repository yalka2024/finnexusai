# K8s-Enhance.ps1
# Requires: kubectl, az login

param(
    [string]$ResourceGroup = "finainexus-rg",
    [string]$ClusterName = "finainexus-aks"
)

# Connect to AKS
az aks get-credentials --resource-group $ResourceGroup --name $ClusterName

# Enhance HPA for 3-20 pods (as per audit)
$hpaYaml = @"
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: finainexus-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: finainexus-backend
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50
"@
$hpaYaml | Out-File -FilePath "hpa-enhanced.yaml" -Encoding UTF8
kubectl apply -f hpa-enhanced.yaml

# Add Prometheus alerts for threats (integrate with Security-Monitor)
$alertYaml = @"
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: threat-alerts
spec:
  groups:
  - name: finainexus.rules
    rules:
    - alert: HighThreats
      expr: rate(threats_total[5m]) > 0.1
      for: 1m
      labels:
        severity: critical
"@
$alertYaml | Out-File -FilePath "prometheus-alerts.yaml" -Encoding UTF8
kubectl apply -f prometheus-alerts.yaml -n monitoring

# Generate API Docs with Swagger (for GraphQL/REST)
npx @apidevtools/swagger-cli bundle src/api/openapi.yaml --outfile docs/api-docs.json --type yaml
Write-Host "API Docs generated: docs/api-docs.json (import to Swagger UI)." -ForegroundColor Green

Write-Host "K8s enhanced: HPA updated, alerts added, docs generated." -ForegroundColor Green
