# Guia de Deploy - CEMEP Digital

Este guia descreve o processo completo de deploy do sistema **CEMEP Digital** em servidor Ubuntu com **Caddy** (reverse proxy + SSL automático) e **Uvicorn** (servidor ASGI).

---

## Informações do Servidor

- IP: 72.61.223.71
- Hostname: srv1175442.hstgr.cloud
- OS: Ubuntu 24.04 LTS
- Domínios: cemep.net.br (frontend), api.cemep.net.br (backend)

---

## Arquitetura de Produção

```
Internet → Caddy (SSL/443) → Frontend (arquivos estáticos)
                           → Uvicorn (Django API :8000)
```

---

## 1. Preparação do Servidor

```bash
# Conectar via SSH
ssh root@72.61.223.71

# Atualizar sistema
apt update && apt upgrade -y

# Instalar dependências básicas
apt install -y build-essential git curl wget software-properties-common \
    libpq-dev libssl-dev libffi-dev python3-dev jq

# Configurar timezone
timedatectl set-timezone America/Sao_Paulo
```

---

## 2. PostgreSQL

```bash
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

# Criar banco e usuário
sudo -u postgres psql << EOF
CREATE USER cemep_user WITH PASSWORD 'SUA_SENHA_FORTE';
CREATE DATABASE cemep_digital OWNER cemep_user;
GRANT ALL PRIVILEGES ON DATABASE cemep_digital TO cemep_user;
EOF
```

---

## 3. Python 3.12+

```bash
apt install -y python3 python3-venv python3-pip
python3 --version
```

---

## 4. Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version
npm --version
```

---

## 5. Caddy (Reverse Proxy + SSL)

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | \
    gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | \
    tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install caddy
```

---

## 6. Clonar Projeto

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/diogopelaes/cemep-digital.git
cd cemep-digital
```

---

## 7. Configurar Ambiente de Produção

### 7.1 Editar configurações

```bash
# Copiar e editar arquivo de configuração
cp env.production.json env.production.json.bak
nano env.production.json
```

**Alterar obrigatoriamente:**
- `database.password` → Senha do PostgreSQL
- `email.password` → App password do Gmail
- `security.secret_key` → Gerar nova chave

Gerar secret key:
```bash
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 7.2 Executar script de configuração

```bash
chmod +x setup-env-prod.sh
./setup-env-prod.sh
```

---

## 8. Backend (Django + Uvicorn)

```bash
cd /var/www/cemep-digital

# Criar ambiente virtual
python3 -m venv .venv
source .venv/bin/activate

# Instalar dependências
cd backend
pip install --upgrade pip
pip install -r requirements.txt
pip install uvicorn gunicorn

# Coletar arquivos estáticos
python manage.py collectstatic --noinput

# Executar migrações
python manage.py migrate

# Criar superusuário
python manage.py createsuperuser
```

---

## 9. Frontend (React + Vite)

```bash
cd /var/www/cemep-digital/frontend

# Instalar dependências
npm ci

# Configurar URL da API em produção
# Editar src/services/api.js se necessário

# Build de produção
npm run build
```

---

## 10. Iniciar Serviços

```bash
# Habilitar serviços
systemctl enable caddy
systemctl enable cemep-backend

# Iniciar serviços
systemctl start cemep-backend
systemctl start caddy

# Verificar status
systemctl status cemep-backend
systemctl status caddy
```

---

## 11. Verificar Logs

```bash
# Logs do backend
journalctl -u cemep-backend -f

# Logs do Caddy
journalctl -u caddy -f
```

---

## 12. Atualizar Aplicação

```bash
cd /var/www/cemep-digital

# Puxar atualizações
git pull origin main

# Backend
source .venv/bin/activate
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput

# Frontend
cd ../frontend
npm ci
npm run build

# Reiniciar serviços
systemctl restart cemep-backend
```

---

## Comandos Úteis

```bash
# Reiniciar backend
systemctl restart cemep-backend

# Recarregar Caddy (sem downtime)
systemctl reload caddy

# Ver logs em tempo real
journalctl -u cemep-backend -f

# Testar configuração do Caddy
caddy validate --config /etc/caddy/Caddyfile
```

---

## Segurança

- [x] SSL automático via Caddy (Let's Encrypt)
- [x] Variáveis sensíveis em `.env` (chmod 600)
- [x] DEBUG=false em produção
- [x] SECRET_KEY única por ambiente
- [x] Firewall: apenas portas 22, 80, 443

---

## Última atualização

Dezembro de 2025
