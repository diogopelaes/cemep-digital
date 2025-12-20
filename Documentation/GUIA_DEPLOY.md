# Guia de Deploy - CEMEP Digital

Este guia descreve o processo completo de deploy do sistema CEMEP Digital na VPS Hostinger utilizando PuTTY.

## Informações do Servidor

- **IP:** 72.61.223.71
- **Hostname:** srv1175442.hstgr.cloud
- **OS:** Ubuntu 25.10
- **Usuário SSH:** root
- **Senha:** `f&0(iO1F,15w`

---

## 1. Conectando via PuTTY

1. Abra o PuTTY
2. Em **Host Name**, digite: `72.61.223.71`
3. Porta: `22`
4. Clique em **Open**
5. Login: `root`
6. Senha: `f&0(iO1F,15w`

---

## 2. Preparação do Servidor

### 2.1 Atualizar o sistema

```bash
apt update && apt upgrade -y
```

### 2.2 Instalar dependências básicas

```bash
apt install -y build-essential git curl wget software-properties-common \
    libpq-dev libssl-dev libffi-dev python3-dev
```

### 2.3 Configurar Timezone

```bash
timedatectl set-timezone America/Sao_Paulo
```

---

## 3. Instalar PostgreSQL

```bash
# Adicionar repositório oficial do PostgreSQL
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -

# Instalar PostgreSQL
apt update
apt install -y postgresql-17 postgresql-contrib-17

# Iniciar serviço
systemctl start postgresql
systemctl enable postgresql
```

### 3.1 Configurar Banco de Dados

```bash
# Acessar PostgreSQL
sudo -u postgres psql

# Criar banco e usuário
CREATE DATABASE cemep_digital;
CREATE USER cemep_user WITH PASSWORD 'sua_senha_segura_aqui';
GRANT ALL PRIVILEGES ON DATABASE cemep_digital TO cemep_user;
ALTER DATABASE cemep_digital OWNER TO cemep_user;
\q
```

---

## 4. Instalar Python

```bash
# Instalar Python 3.12 (ou versão disponível)
apt install -y python3.12 python3.12-venv python3.12-dev python3-pip

# Verificar instalação
python3.12 --version
```

---

## 5. Instalar Node.js

```bash
# Instalar Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verificar instalação
node --version
npm --version
```

---

## 6. Instalar Caddy (Web Server)

```bash
# Instalar Caddy
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install caddy

# Iniciar serviço
systemctl start caddy
systemctl enable caddy
```

---

## 7. Clonar o Projeto

```bash
# Criar diretório
mkdir -p /var/www
cd /var/www

# Clonar repositório
git clone https://github.com/diogopelaes/cemep-digital.git
cd cemep-digital
```

---

## 8. Configurar Backend (Django)

### 8.1 Criar ambiente virtual

```bash
cd /var/www/cemep-digital/backend

# Criar e ativar venv
python3.12 -m venv venv
source venv/bin/activate

# Instalar dependências
pip install --upgrade pip
pip install -r requirements.txt
```

### 8.2 Configurar variáveis de ambiente

```bash
# Criar arquivo .env
nano /var/www/cemep-digital/backend/.env
```

Conteúdo do `.env`:

```env
# Django Settings
DEBUG=False
SECRET_KEY=gerar-uma-chave-secreta-longa-e-aleatoria-aqui
ALLOWED_HOSTS=72.61.223.71,srv1175442.hstgr.cloud,seudominio.com.br

# Database
DB_NAME=cemep_digital
DB_USER=cemep_user
DB_PASSWORD=sua_senha_do_banco
DB_HOST=localhost
DB_PORT=5432

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=cemep-digital@gmail.com
EMAIL_HOST_PASSWORD=sua_senha_de_app_gmail
DEFAULT_FROM_EMAIL=CEMEP Digital <cemep-digital@gmail.com>

# Frontend
FRONTEND_URL=https://seudominio.com.br
```

### 8.3 Executar migrações e collectstatic

```bash
cd /var/www/cemep-digital/backend
source venv/bin/activate

# Migrações
python manage.py migrate

# Coletar arquivos estáticos
python manage.py collectstatic --noinput

# Criar superusuário
python manage.py createsuperuser
```

---

## 9. Configurar Frontend (React)

```bash
cd /var/www/cemep-digital/frontend

# Instalar dependências
npm install

# Build de produção
npm run build
```

O build será gerado em `/var/www/cemep-digital/frontend/dist/`

---

## 10. Configurar Systemd (Backend)

### 10.1 Criar serviço para Uvicorn

```bash
nano /etc/systemd/system/cemep-backend.service
```

