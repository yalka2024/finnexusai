FinAI Nexus - PowerShell Automation Suite
========================================

This package contains a complete suite of PowerShell scripts to automate setup, build, deployment,
secrets management, backups, monitoring and compliance tasks for the FinAI Nexus platform.

Location: scripts/

Key scripts:
- Setup-Environment.ps1      : Install/verify local prerequisites
- Start-Local.ps1            : Start local stack with docker-compose
- Stop-Local.ps1             : Stop local stack
- Build-Containers.ps1       : Build Docker images
- Push-Containers.ps1        : Push images to registry
- Deploy-K8s.ps1             : Deploy manifests to Kubernetes with readiness checks
- Create-Secrets.ps1         : Create Kubernetes secrets (interactive)
- Seed-Database.ps1          : Run Prisma migrations and seed DB
- Run-Tests.ps1              : Run backend/frontend tests (unit/integration/e2e)
- Monitor-Cluster.ps1        : Basic monitoring and optional Prometheus install
- Backup-Database.ps1        : Backup PostgreSQL with optional encryption
- Restore-Database.ps1       : Restore PostgreSQL from backup
- Compliance-Audit.ps1       : Run quick compliance checks

Utilities:
- utils/Logger.ps1           : Central logging functions
- config.psd1                : Central configuration file (edit to match your environment)

How to use:
1. Edit scripts/config.psd1 to configure your project settings (registry, namespace, backup dir).
2. Run `.\scripts\Setup-Environment.ps1 -Force` (Windows) to install prerequisites or verify them.
3. Build images: `.\scripts\Build-Containers.ps1 -Registry docker.io/youruser -Tag v1.0.0`
4. Push images: `.\scripts\Push-Containers.ps1 -Registry docker.io/youruser -Username $env:DOCKERHUB_USER -Password $env:DOCKERHUB_TOKEN`
5. Create secrets: `.\scripts\Create-Secrets.ps1` (interactive)
6. Deploy: `.\scripts\Deploy-K8s.ps1 -Namespace finainexus`

Security notes:
- Do NOT commit secrets to git. Use a secrets manager (Azure Key Vault, AWS Secrets Manager) where possible.
- Replace placeholder passwords in config.psd1 with secure retrieval from vault.

License: MIT