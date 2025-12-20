# Guia de Desenvolvimento Local - CEMEP Digital

Guia rápido para rodar o projeto localmente no Windows.

---

## 📋 Pré-requisitos Instalados

- ✅ Python 3.14 (ou 3.12+)
- ✅ Node.js v24 (ou 20+)
- ✅ PostgreSQL 18
- ✅ Git

---

## 🗄️ 1. Configurar Banco de Dados (PostgreSQL)

### Abrir o pgAdmin ou psql e executar:

```sql
CREATE DATABASE cemep_digital;
```

> **Nota:** Você já configurou a senha do PostgreSQL como `f&0(iO1F,15w` no settings.py

---

## 🐍 2. Backend (Django)

### Abrir terminal PowerShell na pasta do projeto:

```powershell
# Navegar para a pasta backend
cd C:\Projects\cemep-digital\backend

# Criar ambiente virtual (apenas na primeira vez)
python -m venv .venv

# Ativar ambiente virtual
.\.venv\Scripts\Activate.ps1

# Instalar dependências (apenas na primeira vez ou quando atualizar)
pip install -r requirements.txt

# Executar migrações do banco de dados
python manage.py migrate

# Criar superusuário (apenas na primeira vez)
python manage.py createsuperuser
# Siga as instruções: username, email, senha

# Rodar o servidor
python manage.py runserver
```

### ✅ Backend rodando em: http://localhost:8000

**URLs úteis:**
- Admin Django: http://localhost:8000/admin/
- API: http://localhost:8000/api/v1/

---

## ⚛️ 3. Frontend (React)

### Abrir OUTRO terminal PowerShell:

```powershell
# Navegar para a pasta frontend
cd C:\Projects\cemep-digital\frontend

# Instalar dependências (apenas na primeira vez ou quando atualizar)
npm install

# Rodar em modo desenvolvimento
npm run dev
```

### ✅ Frontend rodando em: http://localhost:5173

---

## 🚀 Resumo Rápido (Dia a Dia)

### Terminal 1 - Backend:
```powershell
cd C:\Projects\cemep-digital\backend
.\.venv\Scripts\Activate.ps1
python manage.py runserver
```

### Terminal 2 - Frontend:
```powershell
cd C:\Projects\cemep-digital\frontend
npm run dev
```

---

## 🔧 Comandos Úteis

### Backend

```powershell
# Ativar ambiente virtual
.\.venv\Scripts\Activate.ps1

# Criar nova migração após alterar models
python manage.py makemigrations

# Aplicar migrações
python manage.py migrate

# Criar superusuário
python manage.py createsuperuser

# Rodar servidor em porta específica
python manage.py runserver 8080

# Abrir shell do Django
python manage.py shell

# Testar limpeza de dados (modo simulação)
python manage.py limpar_dados_expirados --dry-run
```

### Frontend

```powershell
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build de produção
npm run build

# Preview do build
npm run preview
```

---

## 📁 Estrutura de Pastas

```
C:\Projects\cemep-digital\
├── backend\
│   ├── .venv\              ← Ambiente virtual Python
│   ├── apps\               ← Apps Django
│   ├── core_project\       ← Configurações
│   ├── manage.py
│   └── requirements.txt
│
├── frontend\
│   ├── node_modules\       ← Dependências Node
│   ├── src\                ← Código React
│   ├── package.json
│   └── vite.config.js
│
└── Documentation\          ← Documentação
```

---

## 🔑 Credenciais Padrão (Desenvolvimento)

| Item | Valor |
|------|-------|
| PostgreSQL User | `postgres` |
| PostgreSQL Password | `f&0(iO1F,15w` |
| PostgreSQL Database | `cemep_digital` |
| PostgreSQL Port | `5432` |
| Backend URL | `http://localhost:8000` |
| Frontend URL | `http://localhost:5173` |

---

## ❓ Problemas Comuns

### "Não consigo ativar o ambiente virtual"

```powershell
# Executar como administrador:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### "Erro de conexão com PostgreSQL"

1. Verifique se o serviço PostgreSQL está rodando
2. Abra `Serviços` do Windows (services.msc)
3. Procure por `postgresql-x64-18` e inicie se estiver parado

### "Porta 8000 já em uso"

```powershell
# Use outra porta
python manage.py runserver 8080
```

### "Erro de CORS"

Certifique-se de que o frontend está rodando em http://localhost:5173 (configurado no settings.py)

---

## 📝 Checklist Diário

- [ ] PostgreSQL rodando
- [ ] Terminal 1: Backend ativo (`python manage.py runserver`)
- [ ] Terminal 2: Frontend ativo (`npm run dev`)
- [ ] Acessar http://localhost:5173

---

**Última atualização:** Dezembro 2025

