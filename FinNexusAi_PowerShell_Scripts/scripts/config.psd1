@{
    ProjectName = 'FinAI Nexus'
    Namespace = 'finainexus'
    DockerRegistry = 'docker.io/YOUR_DOCKERHUB_USER'  # replace
    DockerTag = 'latest'
    PostgresUser = 'user'
    PostgresPassword = 'password'  # replace with vault secret
    PostgresDB = 'finainexus'
    BackupDir = 'C:\finai-backups'
    KubeContext = 'default'
    LogPath = "$env:USERPROFILE\FinAI_Logs"
    RetainBackups = 30
    UseAzureKeyVault = $false
    AzureKeyVaultName = ''
    UseAWSSecretsManager = $false
    AWSRegion = ''
}