Conteúdo:

```ini
[Unit]
Description=CEMEP Digital Backend (Uvicorn)
After=network.target postgresql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/cemep-digital/backend
Environment="PATH=/var/www/cemep-digital/backend/venv/bin"
ExecStart=/var/www/cemep-digital/backend/venv/bin/uvicorn core_project.asgi:application --host 127.0.0.1 --port 8000 --workers 2

Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

### 10.2 Ajustar permissões

```bash
# Criar usuário www-data se não existir
id www-data || useradd -r -s /bin/false www-data

# Ajustar permissões
chown -R www-data:www-data /var/www/cemep-digital
chmod -R 755 /var/www/cemep-digital
```

### 10.3 Iniciar serviço

```bash
systemctl daemon-reload
systemctl start cemep-backend
systemctl enable cemep-backend

# Verificar status
systemctl status cemep-backend
```

---

## 11. Configurar Caddy (Reverse Proxy + SSL)

```bash
nano /etc/caddy/Caddyfile
```

### Configuração com domínio (HTTPS automático):

```caddyfile
seudominio.com.br {
    # Frontend (React)
    root * /var/www/cemep-digital/frontend/dist
    
    # API Backend
    handle /api/* {
        reverse_proxy localhost:8000
    }
    
    # Admin Django
    handle /admin/* {
        reverse_proxy localhost:8000
    }
    
    # Media files (protegidos pelo backend)
    handle /media/* {
        reverse_proxy localhost:8000
    }
    
    # Static files do Django
    handle /static/* {
        root * /var/www/cemep-digital/backend/staticfiles
        file_server
    }
    
    # SPA fallback
    handle {
        try_files {path} /index.html
        file_server
    }
    
    # Logs
    log {
        output file /var/log/caddy/cemep.log
    }
}
```

### Configuração apenas com IP (sem HTTPS):

```caddyfile
:80 {
    # Frontend (React)
    root * /var/www/cemep-digital/frontend/dist
    
    # API Backend
    handle /api/* {
        reverse_proxy localhost:8000
    }
    
    # Admin Django
    handle /admin/* {
        reverse_proxy localhost:8000
    }
    
    # Media files
    handle /media/* {
        reverse_proxy localhost:8000
    }
    
    # Static files do Django
    handle /static/* {
        root * /var/www/cemep-digital/backend/staticfiles
        file_server
    }
    
    # SPA fallback
    handle {
        try_files {path} /index.html
        file_server
    }
}
```

### Reiniciar Caddy

```bash
systemctl restart caddy
systemctl status caddy
```

---

## 12. Configurar Cron para Limpeza de Dados

```bash
# Editar crontab
crontab -e
```

Adicionar linha:

```cron
# Limpeza de dados expirados - Toda segunda-feira de julho às 03:00
0 3 * 7 1 cd /var/www/cemep-digital/backend && /var/www/cemep-digital/backend/venv/bin/python manage.py limpar_dados_expirados >> /var/log/cemep_limpeza.log 2>&1
```

---

## 13. Firewall (UFW)

```bash
# Habilitar UFW
ufw enable

# Permitir SSH
ufw allow 22

# Permitir HTTP e HTTPS
ufw allow 80
ufw allow 443

# Verificar status
ufw status
```

---

## 14. Verificação Final

1. **Backend:** Acesse `http://72.61.223.71/api/v1/` (deve retornar JSON)
2. **Admin:** Acesse `http://72.61.223.71/admin/` (login Django)
3. **Frontend:** Acesse `http://72.61.223.71/` (aplicação React)

---

## 15. Comandos Úteis

### Logs

```bash
# Logs do backend
journalctl -u cemep-backend -f

# Logs do Caddy
tail -f /var/log/caddy/cemep.log
```

### Reiniciar serviços

```bash
systemctl restart cemep-backend
systemctl restart caddy
```

### Atualizar código

```bash
cd /var/www/cemep-digital

# Pull do repositório
git pull origin main

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
systemctl restart cemep-backend

# Frontend
cd ../frontend
npm install
npm run build
```

---

## 16. Backup do Banco de Dados

### Criar backup

```bash
pg_dump -U cemep_user -h localhost cemep_digital > /backup/cemep_$(date +%Y%m%d).sql
```

### Restaurar backup

```bash
psql -U cemep_user -h localhost cemep_digital < /backup/cemep_20250101.sql
```

---

## Suporte

Em caso de problemas:
1. Verifique os logs dos serviços
2. Confirme que PostgreSQL está rodando
3. Verifique as permissões de arquivos
4. Confirme as configurações do `.env`

---

**Última atualização:** Dezembro 2025

