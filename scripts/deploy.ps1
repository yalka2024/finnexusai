# scripts/deploy.ps1
Write-Host "Deploying FinNexusAI..."
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/db-deployment.yaml
kubectl apply -f k8s/db-pvc.yaml
kubectl apply -f k8s/ingress.yaml
Write-Host "Deployment completed."
