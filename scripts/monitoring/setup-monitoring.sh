#!/bin/bash

# FinNexusAI Monitoring Setup Script
# Sets up comprehensive monitoring stack for production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Configuration
NAMESPACE="finnexusai-production"
MONITORING_NAMESPACE="finnexusai-monitoring"
PROMETHEUS_VERSION="v2.45.0"
GRAFANA_VERSION="10.1.0"
ALERTMANAGER_VERSION="v0.25.0"

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    
    # Check if helm is installed
    if ! command -v helm &> /dev/null; then
        error "helm is not installed. Please install helm first."
        exit 1
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        error "docker is not installed. Please install docker first."
        exit 1
    fi
    
    # Check kubectl connection
    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    
    success "All prerequisites are met"
}

# Create monitoring namespace
create_namespace() {
    log "Creating monitoring namespace..."
    
    kubectl create namespace $MONITORING_NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    kubectl label namespace $MONITORING_NAMESPACE name=finnexusai-monitoring
    
    success "Monitoring namespace created"
}

# Setup Prometheus
setup_prometheus() {
    log "Setting up Prometheus..."
    
    # Create Prometheus configuration
    kubectl create configmap prometheus-config \
        --from-file=prometheus.yml=config/monitoring/prometheus.yml \
        --from-file=alerts.yml=config/monitoring/rules/finnexusai-alerts.yml \
        -n $MONITORING_NAMESPACE \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Deploy Prometheus
    kubectl apply -f k8s/monitoring/prometheus-deployment.yaml
    
    # Wait for Prometheus to be ready
    log "Waiting for Prometheus to be ready..."
    kubectl wait --for=condition=ready pod -l app=prometheus -n $MONITORING_NAMESPACE --timeout=300s
    
    success "Prometheus is ready"
}

# Setup AlertManager
setup_alertmanager() {
    log "Setting up AlertManager..."
    
    # Create AlertManager configuration
    kubectl create configmap alertmanager-config \
        --from-file=alertmanager.yml=config/monitoring/alertmanager.yml \
        -n $MONITORING_NAMESPACE \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Deploy AlertManager
    kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: alertmanager
  namespace: $MONITORING_NAMESPACE
  labels:
    app: alertmanager
    component: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: alertmanager
  template:
    metadata:
      labels:
        app: alertmanager
        component: monitoring
    spec:
      containers:
      - name: alertmanager
        image: prom/alertmanager:$ALERTMANAGER_VERSION
        args:
          - '--config.file=/etc/alertmanager/alertmanager.yml'
          - '--storage.path=/alertmanager'
          - '--web.external-url=https://alertmanager.finnexusai.com'
        ports:
        - containerPort: 9093
          name: web
        resources:
          requests:
            cpu: "100m"
            memory: "256Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
        volumeMounts:
        - name: config
          mountPath: /etc/alertmanager
        - name: storage
          mountPath: /alertmanager
        livenessProbe:
          httpGet:
            path: /-/healthy
            port: 9093
          initialDelaySeconds: 30
          periodSeconds: 15
        readinessProbe:
          httpGet:
            path: /-/ready
            port: 9093
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: config
        configMap:
          name: alertmanager-config
      - name: storage
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: alertmanager
  namespace: $MONITORING_NAMESPACE
  labels:
    app: alertmanager
    component: monitoring
spec:
  type: ClusterIP
  ports:
  - port: 9093
    targetPort: 9093
    name: web
  selector:
    app: alertmanager
EOF
    
    # Wait for AlertManager to be ready
    log "Waiting for AlertManager to be ready..."
    kubectl wait --for=condition=ready pod -l app=alertmanager -n $MONITORING_NAMESPACE --timeout=300s
    
    success "AlertManager is ready"
}

# Setup Grafana
setup_grafana() {
    log "Setting up Grafana..."
    
    # Deploy Grafana
    kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: $MONITORING_NAMESPACE
  labels:
    app: grafana
    component: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
        component: monitoring
    spec:
      containers:
      - name: grafana
        image: grafana/grafana:$GRAFANA_VERSION
        ports:
        - containerPort: 3000
          name: web
        env:
        - name: GF_SECURITY_ADMIN_PASSWORD
          value: "admin123"
        - name: GF_USERS_ALLOW_SIGN_UP
          value: "false"
        - name: GF_SERVER_ROOT_URL
          value: "https://grafana.finnexusai.com"
        resources:
          requests:
            cpu: "100m"
            memory: "256Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
        volumeMounts:
        - name: storage
          mountPath: /var/lib/grafana
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 15
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: storage
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: grafana
  namespace: $MONITORING_NAMESPACE
  labels:
    app: grafana
    component: monitoring
spec:
  type: ClusterIP
  ports:
  - port: 3000
    targetPort: 3000
    name: web
  selector:
    app: grafana
EOF
    
    # Wait for Grafana to be ready
    log "Waiting for Grafana to be ready..."
    kubectl wait --for=condition=ready pod -l app=grafana -n $MONITORING_NAMESPACE --timeout=300s
    
    success "Grafana is ready"
}

