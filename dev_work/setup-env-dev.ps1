# ========================================
# CEMEP Digital - Setup Environment (Dev)
# ========================================
# Este script carrega as configurações do env.development.json
# e cria/atualiza o arquivo .env no backend

param(
    [string]$ConfigFile = "$PSScriptRoot\..\env.development.json"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " CEMEP Digital - Configuração Dev" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Verificar arquivo de configuração
if (-not (Test-Path $ConfigFile)) {
    Write-Host "ERRO: Arquivo de configuração não encontrado: $ConfigFile" -ForegroundColor Red
    exit 1
}

# Carregar JSON
Write-Host "Carregando configurações de: $ConfigFile" -ForegroundColor Yellow
$config = Get-Content $ConfigFile | ConvertFrom-Json

# Caminho do .env
$envFile = "$PSScriptRoot\..\backend\.env"

# Gerar conteúdo do .env
$envContent = @"
# ========================================
# CEMEP Digital - Environment Variables
# Gerado automaticamente por setup-env-dev.ps1
# Ambiente: $($config.environment)
# ========================================

# Security
DEBUG=$($config.debug.ToString().ToLower())
SECRET_KEY=$($config.security.secret_key)
ALLOWED_HOSTS=$($config.security.allowed_hosts -join ',')

# Database
DB_NAME=$($config.database.name)
DB_USER=$($config.database.user)
DB_PASSWORD=$($config.database.password)
DB_HOST=$($config.database.host)
DB_PORT=$($config.database.port)

# URLs
FRONTEND_URL=$($config.urls.frontend)
SITE_URL=$($config.urls.frontend)

# Email
EMAIL_BACKEND=$($config.email.backend)
EMAIL_HOST=$($config.email.host)
EMAIL_PORT=$($config.email.port)
EMAIL_USE_TLS=$($config.email.use_tls.ToString().ToLower())
EMAIL_HOST_USER=$($config.email.user)
EMAIL_HOST_PASSWORD=$($config.email.password)
DEFAULT_FROM_EMAIL=$($config.email.from)

# Storage (Local em desenvolvimento)
USE_GCS=$($config.storage.use_gcs.ToString().ToLower())
"@

# Salvar .env
Write-Host "Gerando arquivo .env em: $envFile" -ForegroundColor Yellow
$envContent | Out-File -FilePath $envFile -Encoding UTF8

Write-Host "`n✓ Arquivo .env criado com sucesso!" -ForegroundColor Green
Write-Host "`nConfiguração aplicada:" -ForegroundColor Cyan
Write-Host "  Ambiente: $($config.environment)" -ForegroundColor White
Write-Host "  Debug: $($config.debug)" -ForegroundColor White
Write-Host "  Database: $($config.database.name)@$($config.database.host)" -ForegroundColor White
Write-Host "  Frontend: $($config.urls.frontend)" -ForegroundColor White
Write-Host "  Email Backend: $($config.email.backend)" -ForegroundColor White

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Configuração finalizada!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
