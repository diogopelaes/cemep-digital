# Instalação Local para Desenvolvimento – CEMEP Digital (Windows)

Este guia descreve **passo a passo** como instalar e executar o sistema **CEMEP Digital** localmente em **Windows**, para ambiente de desenvolvimento.

---

## Requisitos de Software (Downloads)

Instale **antes de qualquer coisa**:

### 1. Git
- Download: https://git-scm.com/download/win
- Durante a instalação, mantenha as opções padrão.

```powershell
git --version
```

---

### 2. Python 3.12+ (64 bits)
- Download: https://www.python.org/downloads/windows/

⚠️ Durante a instalação:
- Marque **Add Python to PATH**
- Escolha **Install for all users**

```powershell
py --version
```

---

### 3. Node.js 20 LTS
- Download: https://nodejs.org/en/download/
- Escolha **Windows Installer (.msi) – 64-bit**

```powershell
node --version
npm --version
```

---

### 4. PostgreSQL 16+
- Download: https://www.postgresql.org/download/windows/

Durante a instalação:
- Usuário: `postgres`
- Senha: `f&0(iO1F,15w`
- Porta: `5432`

```powershell
psql --version
```

---

## Configuração do PowerShell

Permitir execução de scripts locais:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

---

## Clonar o Repositório

```powershell
cd C:\Projects
git clone https://github.com/diogopelaes/cemep-digital.git
cd cemep-digital
```

---

## Configurar Ambiente de Desenvolvimento

### Opção 1: Script Automático (Recomendado)

Execute o script que configura as variáveis de ambiente a partir do JSON:

```powershell
.\setup-env-dev.ps1
```

Este script:
- Lê `env.development.json`
- Gera o arquivo `backend\.env` automaticamente

### Opção 2: Manual

Crie o arquivo `backend\.env` manualmente:

```env
DEBUG=true
SECRET_KEY=django-insecure-dev-key
ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=cemep_digital
DB_USER=postgres
DB_PASSWORD=f&0(iO1F,15w
DB_HOST=localhost
DB_PORT=5432

FRONTEND_URL=http://localhost:5173
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

---

## Criar Ambiente Virtual Python

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

---

## Instalar Dependências do Backend

```powershell
cd backend
pip install --upgrade pip
pip install -r requirements.txt
```

---

## Criar Banco de Dados PostgreSQL

```powershell
psql -U postgres
```

```sql
CREATE DATABASE cemep_digital;
\q
```

---

## Migrar Banco de Dados

```powershell
py manage.py makemigrations
py manage.py migrate
```

---

## Criar Superusuário

```powershell
py manage.py createsuperuser
```

---

## Instalar Dependências do Frontend

```powershell
cd ..\frontend
npm install
```

---

## Executar a Aplicação

### Script Rápido (Recomendado)

```powershell
cd C:\Projects\cemep-digital
.\start-dev.ps1
```

### Manual

Terminal 1 (Backend):
```powershell
cd C:\Projects\cemep-digital
.\.venv\Scripts\Activate.ps1
cd backend
py manage.py runserver
```

Terminal 2 (Frontend):
```powershell
cd C:\Projects\cemep-digital\frontend
npm run dev
```

---

## Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `setup-env-dev.ps1` | Configura variáveis de ambiente para desenvolvimento |
| `start-dev.ps1` | Inicia backend e frontend simultaneamente |
| `reset-db.ps1` | Limpa e recria o banco de dados |

---

## Arquivos de Configuração

| Arquivo | Descrição |
|---------|-----------|
| `env.development.json` | Configurações de desenvolvimento |
| `env.production.json` | Template para produção |
| `institutional_config.json` | Dados institucionais do sistema **(obrigatório)** |
| `backend\.env` | Variáveis de ambiente (gerado pelo script) |

---

## Acessar o Sistema

- Frontend: http://localhost:5173/
- Backend API: http://localhost:8000/
- Admin Django: http://localhost:8000/admin/

---

## Testar Envio de Email (Desenvolvimento)

Por padrão, emails são exibidos no **console do Django** em vez de serem enviados.

Para testar com SMTP real, edite `env.development.json`:

```json
{
    "email": {
        "backend": "django.core.mail.backends.smtp.EmailBackend",
        "host": "smtp.gmail.com",
        ...
    }
}
```

E execute novamente `.\setup-env-dev.ps1`.

---

## Observações Importantes

- Sempre ative o `.venv` antes de rodar comandos Django
- Se alterar models, rode novamente:
```powershell
py manage.py makemigrations
py manage.py migrate
```

---

## Última atualização

Dezembro de 2025
