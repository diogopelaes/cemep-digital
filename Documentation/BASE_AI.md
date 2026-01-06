# CEMEP Digital - Contexto Base para IA

> **Propósito:** Este documento serve como referência base para assistentes de IA ao desenvolver ou modificar o sistema CEMEP Digital. Consulte-o sempre antes de executar qualquer tarefa.

---

## ⚠️ AMBIENTE E TERMINAL (MUITO IMPORTANTE)

**Sistema Operacional:** Windows 10/11
**Terminal Padrão:** PowerShell
**Separador de Caminho:** Backslash (`\`)

> **REGRAS RÍGIDAS PARA COMANDOS:**
> 1. **NUNCA** sugira comandos Bash (`ls`, `cp`, `mv`, `rm -rf`, `sudo`, `grep`, `cat`, `touch`, `nano`).
> 2. **NUNCA** use `source` para ativar ambientes virtuais.
> 3. **SEMPRE** use sintaxe PowerShell (`Get-ChildItem`, `Copy-Item`, `Remove-Item`, `New-Item`).
> 4. **SEMPRE** use `.\` para executar scripts no diretório atual (ex: `.\start-dev.ps1`).
> 5. Ao sugerir caminhos de arquivo em código ou comandos, use `\` (ex: `backend\manage.py`).

**Tabela de Tradução Obrigatória:**
| Linux/Bash | Windows/PowerShell |
|------------|--------------------|
| `source .venv/bin/activate` | `.\.venv\Scripts\Activate.ps1` |
| `./script.sh` | `.\script.ps1` |
| `ls -la` | `ls` ou `Get-ChildItem` |
| `rm -rf folder` | `Remove-Item -Recurse -Force folder` |
| `cp file dest` | `Copy-Item file dest` |
| `export VAR=val` | `$env:VAR="val"` |
| `touch file.txt` | `New-Item -ItemType File file.txt` |

---

## 🎯 Visão Geral do Projeto

**Sistema:** CEMEP Digital - Sistema de Gestão Escolar
**Cliente:** CEMEP - Centro Municipal de Ensino Profissionalizante (Paulínia/SP)
**Ambiente:** VPS única (1 Core / 4GB RAM) - otimização de performance é crítica

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologias |
|--------|-------------|
| **Backend** | Python 3.14+, Django 6, Django REST Framework, PostgreSQL 18+, Simple JWT |
| **Frontend** | React 18, Vite, TailwindCSS 3, React Router DOM 6, Axios |
| **Infra** | Caddy (reverse proxy + SSL), Uvicorn (ASGI) |

---

## � Ambiente Virtual Python

> **⚠️ SEMPRE ATIVAR ANTES DE QUALQUER COMANDO PYTHON:**

```powershell
C:\Projects\cemep-digital\.venv\Scripts\Activate.ps1
```

O ambiente virtual está localizado na raiz do projeto em `.venv/`. Todos os comandos do backend (`python manage.py`, `pip`, etc.) devem ser executados **após** ativar este ambiente.

---

## �📁 Estrutura Principal

```
cemep-digital/
├── backend/                    # API Django REST
│   ├── core_project/           # Configurações Django (settings.py, urls.py)
│   ├── apps/
│   │   ├── users/              # Autenticação, perfis, permissões
│   │   ├── core/               # Funcionários, Turmas, Disciplinas, Calendário
│   │   ├── academic/           # Estudantes, Matrículas, Responsáveis
│   │   ├── pedagogical/        # Aulas, Notas, Faltas, Ocorrências
│   │   ├── management/         # Tarefas, Avisos, HTPC
│   │   └── permanent/          # Histórico escolar, Prontuário
│   ├── media/                  # Uploads (fotos, atestados)
│   └── requirements.txt        # Dependências Python
│
├── frontend/                   # React + Vite
│   ├── src/
│   │   ├── components/         # Componentes (ui/, common/, turmas/, estudantes/, etc.)
│   │   ├── pages/              # Páginas da aplicação
│   │   ├── hooks/              # Custom hooks
│   │   ├── contexts/           # Auth, Theme, Reference
│   │   ├── services/           # Camada de API (api.js)
│   │   ├── utils/              # Formatadores, validadores
│   │   ├── data/               # Constantes centralizadas
│   │   └── layouts/            # MainLayout, Sidebar
│   └── package.json            # Dependências Node
│
├── Documentation/              # Documentação técnica
│   ├── BACKEND_ARCHITECTURE.md # ⭐ Arquitetura backend detalhada
│   ├── FRONTEND_ARCHITECTURE.md # ⭐ Arquitetura frontend detalhada
│   ├── BACKEND_BEST_PRACTICES.md
│   ├── FRONTEND_BEST_PRACTICES.md
│   └── GUIA_DEPLOY.md
│
├── institutional_config.json   # Dados institucionais centralizados
├── env.development.json        # Configurações dev
├── env.production.json         # Configurações prod
└── start-dev.ps1               # Script para iniciar ambiente de desenvolvimento
```

---

## 🚀 Como Iniciar o Ambiente de Desenvolvimento

```powershell
# Na raiz do projeto
.\start-dev.ps1
```

Isso abre duas janelas PowerShell:
- **Backend:** Ativa o venv e roda `python manage.py runserver` (porta 8000)
- **Frontend:** Roda `npm run dev` (porta 5173)

**Acessos:**
| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API Backend | http://localhost:8000/api/v1/ |
| Django Admin | http://localhost:8000/admin/ |

---

## 👥 Perfis de Usuário

| Perfil | Escrita | Leitura |
|--------|---------|---------|
| **GESTAO** | Tudo | Tudo |
| **SECRETARIA** | Cadastros, Matrículas | Tudo (exceto prontuário) |
| **PROFESSOR** | Aulas, Notas, Faltas, Planos | Cadastros |
| **MONITOR** | - | Cadastros, Avisos |
| **ESTUDANTE** | - | Próprio boletim |
| **RESPONSAVEL** | - | Filhos: boletim, ocorrências |

---

## 📖 Documentação Obrigatória

> **⚠️ IMPORTANTE:** Antes de qualquer tarefa de desenvolvimento, consulte:

| Documento | Quando Consultar |
|-----------|------------------|
| [`BACKEND_ARCHITECTURE.md`](./BACKEND_ARCHITECTURE.md) | Criar/modificar models, views, serializers, permissões |
| [`FRONTEND_ARCHITECTURE.md`](./FRONTEND_ARCHITECTURE.md) | Criar/modificar componentes, hooks, páginas |
| [`BACKEND_BEST_PRACTICES.md`](./BACKEND_BEST_PRACTICES.md) | Padrões de código backend |
| [`FRONTEND_BEST_PRACTICES.md`](./FRONTEND_BEST_PRACTICES.md) | Padrões de código frontend |

---

## ⚡ Padrões Críticos de Desenvolvimento

### Backend (Django REST Framework)

```python
# Estrutura de cada app:
apps/<app>/
├── models.py              # Modelos do banco
├── views/                 # Pacote modularizado
│   ├── __init__.py        # Re-exporta ViewSets
│   └── <entidade>.py      # ViewSet individual
├── serializers/           # Pacote modularizado
│   ├── __init__.py        # Re-exporta Serializers
│   └── <entidade>.py      # Serializer individual
└── urls.py                # DefaultRouter
```

#### Sistema de Permissões (`apps/users/permissions.py`)

> **⚠️ SEMPRE** usar Mixins de permissão nos ViewSets. Nunca verificar permissões manualmente.

**Mixins Disponíveis (escolha o apropriado):**

| Mixin | Escrita (CUD) | Leitura (R) |
|-------|---------------|-------------|
| `GestaoOnlyMixin` | GESTAO | GESTAO |
| `GestaoSecretariaMixin` | GESTAO, SECRETARIA | GESTAO, SECRETARIA |
| `GestaoWriteFuncionarioReadMixin` | GESTAO | Todos funcionários |
| `GestaoSecretariaWriteFuncionarioReadMixin` | GESTAO, SECRETARIA | Todos funcionários |
| `ProfessorWriteFuncionarioReadMixin` | GESTAO, PROFESSOR | Todos funcionários |
| `GestaoWritePublicReadMixin` | GESTAO | Qualquer autenticado |
| `FuncionarioMixin` | Todos funcionários | Todos funcionários |

**Filtro por Ano Letivo:**
```python
from apps.users.permissions import GestaoWriteFuncionarioReadMixin, AnoLetivoFilterMixin

class TurmaViewSet(AnoLetivoFilterMixin, GestaoWriteFuncionarioReadMixin, viewsets.ModelViewSet):
    ano_letivo_field = 'ano_letivo'  # Campo para filtro automático
    ...
```

### Frontend (React)

```jsx
// Padrão: Page → Hook → Components
// Pages orquestram, não contêm lógica de negócio
// Hooks encapsulam estado e lógica
// Components são UI pura

// Usar constantes centralizadas:
import { TIPOS_USUARIO, ESTADOS_COMUNS } from '../data'

// Usar formatadores centralizados:
import { displayCPF, formatTelefone } from '../utils/formatters'

// Usar componentes comuns:
import { InfoItem, PageHeader } from '../components/common'
import { Button, Input, Card } from '../components/ui'

// Usar hooks customizados para lógica complexa:
import { useFuncionarioForm, useEstudanteForm } from '../hooks'
```

---

## 🎨 Design System e Estilo Visual

> **⚠️ MUITO IMPORTANTE:** Sempre manter consistência visual. Antes de criar novos componentes, **verificar se já existe algo similar** e seguir os mesmos padrões.

### Arquivos de Referência

| Arquivo | Descrição |
|---------|-----------|
| `frontend/tailwind.config.js` | Paleta de cores, fontes, sombras, animações |
| `frontend/src/index.css` | Classes utilitárias customizadas (glassmorphism, botões, inputs, etc.) |
| `frontend/src/components/ui/` | Componentes primitivos de interface |
| `frontend/index.html` | Fonte Outfit do Google Fonts |

### Paleta de Cores (Tailwind)

```javascript
// Cores principais - SEMPRE usar essas, nunca cores genéricas
primary: { 50-900 }    // Azul Sky (#0ea5e9) - cor principal
accent: { 50-900 }     // Fuchsia (#d946ef) - destaque/ação especial
success: { 500, 600 }  // Verde (#22c55e) - sucesso
warning: { 500, 600 }  // Amarelo (#f59e0b) - alerta
danger: { 500, 600 }   // Vermelho (#ef4444) - erro/perigo

// Fundos e texto
slate: { 50-900 }      // Cinzas neutros para fundo e texto
```

### Tipografia

- **Fonte principal:** `Outfit` (Google Fonts)
- **Dark Mode:** Suportado via classe `dark` no HTML

### Características Visuais do Sistema

1. **Glassmorphism** - Fundo semi-transparente com blur
   ```jsx
   <div className="glass">...</div>  // bg com blur e borda sutil
   ```

2. **Cards Premium** - Com hover suave
   ```jsx
   <div className="card">...</div>  // glass + rounded-2xl + hover:scale
   ```

3. **Gradientes** - Nos botões e fundos
   ```jsx
   <button className="btn-primary">...</button>  // gradiente azul
   ```

4. **Animações** - Transições suaves
   - `animate-fade-in` - Fade in
   - `animate-slide-up` - Slide de baixo
   - `animate-slide-in-right` - Slide da direita

### Classes CSS Utilitárias (index.css)

| Classe | Uso |
|--------|-----|
| `.glass` | Efeito glassmorphism |
| `.card` | Card com glass + hover |
| `.btn-primary` | Botão azul principal |
| `.btn-secondary` | Botão cinza |
| `.btn-danger` | Botão vermelho |
| `.btn-ghost` | Botão transparente |
| `.btn-accent` | Botão roxo/fuchsia |
| `.input` | Estilo padrão de input |
| `.label` | Label de campo |
| `.badge-*` | Badges coloridos (success, warning, danger, primary) |
| `.table-container` | Container de tabela com glass |
| `.sidebar-link` | Links da sidebar |
| `.text-link` | Link colorido |
| `.text-link-subtle` | Link sutil com hover |
| `.th-center`, `.td-center` | Célula centralizada |
| `.th-actions`, `.td-actions` | Coluna de ações |

### Padrão de Ícones em Tabelas (Ações)
> **⚠️ IMPORTANTE:** Seguir este padrão para botões de ação (ícones) dentro de células de tabela:

```jsx
// Exemplo de botão de ação (PDF, Editar, Deletar)
<button
    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-primary-400 transition-colors"
>
    <IconClassName className="h-5 w-5" />
</button>
```

- **Tamanho do container:** `w-8 h-8`
- **Tamanho do ícone:** `h-5 w-5`
- **Cor base:** `text-slate-500`
- **Hover:** `bg-slate-100` (light), `bg-slate-800` (dark)
- **Hover Texto:** `text-primary-600` (light), `text-primary-400` (dark) - *Exceto delete (danger)*

### Componentes UI Disponíveis (`components/ui/`)

```jsx
import {
  // Básicos
  Button, Input, Select, DateInput, TimeInput, Checkbox,
  
  // Containers
  Card, CardHeader, CardTitle, CardContent, CardFooter,
  Modal, ModalFooter,
  
  // Tabelas
  Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  
  // Seleção e Busca
  Combobox, MultiCombobox,
  
  // Feedback
  Badge, Loading, PageLoading, Skeleton,
  
  // Interação
  Avatar, ImageCropper, Pagination, PopConfirm,
  DropdownMenu, DropdownItem,
} from '../components/ui'
```

### Regra de Ouro para Novos Componentes

> **Antes de criar qualquer componente ou página:**
> 1. Procure um componente similar existente no projeto
> 2. Use as mesmas classes CSS e padrões visuais
> 3. Use os componentes de `components/ui/` e `components/common/`
> 4. Nunca use cores hardcoded - use a paleta do Tailwind

## 🔗 URLs da API

| Prefixo | App | Principais Endpoints |
|---------|-----|---------------------|
| `/api/v1/users/` | users | `/me/`, `/{id}/` |
| `/api/v1/core/` | core | `/funcionarios/`, `/turmas/`, `/disciplinas/`, `/anos-letivos/` |
| `/api/v1/academic/` | academic | `/estudantes/`, `/matriculas-cemep/`, `/matriculas-turma/` |
| `/api/v1/pedagogical/` | pedagogical | `/aulas/`, `/notas/`, `/faltas/`, `/ocorrencias/` |
| `/api/v1/management/` | management | `/tarefas/`, `/avisos/` |
| `/api/v1/permanent/` | permanent | `/historicos/`, `/prontuarios/` |

---

## 🛡️ Segurança

- **Autenticação:** JWT com access/refresh tokens (Simple JWT)
- **Permissões:** Via Mixins em `apps/users/permissions.py`
- **Rate Limiting:** 100 req/h anônimo, 1000 req/h autenticado
- **Variáveis de Ambiente:** Todas as credenciais em `.env` (backend) - **nunca no código**

---

## 📊 Constraints de Performance

Dado que o servidor tem recursos limitados (1 Core / 4GB RAM):

1. **Backend:**
   - Sempre usar `select_related()` e `prefetch_related()` para evitar N+1
   - Usar `transaction.atomic` para operações múltiplas

2. **Frontend:**
   - Evitar listas completas (`page_size: 1000`) - usar paginação
   - Usar `ReferenceContext` para dados que mudam pouco (cursos, anos letivos)
   - Usar `Promise.all` para requisições paralelas

---

## 🔧 Comandos Úteis

### Backend
```bash
cd backend
..\.venv\Scripts\Activate.ps1     # Ativar ambiente virtual

python manage.py check            # Verificar erros
python manage.py makemigrations   # Criar migrações
python manage.py migrate          # Aplicar migrações
python manage.py createsuperuser  # Criar admin
python manage.py runserver        # Iniciar servidor
```

### Frontend
```bash
cd frontend
npm run dev      # Desenvolvimento
npm run build    # Build produção
```

---

## 📝 Checklist para Novas Funcionalidades

### Backend
- [ ] Definir model em `apps/<app>/models.py`
- [ ] Criar serializer em `apps/<app>/serializers/<entidade>.py`
- [ ] Criar view em `apps/<app>/views/<entidade>.py`
- [ ] Registrar no `apps/<app>/urls.py` (DefaultRouter)
- [ ] Atualizar `__init__.py` dos pacotes views/ e serializers/
- [ ] Usar Mixin de permissão apropriado
- [ ] Criar/aplicar migrações

### Frontend
- [ ] Criar página em `pages/`
- [ ] Extrair lógica para hook se > 300 linhas ou > 2 useEffects
- [ ] Usar componentes de `components/ui/` e `components/common/`
- [ ] Usar constantes de `data/` (nunca duplicar)
- [ ] Usar formatadores de `utils/` (nunca duplicar)
- [ ] Adicionar rota em `App.jsx`
- [ ] Adicionar endpoint em `services/api.js`

---

## 🔄 Notas Importantes

1. **Projeto em Evolução:** Arquivos e pastas mudam constantemente. Sempre verifique a estrutura atual antes de modificar.

2. **Sempre consultar documentação:** Os arquivos `BACKEND_ARCHITECTURE.md` e `FRONTEND_ARCHITECTURE.md` contêm detalhes cruciais sobre padrões, componentes disponíveis e exemplos.

3. **Ambiente Virtual Python:** Localizado em `.venv/` na raiz do projeto.

4. **Variáveis de Ambiente:** O arquivo `.env` do backend é gerado pelo script `setup-env-dev.ps1` a partir de `env.development.json`.

5. **institutional_config.json:** Contém dados institucionais centralizados (nome da escola, endereço, diretor, etc.).

---

> **Para a IA:** Use este documento como ponto de partida. Para tarefas específicas, consulte os documentos de arquitetura detalhados. Sempre verifique a estrutura atual do projeto antes de criar ou modificar arquivos, pois o projeto está em constante evolução.
