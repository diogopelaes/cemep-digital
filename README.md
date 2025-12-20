# CEMEP Digital - Sistema de Gestão Escolar

![CEMEP Digital](Documentation/img/CEMEP.jpeg)

Sistema de gestão escolar desenvolvido sob medida para o CEMEP (Centro Municipal de Educação Profissional), modernizando o controle de notas, frequências, ocorrências e comunicação.

## 🚀 Tecnologias

### Backend
- **Python 3.14** com Django REST Framework
- **PostgreSQL 18** como banco de dados
- **JWT** para autenticação
- **Uvicorn** como servidor ASGI
- **Caddy** como reverse proxy com SSL automático

### Frontend
- **React 18** com Vite
- **TailwindCSS** para estilização
- **React Router** para navegação
- **Axios** para requisições HTTP
- **React Icons** para ícones

## 📁 Estrutura do Projeto

```
cemep-digital/
├── backend/                 # API Django REST
│   ├── core_project/        # Configurações do projeto
│   ├── apps/
│   │   ├── users/           # Autenticação e perfis
│   │   ├── core/            # Cadastros base
│   │   ├── academic/        # Vida escolar
│   │   ├── pedagogical/     # Notas, faltas, ocorrências
│   │   ├── management/      # Tarefas e avisos
│   │   └── permanent/       # Arquivo permanente
│   ├── requirements.txt
│   └── manage.py
│
├── frontend/                # React + Vite
│   ├── src/
│   │   ├── components/      # Componentes UI
│   │   ├── contexts/        # Auth e Theme
│   │   ├── layouts/         # Layouts de página
│   │   ├── pages/           # Páginas
│   │   └── services/        # API
│   ├── package.json
│   └── vite.config.js
│
├── Documentation/           # Documentação técnica
├── GUIA_DEPLOY.md           # Guia de deploy na VPS
└── README.md
```

## 🔧 Configuração Local

### Pré-requisitos
- Python 3.14+
- Node.js 20+
- PostgreSQL 17+

### Backend

```powershell
# Entrar na pasta backend
cd backend

# Criar ambiente virtual
python -m venv .venv

# Ativar ambiente (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Instalar dependências
pip install -r requirements.txt

# Configurar variáveis de ambiente
# Copie .env.example para .env e configure

# Executar migrações
python manage.py migrate

# Criar superusuário
python manage.py createsuperuser

# Rodar servidor
python manage.py runserver
```

### Frontend

```powershell
# Entrar na pasta frontend
cd frontend

# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev
```

### Acessar
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000/api/v1/
- **Admin Django:** http://localhost:8000/admin/

## 👥 Perfis de Usuário

| Perfil | Descrição |
|--------|-----------|
| **Gestão** | Acesso total ao sistema |
| **Secretaria** | Cadastros e matrículas |
| **Professor** | Diário, notas e ocorrências |
| **Monitor** | Tarefas e avisos |
| **Estudante** | Boletim e avisos |
| **Responsável** | Boletim, ocorrências e avisos |

## 📋 Funcionalidades Principais

### Gestão Escolar
- ✅ Cadastro de funcionários com períodos de trabalho
- ✅ Cadastro de cursos, disciplinas e turmas
- ✅ Calendário escolar
- ✅ Atribuição de aulas

### Vida Escolar
- ✅ Cadastro completo de estudantes
- ✅ Matrículas e enturmação
- ✅ Cadastro de responsáveis
- ✅ Atestados médicos

### Pedagógico
- ✅ Planos de aula
- ✅ Diário de classe
- ✅ Registro de faltas
- ✅ Notas bimestrais
- ✅ Recuperação
- ✅ Ocorrências pedagógicas
- ✅ 5º Conceito (Conselho de Classe)

### Comunicação
- ✅ Tarefas para funcionários
- ✅ Reuniões HTPC com ata
- ✅ Avisos com anexos

### Arquivo Permanente
- ✅ Histórico escolar
- ✅ Ocorrências disciplinares
- ✅ Limpeza automática de dados (1 ano após saída)

## 🔒 Segurança

- Autenticação via JWT
- Permissões por perfil de usuário
- Arquivos de mídia protegidos
- CORS configurado
- Senhas criptografadas

## 📦 Deploy

Consulte o arquivo **[GUIA_DEPLOY.md](GUIA_DEPLOY.md)** para instruções detalhadas de deploy na VPS Hostinger.

## 🛠️ Comandos Úteis

### Limpeza de Dados Expirados
```bash
python manage.py limpar_dados_expirados --dry-run  # Simulação
python manage.py limpar_dados_expirados            # Execução real
```

### Build de Produção (Frontend)
```bash
npm run build
```

## 📄 Licença

Este projeto é de uso exclusivo do CEMEP - Centro Municipal de Educação Profissional.

---

**Desenvolvido com ❤️ para o CEMEP**
