param(
    [string]$Namespace = "finnexus-ai",
    [string]$ClusterName = "finnexus-aks",
    [string]$ResourceGroup = "finnexus-rg",
    [switch]$DryRun
)

Write-Host "Setting up Security Hardening for FinNexus AI" -ForegroundColor Cyan
Write-Host "Namespace: $Namespace" -ForegroundColor Cyan
Write-Host "Cluster: $ClusterName" -ForegroundColor Cyan

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

# Create Pod Security Policy
Write-Host "Creating Pod Security Policy..." -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "DRY RUN: Would create Pod Security Policy" -ForegroundColor Yellow
} else {
    $pspConfig = @"
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: finnexus-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
  readOnlyRootFilesystem: true
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: finnexus-psp-user
rules:
- apiGroups: ['policy']
  resources: ['podsecuritypolicies']
  verbs: ['use']
  resourceNames:
  - finnexus-psp
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: finnexus-psp-binding
  namespace: $Namespace
roleRef:
  kind: ClusterRole
  name: finnexus-psp-user
  apiGroup: rbac.authorization.k8s.io
subjects:
- kind: ServiceAccount
  name: finnexus-backend-sa
  namespace: $Namespace
- kind: ServiceAccount
  name: finnexus-frontend-sa
  namespace: $Namespace
"@
    
    $pspConfig | Out-File -FilePath "pod-security-policy.yaml" -Encoding UTF8
    kubectl apply -f pod-security-policy.yaml
    
    Write-Host "Pod Security Policy created successfully" -ForegroundColor Green
}

# Install Falco for runtime security
Write-Host "Installing Falco for runtime security..." -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "DRY RUN: Would install Falco" -ForegroundColor Yellow
} else {
    # Add Falco Helm repository
    helm repo add falcosecurity https://falcosecurity.github.io/charts
    helm repo update
    
    # Install Falco
    helm install falco falcosecurity/falco --namespace falco --create-namespace --set falco.grpc.enabled=true --set falco.grpcOutput.enabled=true
    
    Write-Host "Falco installed successfully" -ForegroundColor Green
}

# Install OPA Gatekeeper for policy enforcement
Write-Host "Installing OPA Gatekeeper..." -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "DRY RUN: Would install OPA Gatekeeper" -ForegroundColor Yellow
} else {
    # Install Gatekeeper
    kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/release-3.14/deploy/gatekeeper.yaml
    
    # Wait for Gatekeeper to be ready
    kubectl wait --for=condition=Ready pods -l control-plane=controller-manager -n gatekeeper-system --timeout=300s
    
    Write-Host "OPA Gatekeeper installed successfully" -ForegroundColor Green
}

# Create security policies
Write-Host "Creating security policies..." -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "DRY RUN: Would create security policies" -ForegroundColor Yellow
} else {
    $securityPolicies = @"
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
  name: k8srequiredlabels
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredLabels
      validation:
        openAPIV3Schema:
          type: object
          properties:
            labels:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredlabels
        violation[{"msg": msg}] {
          required := input.parameters.labels
          provided := input.review.object.metadata.labels
          missing := required[_]
          not provided[missing]
          msg := sprintf("Missing required label: %v", [missing])
        }
---
apiVersion: config.gatekeeper.sh/v1alpha1
kind: K8sRequiredLabels
metadata:
  name: must-have-security-labels
spec:
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
    namespaces: ["$Namespace"]
  parameters:
    labels: ["security-level", "environment"]
"@
    
    $securityPolicies | Out-File -FilePath "security-policies.yaml" -Encoding UTF8
    kubectl apply -f security-policies.yaml
    
    Write-Host "Security policies created successfully" -ForegroundColor Green
}

# Create Network Policies
Write-Host "Creating Network Policies..." -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "DRY RUN: Would create Network Policies" -ForegroundColor Yellow
} else {
    $networkPolicies = @"
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
  namespace: $Namespace
spec:
  podSelector: {}
  policyTypes:
  - Ingress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-egress
  namespace: $Namespace
spec:
  podSelector: {}
  policyTypes:
  - Egress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-backend-ingress
  namespace: $Namespace
spec:
  podSelector:
    matchLabels:
      app: finnexus-backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: finnexus-ingress
    - namespaceSelector:
        matchLabels:
          name: finnexus-monitoring
    ports:
    - protocol: TCP
      port: 5000
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-ingress
  namespace: $Namespace
spec:
  podSelector:
    matchLabels:
      app: finnexus-frontend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: finnexus-ingress
    ports:
    - protocol: TCP
      port: 3000
"@
    
    $networkPolicies | Out-File -FilePath "network-policies.yaml" -Encoding UTF8
    kubectl apply -f network-policies.yaml
    
    Write-Host "Network Policies created successfully" -ForegroundColor Green
}

# Install Trivy for vulnerability scanning
Write-Host "Installing Trivy for vulnerability scanning..." -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "DRY RUN: Would install Trivy" -ForegroundColor Yellow
} else {
    # Install Trivy Operator
    helm repo add aqua https://aquasecurity.github.io/helm-charts
    helm repo update
    helm install trivy-operator aqua/trivy-operator --namespace trivy-system --create-namespace
    
    Write-Host "Trivy Operator installed successfully" -ForegroundColor Green
}

# Configure RBAC with least privilege
Write-Host "Configuring RBAC with least privilege..." -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "DRY RUN: Would configure RBAC" -ForegroundColor Yellow
} else {
    $rbacConfig = @"
apiVersion: v1
kind: ServiceAccount
metadata:
  name: finnexus-backend-sa
  namespace: $Namespace
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: finnexus-frontend-sa
  namespace: $Namespace
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: $Namespace
  name: finnexus-backend-role
rules:
- apiGroups: [""]
  resources: ["secrets", "configmaps"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: finnexus-backend-binding
  namespace: $Namespace
subjects:
- kind: ServiceAccount
  name: finnexus-backend-sa
  namespace: $Namespace
roleRef:
  kind: Role
  name: finnexus-backend-role
  apiGroup: rbac.authorization.k8s.io
"@
    
    $rbacConfig | Out-File -FilePath "rbac-config.yaml" -Encoding UTF8
    kubectl apply -f rbac-config.yaml
    
    Write-Host "RBAC configured successfully" -ForegroundColor Green
}

Write-Host "Security hardening setup completed!" -ForegroundColor Green
Write-Host "Security features enabled:" -ForegroundColor Cyan
Write-Host "  ✓ Pod Security Policies" -ForegroundColor Green
Write-Host "  ✓ Runtime security monitoring (Falco)" -ForegroundColor Green
Write-Host "  ✓ Policy enforcement (OPA Gatekeeper)" -ForegroundColor Green
Write-Host "  ✓ Network policies" -ForegroundColor Green
Write-Host "  ✓ Vulnerability scanning (Trivy)" -ForegroundColor Green
Write-Host "  ✓ RBAC with least privilege" -ForegroundColor Green
