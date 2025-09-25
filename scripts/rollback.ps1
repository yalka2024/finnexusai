# scripts/rollback.ps1
Write-Host "Rolling back FinNexusAI deployment..."
kubectl rollout undo deployment/backend -n finnexusai
kubectl rollout undo deployment/frontend -n finnexusai
Write-Host "Rollback completed."
