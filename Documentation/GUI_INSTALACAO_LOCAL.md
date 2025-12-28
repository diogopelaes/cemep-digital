# Instalação Local para Desenvolvimento – CEMEP Digital (Windows)

Este guia descreve **passo a passo** como instalar e executar o sistema **CEMEP Digital** localmente em **Windows**, para ambiente de desenvolvimento.

---

## Requisitos de Software (Downloads)

Instale **antes de qualquer coisa**:

### 1. Git
- Download: https://git-scm.com/download/win
- Durante a instalação, mantenha as opções padrão.

Verificação:
```powershell
git --version
```

---

### 2. Python 3.14.x (64 bits)
- Download: https://www.python.org/downloads/windows/
- Escolha **Python 3.14.x – Windows installer (64-bit)**

⚠️ Durante a instalação:
- Marque **Add Python to PATH**
- Escolha **Install for all users** (recomendado)

Verificação:
```powershell
py --version
```

Saída esperada:
```
Python 3.14.x
```

---

### 3. Node.js 24.x
- Download: https://nodejs.org/en/download/
- Escolha **Windows Installer (.msi) – 64-bit**

Verificação:
```powershell
node --version
npm --version
```

---

### 4. PostgreSQL 18
- Download: https://www.postgresql.org/download/windows/
- Escolha **PostgreSQL 18**

Durante a instalação:
- Usuário: `postgres`
- Senha: `f&0(iO1F,15w`
- Porta: `5432`
- Locale: Default

Verificação:
```powershell
psql --version
```

---

## Configuração do PowerShell

Permitir execução de scripts locais:

Abra o PowerShell **como usuário normal** e execute:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Verificação:
```powershell
Get-ExecutionPolicy -List
```

---

## Clonar o Repositório

Escolha um diretório de trabalho, por exemplo:

```powershell
C:\Projects
```

Execute:

```powershell
cd C:\Projects
git clone https://github.com/diogopelaes/cemep-digital.git
cd cemep-digital
```

Estrutura esperada:

```
cemep-digital/
├─ backend/
├─ frontend/
├─ .venv/
```

---

## Criar e Ativar Ambiente Virtual Python

```powershell
cd backend
py -m venv ..\.venv
..\.venv\Scripts\Activate.ps1
```

Confirmação:
```powershell
where python
```

Deve apontar para `.venv`.

---

## Atualizar pip

```powershell
py -m pip install --upgrade pip
```

---

## Instalar Dependências do Backend

```powershell
pip install -r requirements.txt
```

---

## Criar Banco de Dados PostgreSQL

Acesse o PostgreSQL:

```powershell
psql -U postgres
```

Execute:

```sql
CREATE DATABASE cemep_digital;
\q
```

Configuração usada pelo Django:

```text
NAME: cemep_digital
USER: postgres
PASSWORD: f&0(iO1F,15w
HOST: localhost
PORT: 5432
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

## Ajustar Script start-app.ps1

Arquivo:
```
backend/Documentation/start-app.ps1
```

Confirme ou ajuste:

```powershell
$PROJECT_ROOT = "C:\Projects\cemep-digital"
```

Verifique se os caminhos existem:
- backend
- frontend
- .venv\Scripts\Activate.ps1

---

## Executar a Aplicação

```powershell
cd backend\Documentation
.\start-app.ps1
```

O script irá:
- Abrir uma janela com o **backend Django**
- Abrir outra janela com o **frontend Vite/React**

---

## Scripts de Utilidade (Raiz do Projeto)

Existem scripts no diretório raiz (`C:\Projects\cemep-digital`) para facilitar o desenvolvimento:

### 1. Resetar Banco de Dados (`reset-db.ps1`)
Este script automatiza o processo de limpeza e recriação do ambiente:
1.  Exclui o banco de dados local `cemep_digital`.
2.  Limpa todos os arquivos de migração antigos (exceto `__init__.py`).
3.  Recria o banco de dados.
4.  Executa novas migrações (`makemigrations` e `migrate`).
5.  Cria um superusuário padrão:
    - **Usuário:** `diogo`
    - **Senha:** `123`

**Uso:**
```powershell
.\reset-db.ps1
```

### 2. Iniciar Ambiente de Desenvolvimento (`start-dev.ps1`)
Este script inicia simultaneamente o servidor do Backend e do Frontend em janelas separadas do PowerShell, facilitando o início rápido do trabalho.

**Uso:**
```powershell
.\start-dev.ps1
```

---

## Acessar o Sistema

- Frontend: http://localhost:5173/
- Backend API: http://localhost:8000/
- Admin Django: http://localhost:8000/admin/

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
