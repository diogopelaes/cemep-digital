#!/bin/bash
# ========================================
# CEMEP Digital - Setup Environment (Prod)
# ========================================
# Este script configura o ambiente de produção no Ubuntu
# Usa: Caddy (reverse proxy + SSL) + Uvicorn (ASGI)

set -e

CONFIG_FILE="${1:-/var/www/cemep-digital/env.production.json}"
PROJECT_DIR="/var/www/cemep-digital"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "========================================"
echo " CEMEP Digital - Configuração Produção"
echo "========================================"
echo ""

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    echo "ERRO: Execute este script como root (sudo)"
    exit 1
fi

# Verificar arquivo de configuração
if [ ! -f "$CONFIG_FILE" ]; then
    echo "ERRO: Arquivo de configuração não encontrado: $CONFIG_FILE"
    exit 1
fi

echo "Carregando configurações de: $CONFIG_FILE"

# Instalar jq se não existir
if ! command -v jq &> /dev/null; then
    echo "Instalando jq..."
    apt install -y jq
fi

# Carregar configurações do JSON
ENV=$(jq -r '.environment' "$CONFIG_FILE")
DEBUG=$(jq -r '.debug' "$CONFIG_FILE")
SECRET_KEY=$(jq -r '.security.secret_key' "$CONFIG_FILE")
ALLOWED_HOSTS=$(jq -r '.security.allowed_hosts | join(",")' "$CONFIG_FILE")

DB_NAME=$(jq -r '.database.name' "$CONFIG_FILE")
DB_USER=$(jq -r '.database.user' "$CONFIG_FILE")
DB_PASSWORD=$(jq -r '.database.password' "$CONFIG_FILE")
DB_HOST=$(jq -r '.database.host' "$CONFIG_FILE")
DB_PORT=$(jq -r '.database.port' "$CONFIG_FILE")

FRONTEND_URL=$(jq -r '.urls.frontend' "$CONFIG_FILE")
BACKEND_URL=$(jq -r '.urls.backend' "$CONFIG_FILE")

EMAIL_BACKEND=$(jq -r '.email.backend' "$CONFIG_FILE")
EMAIL_HOST=$(jq -r '.email.host' "$CONFIG_FILE")
EMAIL_PORT=$(jq -r '.email.port' "$CONFIG_FILE")
EMAIL_USE_TLS=$(jq -r '.email.use_tls' "$CONFIG_FILE")
EMAIL_USER=$(jq -r '.email.user' "$CONFIG_FILE")
EMAIL_PASSWORD=$(jq -r '.email.password' "$CONFIG_FILE")
EMAIL_FROM=$(jq -r '.email.from' "$CONFIG_FILE")

# Storage (Google Cloud Storage)
USE_GCS=$(jq -r '.storage.use_gcs' "$CONFIG_FILE")
GS_BUCKET_NAME=$(jq -r '.storage.gcs_bucket_name' "$CONFIG_FILE")
GS_PROJECT_ID=$(jq -r '.storage.gcs_project_id' "$CONFIG_FILE")
GCS_CREDENTIALS_PATH=$(jq -r '.storage.gcs_credentials_path' "$CONFIG_FILE")

# Gerar arquivo .env
ENV_FILE="$BACKEND_DIR/.env"
echo "Gerando arquivo .env em: $ENV_FILE"

cat > "$ENV_FILE" << EOF
# ========================================
# CEMEP Digital - Environment Variables
# Gerado automaticamente por setup-env-prod.sh
# Ambiente: $ENV
# ========================================

# Security
DEBUG=$DEBUG
SECRET_KEY=$SECRET_KEY
ALLOWED_HOSTS=$ALLOWED_HOSTS

# Database
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT

# URLs
FRONTEND_URL=$FRONTEND_URL
SITE_URL=$FRONTEND_URL

# Email
EMAIL_BACKEND=$EMAIL_BACKEND
EMAIL_HOST=$EMAIL_HOST
EMAIL_PORT=$EMAIL_PORT
EMAIL_USE_TLS=$EMAIL_USE_TLS
EMAIL_HOST_USER=$EMAIL_USER
EMAIL_HOST_PASSWORD=$EMAIL_PASSWORD
DEFAULT_FROM_EMAIL=$EMAIL_FROM

# Google Cloud Storage
USE_GCS=$USE_GCS
GS_BUCKET_NAME=$GS_BUCKET_NAME
GS_PROJECT_ID=$GS_PROJECT_ID
GOOGLE_APPLICATION_CREDENTIALS=$GCS_CREDENTIALS_PATH
EOF

chmod 600 "$ENV_FILE"
echo "✓ Arquivo .env criado com permissões seguras (600)"

# Configurar Caddy
echo ""
echo "Configurando Caddy..."

DOMAIN=$(echo "$FRONTEND_URL" | sed -e 's/https:\/\///' -e 's/http:\/\///')
API_DOMAIN=$(echo "$BACKEND_URL" | sed -e 's/https:\/\///' -e 's/http:\/\///')

CADDYFILE="/etc/caddy/Caddyfile"
cat > "$CADDYFILE" << EOF
# CEMEP Digital - Caddy Configuration
# Gerado automaticamente

# Frontend (React)
$DOMAIN {
    root * $FRONTEND_DIR/dist
    file_server
    try_files {path} /index.html
    
    encode gzip
    
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        X-XSS-Protection "1; mode=block"
    }
}

# Backend API (Django/Uvicorn)
$API_DOMAIN {
    reverse_proxy localhost:8000

    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
    }
}
EOF

echo "✓ Caddyfile configurado"

# Configurar serviço Uvicorn
echo ""
echo "Configurando serviço Uvicorn..."

SERVICE_FILE="/etc/systemd/system/cemep-backend.service"
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=CEMEP Digital Backend (Uvicorn)
After=network.target postgresql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=$BACKEND_DIR
Environment="PATH=$PROJECT_DIR/.venv/bin"
ExecStart=$PROJECT_DIR/.venv/bin/uvicorn core_project.asgi:application --host 127.0.0.1 --port 8000 --workers 4
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

echo "✓ Serviço cemep-backend.service criado"

# Recarregar systemd
systemctl daemon-reload

echo ""
echo "========================================"
echo " Configuração finalizada!"
echo "========================================"
echo ""
echo "Próximos passos:"
echo "  1. Revisar env.production.json com credenciais reais"
echo "  2. Executar: systemctl enable caddy cemep-backend"
echo "  3. Executar: systemctl start caddy cemep-backend"
echo "  4. Build do frontend: cd $FRONTEND_DIR && npm run build"
echo "  5. Migrações: cd $BACKEND_DIR && python manage.py migrate"
echo ""