# Setup Node Exporter
setup_node_exporter() {
    log "Setting up Node Exporter..."
    
    kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: $MONITORING_NAMESPACE
  labels:
    app: node-exporter
    component: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
        component: monitoring
    spec:
      hostNetwork: true
      hostPID: true
      containers:
      - name: node-exporter
        image: prom/node-exporter:v1.6.1
        args:
          - '--path.procfs=/host/proc'
          - '--path.rootfs=/rootfs'
          - '--path.sysfs=/host/sys'
          - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
        ports:
        - containerPort: 9100
          name: metrics
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "200m"
            memory: "256Mi"
        volumeMounts:
        - name: proc
          mountPath: /host/proc
          readOnly: true
        - name: sys
          mountPath: /host/sys
          readOnly: true
        - name: rootfs
          mountPath: /rootfs
          readOnly: true
      volumes:
      - name: proc
        hostPath:
          path: /proc
      - name: sys
        hostPath:
          path: /sys
      - name: rootfs
        hostPath:
          path: /
---
apiVersion: v1
kind: Service
metadata:
  name: node-exporter
  namespace: $MONITORING_NAMESPACE
  labels:
    app: node-exporter
    component: monitoring
spec:
  type: ClusterIP
  ports:
  - port: 9100
    targetPort: 9100
    name: metrics
  selector:
    app: node-exporter
EOF
    
    success "Node Exporter is ready"
}

# Setup monitoring ingress
setup_ingress() {
    log "Setting up monitoring ingress..."
    
    kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: monitoring-ingress
  namespace: $MONITORING_NAMESPACE
  labels:
    app: monitoring
    component: ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: monitoring-auth
    nginx.ingress.kubernetes.io/auth-realm: "Monitoring Access"
spec:
  tls:
  - hosts:
    - prometheus.finnexusai.com
    - grafana.finnexusai.com
    - alertmanager.finnexusai.com
    secretName: monitoring-tls
  rules:
  - host: prometheus.finnexusai.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: prometheus
            port:
              number: 9090
  - host: grafana.finnexusai.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: grafana
            port:
              number: 3000
  - host: alertmanager.finnexusai.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: alertmanager
            port:
              number: 9093
EOF
    
    success "Monitoring ingress configured"
}

# Verify setup
verify_setup() {
    log "Verifying monitoring setup..."
    
    # Check pods
    kubectl get pods -n $MONITORING_NAMESPACE
    
    # Check services
    kubectl get services -n $MONITORING_NAMESPACE
    
    # Check ingress
    kubectl get ingress -n $MONITORING_NAMESPACE
    
    # Test Prometheus
    log "Testing Prometheus..."
    kubectl port-forward -n $MONITORING_NAMESPACE service/prometheus 9090:9090 &
    PROMETHEUS_PID=$!
    sleep 5
    
    if curl -s http://localhost:9090/api/v1/query?query=up | grep -q "success"; then
        success "Prometheus is responding"
    else
        error "Prometheus is not responding"
    fi
    
    kill $PROMETHEUS_PID
    
    # Test Grafana
    log "Testing Grafana..."
    kubectl port-forward -n $MONITORING_NAMESPACE service/grafana 3000:3000 &
    GRAFANA_PID=$!
    sleep 5
    
    if curl -s http://localhost:3000/api/health | grep -q "ok"; then
        success "Grafana is responding"
    else
        error "Grafana is not responding"
    fi
    
    kill $GRAFANA_PID
    
    success "Monitoring setup verification completed"
}

# Main function
main() {
    log "🚀 Starting FinNexusAI Monitoring Setup"
    log "=" .repeat(50)
    
    check_prerequisites
    create_namespace
    setup_prometheus
    setup_alertmanager
    setup_grafana
    setup_node_exporter
    setup_ingress
    verify_setup
    
    log "\n🎉 Monitoring setup completed successfully!"
    log "\nAccess URLs:"
    log "  Prometheus: https://prometheus.finnexusai.com"
    log "  Grafana: https://grafana.finnexusai.com (admin/admin123)"
    log "  AlertManager: https://alertmanager.finnexusai.com"
    
    log "\nNext steps:"
    log "1. Configure Grafana datasources"
    log "2. Import dashboard from config/monitoring/grafana/dashboards/"
    log "3. Configure alert channels in AlertManager"
    log "4. Set up SSL certificates for production"
}

# Run main function
main "$@"

