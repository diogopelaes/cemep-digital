# CEMEP Digital - Sistema de Gestão Escolar

<img src="Documentation/img/CEMEP.jpeg" alt="CEMEP Digital" width="200">

Sistema de gestão escolar desenvolvido sob medida para o **CEMEP - Centro Municipal de Ensino Profissionalizante** de Paulínia/SP, modernizando o controle de notas, frequências, ocorrências e comunicação.

---

## 🚀 Tecnologias

| Camada | Stack |
|--------|-------|
| **Backend** | Python 3.12+, Django 5, DRF, PostgreSQL 16+, JWT, Uvicorn |
| **Frontend** | React 18, Vite, TailwindCSS, React Router, Axios |
| **Infra** | Caddy (reverse proxy + SSL), VPS Ubuntu |

---

## 📁 Estrutura do Projeto

```
cemep-digital/
├── backend/                    # API Django REST
│   ├── core_project/           # Configurações Django
│   ├── apps/
│   │   ├── users/              # Autenticação e perfis
│   │   ├── core/               # Funcionários, Turmas, Disciplinas
│   │   ├── academic/           # Estudantes, Matrículas, Responsáveis
│   │   ├── pedagogical/        # Aulas, Notas, Faltas, Ocorrências
│   │   ├── management/         # Tarefas, Avisos, HTPC
│   │   └── permanent/          # Histórico escolar, Prontuário
│   └── manage.py
│
├── frontend/                   # React + Vite
│   ├── src/
│   │   ├── components/         # Componentes reutilizáveis (ui/, common/)
│   │   ├── pages/              # Páginas da aplicação
│   │   ├── hooks/              # Custom hooks
│   │   ├── contexts/           # Auth e Theme
│   │   ├── services/           # Camada de API
│   │   ├── utils/              # Formatadores e validadores
│   │   └── data/               # Constantes centralizadas
│   └── vite.config.js
│
├── Documentation/              # Documentação técnica
│   ├── FRONTEND_ARCHITECTURE.md
│   └── BACKEND_ARCHITECTURE.md
│
└── institutional_config.json   # Dados institucionais centralizados
```

---

## 🔧 Início Rápido

### Pré-requisitos
- Python 3.12+
- Node.js 20+
- PostgreSQL 16+

### Configuração de Ambiente

```powershell
# Gerar arquivo .env a partir do JSON
.\setup-env-dev.ps1
```

### Opção 1: Script Automático (Recomendado)

```powershell
# Na raiz do projeto
.\Documentation\start-app.ps1
```

### Opção 2: Manual

**Backend:**
```powershell
cd backend
..\\.venv\Scripts\Activate.ps1   # Ativar venv
pip install -r requirements.txt  # Instalar dependências
python manage.py migrate         # Migrações
python manage.py runserver       # Iniciar servidor
```

**Frontend:**
```powershell
cd frontend
npm install                      # Instalar dependências
npm run dev                      # Iniciar dev server
```

### Acessos
| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API Backend | http://localhost:8000/api/v1/ |
| Django Admin | http://localhost:8000/admin/ |

---

## 👥 Perfis de Usuário e Permissões

| Perfil | Escrita | Leitura |
|--------|---------|---------|
| **Gestão** | Tudo | Tudo |
| **Secretaria** | Cadastros, Matrículas | Tudo (exceto prontuário) |
| **Professor** | Aulas, Notas, Faltas, Planos | Cadastros |
| **Monitor** | - | Cadastros, Avisos |
| **Estudante** | - | Próprio boletim |
| **Responsável** | - | Filhos: boletim, ocorrências |

---

## 📋 Funcionalidades

### ✅ Gestão Escolar (Core)
- Funcionários com períodos de trabalho e importação em massa
- Cursos, Disciplinas e Turmas com toggle ativo/inativo
- Calendário escolar e bimestres
- Atribuição de professores às disciplinas

### ✅ Vida Escolar (Academic)
- Cadastro completo de estudantes com foto 3x4
- Sistema de matrículas CEMEP (10 dígitos) + Enturmação
- Responsáveis com parentesco
- Atestados médicos com arquivo

### ✅ Pedagógico (Pedagogical)
- Planos de aula com habilidades BNCC
- Diário de classe e registro de aulas
- Chamada e faltas em lote
- Notas bimestrais e boletim
- Ocorrências pedagógicas com notificação aos responsáveis

### ✅ Gestão Interna (Management)
- Tarefas atribuídas a funcionários
- Reuniões HTPC com ata e presença
- Avisos com destinatários e controle de leitura

### ✅ Arquivo Permanente (Permanent)
- Histórico escolar completo
- Prontuário com anexos
- Dados imutáveis para auditoria

---

## 📖 Documentação para Desenvolvedores

> **Para IAs/LLMs:** Consulte estes arquivos antes de desenvolver:

| Documento | Conteúdo |
|-----------|----------|
| [FRONTEND_ARCHITECTURE.md](Documentation/FRONTEND_ARCHITECTURE.md) | Estrutura React, componentes, hooks, padrões |
| [BACKEND_ARCHITECTURE.md](Documentation/BACKEND_ARCHITECTURE.md) | Apps Django, modelos, permissões, ViewSets |
| [GUIA_DEPLOY.md](Documentation/GUIA_DEPLOY.md) | Deploy na VPS Hostinger com Caddy |
| [REQUISITOS_SISTEMA.md](Documentation/REQUISITOS_SISTEMA.md) | Requisitos funcionais do sistema |

---

## 🔒 Segurança

- **Autenticação JWT** com access/refresh tokens (rotação automática)
- **Rate Limiting** - 100 req/h anônimo, 1000 req/h autenticado
- **Permissões por perfil** via Mixins no backend
- **SSL/HSTS** obrigatório em produção
- **Cookies seguros** (CSRF e Session)
- **Variáveis de ambiente** para todas as credenciais
- **Senhas criptografadas** com Django hasher

---

## 🛠️ Comandos Úteis

```bash
# Backend
python manage.py check              # Verificar erros
python manage.py makemigrations     # Criar migrações
python manage.py migrate            # Aplicar migrações
python manage.py createsuperuser    # Criar admin

# Frontend
npm run dev                         # Desenvolvimento
npm run build                       # Build produção
npm run lint                        # Verificar código
```

---

## 📦 Deploy

Consulte **[GUIA_DEPLOY.md](Documentation/GUIA_DEPLOY.md)** para instruções de deploy na VPS.

---

## 📄 Licença

Uso exclusivo do **CEMEP - Centro Municipal de Ensino Profissionalizante**  
Prefeitura Municipal de Paulínia/SP

---

**Desenvolvido com ❤️ para a educação profissional de Paulínia**
