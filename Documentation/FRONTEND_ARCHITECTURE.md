# CEMEP Digital - Documentação do Frontend

**Última atualização:** 05/01/2026  
**Tecnologias:** React 18, Vite, TailwindCSS 3, React Router DOM 6, Axios, jsPDF

---

## 📁 Estrutura de Diretórios

```
frontend/
├── src/
│   ├── App.jsx              # Configuração de rotas principais
│   ├── main.jsx             # Entry point da aplicação
│   ├── index.css            # Estilos globais e design system
│   │
│   ├── components/          # Componentes reutilizáveis
│   │   ├── common/          # Componentes genéricos de UI
│   │   ├── ui/              # Componentes primitivos de interface
│   │   ├── modals/          # Modais reutilizáveis
│   │   ├── turmas/          # Componentes específicos do domínio Turmas
│   │   ├── estudantes/      # Componentes específicos do domínio Estudantes
│   │   └── funcionarios/    # Componentes específicos do domínio Funcionários
│   │
│   ├── pages/               # Páginas/Views da aplicação
│   ├── hooks/               # Custom hooks reutilizáveis
│   ├── contexts/            # Context API (Auth, Theme)
│   ├── data/                # Constantes e dados estáticos
│   ├── services/            # Serviços de API
│   ├── utils/               # Funções utilitárias
│   ├── layouts/             # Layouts de página
│   └── config/              # Configurações
│
├── public/                  # Assets estáticos
├── vite.config.js           # Configuração do Vite
└── package.json             # Dependências
```

---

## 🎯 Princípios Arquiteturais

### 1. Separation of Concerns (SoC)
Cada arquivo tem uma responsabilidade única e bem definida:
- **Pages**: Orquestram hooks e componentes, não contêm lógica de negócio
- **Hooks**: Encapsulam lógica de estado e efeitos
- **Components**: Renderizam UI, recebem props, não fazem chamadas de API

### 2. Single Responsibility Principle (SRP)
- Componentes com mais de 300 linhas devem ser divididos
- Mais de 2 `useEffect` indica necessidade de hook customizado
- Ternários aninhados devem virar componentes

### 3. DRY (Don't Repeat Yourself)
- Constantes centralizadas em `data/`
- Formatadores centralizados em `utils/formatters.js`
- Componentes comuns em `components/common/`

---

## 📦 Diretórios Detalhados

### `/src/components/ui/` - Componentes Primitivos

Componentes de interface básicos, sem lógica de negócio.

| Componente | Descrição |
|------------|-----------|
| `Button.jsx` | Botão com variantes (primary, secondary, danger, ghost, outline) |
| `Input.jsx` | Campo de entrada com label e ícone opcional |
| `Select.jsx` | Campo de seleção dropdown |
| `DateInput.jsx` | Campo de data formatado |
| `Card.jsx` | Container com estilo de cartão |
| `Badge.jsx` | Marcador colorido para status |
| `Loading.jsx` | Spinner de carregamento |
| `Modal.jsx` / `ModalFooter.jsx` | Sistema de modais |
| `Table.jsx` | Componentes de tabela (TableHead, TableBody, TableRow, TableCell, TableEmpty) |
| `Pagination.jsx` | Navegação de páginas |
| `MultiCombobox.jsx` | Select múltiplo com pesquisa |
| `Combobox.jsx` | Select simples com pesquisa |

**Uso:**
```jsx
import { Button, Input, Card, Modal } from '../components/ui'
```

---

### `/src/components/common/` - Componentes Reutilizáveis

Componentes que são usados em múltiplos domínios.

| Componente | Descrição | Props Principais |
|------------|-----------|------------------|
| `PageHeader.jsx` | Header padrão de páginas | `title`, `subtitle`, `backUrl`, `actions` |
| `InfoItem.jsx` | Exibição de campo label/valor com ícone | `icon`, `label`, `value` |
| `BooleanItem.jsx` | Exibição de campo booleano (Sim/Não) | `icon`, `label`, `value` |
| `ToggleSwitch.jsx` | Switch on/off com label e descrição | `label`, `description`, `checked`, `onChange` |
| `SectionTitle.jsx` | Título de seção em formulários | `title`, `icon` |

**Uso:**
```jsx
import { InfoItem, ToggleSwitch, PageHeader } from '../components/common'
```

---

### `/src/components/turmas/` - Domínio Turmas

Componentes específicos para gerenciamento de turmas.

| Componente | Descrição |
|------------|-----------|
| `TurmaHeader.jsx` | Header da página de detalhes da turma |
| `TurmaTabs.jsx` | Navegação por abas (Disciplinas, Estudantes, Representantes) |
| `TurmaDisciplinas.jsx` | Lista de disciplinas com atribuição de professores |
| `TurmaEstudantes.jsx` | Lista de estudantes da turma |
| `TurmaRepresentantes.jsx` | Lista e gestão de professores representantes |

**Uso:**
```jsx
import { TurmaHeader, TurmaDisciplinas } from '../components/turmas'
```

---

### `/src/components/estudantes/` - Domínio Estudantes

Componentes de seção para formulário de estudante.

| Componente | Descrição |
|------------|-----------|
| `FotoSection.jsx` | Upload e crop de foto 3x4 |
| `MatriculasSection.jsx` | Gestão dinâmica de matrículas (adicionar/remover) |
| `ResponsaveisSection.jsx` | Gestão dinâmica de responsáveis |
| `EnderecoSection.jsx` | Campos de endereço com busca CEP |
| `BeneficiosSection.jsx` | Checkboxes de benefícios (Bolsa Família, transporte) |
| `CredenciaisSection.jsx` | Login e senha do estudante |

**Uso:**
```jsx
import { MatriculasSection, ResponsaveisSection } from '../components/estudantes'
```

---

### `/src/components/funcionarios/` - Domínio Funcionários

Componentes de seção para formulário de funcionário.

| Componente | Descrição |
|------------|-----------|
| `DadosPessoaisSection.jsx` | Nome, CPF, CIN, nascimento, contato |
| `EnderecoSectionFunc.jsx` | Endereço com campos editáveis |
| `DadosProfissionaisSection.jsx` | Matrícula, tipo, área de atuação |
| `CredenciaisFuncSection.jsx` | Login e senha do funcionário |

**Uso:**
```jsx
import { DadosPessoaisSection, DadosProfissionaisSection } from '../components/funcionarios'
```

---

### `/src/hooks/` - Custom Hooks

Hooks que encapsulam lógica reutilizável.

| Hook | Responsabilidade |
|------|------------------|
| `useCepLookup.js` | Busca de CEP via ViaCEP API |
| `useTurma.js` | Carregamento e estado de uma turma |
| `useDisciplinasTurma.js` | Disciplinas, aulas semanais e professores de uma turma |
| `useRepresentantesTurma.js` | Professores representantes de uma turma |
| `useEstudanteForm.js` | Lógica completa do formulário de estudante |
| `useFuncionarioForm.js` | Lógica completa do formulário de funcionário |

**Padrão de retorno:**
```javascript
// Exemplo: useFuncionarioForm
return {
    // Estado
    loading,          // boolean - carregando dados
    saving,           // boolean - salvando dados
    isEditing,        // boolean - modo edição vs criação
    formData,         // object - dados do formulário
    
    // Handlers
    updateField,      // function(field, value) - atualiza campo
    handleSubmit,     // function(event) - submete formulário
    fetchCep,         // function(cep) - busca CEP
}
```

**Uso:**
```jsx
import { useFuncionarioForm, useEstudanteForm } from '../hooks'

function FuncionarioForm() {
    const form = useFuncionarioForm(id, navigate)
    // form.formData, form.handleSubmit, etc.
}
```

---

### `/src/data/` - Constantes Centralizadas

Dados estáticos e constantes usados em toda aplicação.

| Arquivo | Exportações |
|---------|-------------|
| `estados.js` | `ESTADOS`, `ESTADOS_COMUNS` |
| `statusMatricula.js` | `STATUS_MATRICULA`, `STATUS_MATRICULA_COLORS` |
| `tiposUsuario.js` | `TIPOS_USUARIO`, `TIPOS_USUARIO_COLORS` |
| `parentescos.js` | `PARENTESCOS` |
| `nomenclaturas.js` | `NOMENCLATURAS`, `getNomenclaturaLabel()` |
| `areasConhecimento.js` | `AREAS_CONHECIMENTO`, `AREAS_CONHECIMENTO_COLORS` |

**Uso:**
```jsx
import { TIPOS_USUARIO, TIPOS_USUARIO_COLORS, ESTADOS_COMUNS } from '../data'
```

---

### `/src/utils/` - Funções Utilitárias

| Arquivo | Funções Principais |
|---------|-------------------|
| `formatters.js` | `formatCPF()`, `formatTelefone()`, `formatCEP()`, `formatMatricula()`, `displayCPF()`, `displayTelefone()`, `displayCEP()`, `onlyNumbers()` |
| `date.js` | `formatDateBR()`, `calcularIdade()`, `formatDateTime()` |
| `validators.js` | `validateCPF()` |
| `password.js` | `generatePassword()` |
| `pdf.js` | `createPDF()`, `addHeader()`, `addFooter()`, `addField()`, `addTable()`, `addPhoto()`, `downloadPDF()`, `openPDF()` |

**Diferença entre formatters de input e display:**
```javascript
// Para INPUT (digitação incremental)
formatCPF("12345678900")  // "123.456.789-00" (aplica máscara enquanto digita)

// Para DISPLAY (exibição estática)
displayCPF("12345678900") // "123.456.789-00" (para exibir dados do banco)
```

---

### `/src/services/api.js` - Camada de API

Configuração centralizada do Axios com interceptors para autenticação.

**Estrutura:**
```javascript
// APIs por domínio
export const authAPI = { login, refresh, me, changePassword, resetPassword }
export const usersAPI = { list, get, create, update, delete, sendCredentials }
export const coreAPI = {
    funcionarios: { list, get, criarCompleto, atualizarCompleto, resetarSenha, toggleAtivo, uploadFile, downloadModel },
    disciplinas: { list, get, create, update, toggleAtivo, uploadFile, downloadModel },
    cursos: { list, get, create, update, toggleAtivo, importarArquivo, downloadModelo },
    turmas: { list, get, create, update, toggleAtivo, anosDisponiveis, importarArquivo, downloadModelo },
    disciplinasTurma: { list, get, create, update, delete, importarArquivo, downloadModelo },
    atribuicoes: { list, get, create, update, delete },
    periodosTrabalho: { list, create, delete },
    habilidades: { list, create, delete },
    anosLetivos: { list, get, create, update, getCalendario, addDiaNaoLetivo, addDiaLetivoExtra, removeDia },
}
export const academicAPI = {
    estudantes: { list, get, create, atualizarCompleto, prontuario, uploadFoto, removerFoto, uploadFile, downloadModel },
    matriculasCEMEP: { list, create, update },
    matriculasTurma: { list, create, update },
}
```

**Uso:**
```jsx
import { coreAPI, academicAPI } from '../services/api'

// Buscar funcionário
const response = await coreAPI.funcionarios.get(id)

// Buscar estudante com prontuário
const [estudante, prontuario] = await Promise.all([
    academicAPI.estudantes.get(cpf),
    academicAPI.estudantes.prontuario(cpf)
])
```

---

### `/src/pages/` - Páginas da Aplicação

| Página                       | Descrição                                         |
|------------------------------|---------------------------------------------------|
| `Dashboard.jsx`              | Dashboard principal com estatísticas              |
| `Login.jsx`                  | Tela de login                                     |
| `RecuperarSenha.jsx`         | Recuperação de senha                              |
| `NotFound.jsx`               | Página 404                                        |
| **Estudantes**               |                                                   |
| `Estudantes.jsx`             | Listagem de estudantes                            |
| `EstudanteForm.jsx`          | Formulário criar/editar (usa `useEstudanteForm`)  |
| `EstudanteDetalhes.jsx`      | Detalhes + PDF do estudante                       |
| **Funcionários**             |                                                   |
| `Funcionarios.jsx`           | Listagem com cadastro em massa                    |
| `FuncionarioForm.jsx`        | Formulário criar/editar (usa `useFuncionarioForm`)|
| `FuncionarioDetalhes.jsx`    | Detalhes do funcionário                           |
| `FuncionarioCredenciais.jsx` | Exibição de credenciais após criação              |
| **Turmas**                   |                                                   |
| `Turmas.jsx`                 | Listagem de turmas                                |
| `TurmaForm.jsx`              | Formulário criar/editar turma                     |
| `TurmaDetalhes.jsx`          | Detalhes da turma com importação de disciplinas   |
| **Disciplinas**              |                                                   |
| `Disciplinas.jsx`            | Listagem de disciplinas                           |
| `DisciplinaForm.jsx`         | Formulário criar/editar com habilidades           |
| **Cursos**                   |                                                   |
| `Cursos.jsx`                 | Listagem de cursos                                |
| `CursoForm.jsx`              | Formulário criar/editar curso                     |
| **Configurações/Calendário** |                                                   |
| `Configuracoes.jsx`          | Configurações gerais e calendário                 |
| `CalendarioDetalhes.jsx`     | Detalhes do ano letivo com bimestres              |
| `CalendarioForm.jsx`         | Formulário de ano letivo                          |
| **Outros**                   |                                                   |
| `Avisos.jsx`                 | Página de avisos                                  |

---

### `/src/contexts/` - Context API

| Context | Responsabilidade |
|---------|------------------|
| `AuthContext.jsx` | Autenticação, login/logout, dados do usuário logado |
| `ThemeContext.jsx` | Tema claro/escuro |
| `ReferenceContext.jsx` | Cache global de dados estáticos (Cursos, Anos Letivos) |

**Uso:**
```jsx
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useReferences } from '../contexts/ReferenceContext'

function Component() {
    const { user } = useAuth()
    const { cursos, anosLetivos } = useReferences() // Dados cacheados
}
```

---

## ⚡ Performance e Cache

Devido à infraestrutura de servidor único (1 Core/4GB), o frontend deve minimizar requisições.

### Diretrizes de Cache
1. **Dados de Referência (Static Data):**
   - Tabelas que mudam pouco (Cursos, Anos, Configurações) devem ser cacheadas.
   - Use `ReferenceContext` para acessá-las globalmente.
   - **Nunca** faça fetch desses dados dentro de um componente de formulário repetidamente.

2. **Paginação e Payloads:**
   - Evite solicitar listas completas (`page_size: 1000`).
   - Use paginação padrão (20 itens) ou Selects Assíncronos (`AsyncCombobox`).

3. **Data Fetching:**
   - Evite "Waterfalls" (requisições sequenciais).
   - Use `Promise.all` para buscar dados independentes em paralelo.

> Para detalhes completos de implementação, consulte [`Documentation/FRONTEND_BEST_PRACTICES.md`](./FRONTEND_BEST_PRACTICES.md).

---

### `/src/layouts/` - Layouts

| Layout | Descrição |
|--------|-----------|
| `MainLayout.jsx` | Layout principal com sidebar e header |
| `Sidebar.jsx` | Navegação lateral |

---

## 🔄 Fluxo de Dados

### Padrão Page → Hook → Components

```
┌─────────────────┐
│     Page        │  ← Orquestra, não contém lógica
│  (Container)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Custom Hook   │  ← Estado + Lógica de negócio + API
│  (useXxxForm)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Components    │  ← UI pura, recebe props
│   (Sections)    │
└─────────────────┘
```

### Exemplo Prático: FuncionarioForm

```jsx
// FuncionarioForm.jsx (Page - ~110 linhas)
export default function FuncionarioForm() {
    const { id } = useParams()
    const navigate = useNavigate()
    
    // Hook gerencia TODO o estado e lógica
    const form = useFuncionarioForm(id, navigate)
    
    return (
        <form onSubmit={form.handleSubmit}>
            {/* Componentes de seção recebem apenas props */}
            <DadosPessoaisSection
                formData={form.formData}
                cpfError={form.cpfError}
                onFieldChange={form.updateField}
            />
            <EnderecoSectionFunc
                formData={form.formData}
                onFetchCep={form.fetchCep}
                cepLoading={form.cepLoading}
             />
            <DadosProfissionaisSection ... />
            {!form.isEditing && <CredenciaisFuncSection ... />}
        </form>
    )
}
```

---

## 🎨 Design System

### Cores (TailwindCSS)

```css
/* Cores principais */
--primary-500: #3B82F6    /* Azul principal */
--accent-500: #8B5CF6     /* Roxo accent */
--success-500: #22C55E    /* Verde sucesso */
--danger-500: #EF4444     /* Vermelho erro */

/* Suporte dark mode */
dark:bg-slate-900
dark:text-white
```

### Classes Utilitárias Customizadas

```css
.btn-primary       /* Botão primário */
.btn-secondary     /* Botão secundário */
.input             /* Estilo de input padrão */
.label             /* Label de campo */
.text-link-subtle  /* Link sutil com hover */
.animate-fade-in   /* Animação de entrada */
```

---

## 📋 Boas Práticas ao Desenvolver

### ✅ FAZER

1. **Usar constantes centralizadas:**
   ```jsx
   import { TIPOS_USUARIO, ESTADOS_COMUNS } from '../data'
   ```

2. **Usar formatadores centralizados:**
   ```jsx
   import { displayCPF, displayTelefone } from '../utils/formatters'
   ```

3. **Extrair lógica para hooks quando:**
   - Arquivo ultrapassar 300 linhas
   - Existirem mais de 2 `useEffect`
   - Lógica for reutilizável

4. **Usar componentes de seção para formulários grandes:**
   ```jsx
   <DadosPessoaisSection formData={...} onFieldChange={...} />
   ```

5. **Usar componentes comuns para exibição:**
   ```jsx
   <InfoItem icon={HiUser} label="Nome" value={nome} />
   ```

### ❌ EVITAR

1. **Duplicar constantes localmente:**
   ```jsx
   // ❌ NÃO FAZER
   const TIPOS_USUARIO = [...]
   
   // ✅ FAZER
   import { TIPOS_USUARIO } from '../data'
   ```

2. **Lógica de API em componentes de UI:**
   ```jsx
   // ❌ NÃO FAZER em componente de seção
   const response = await api.get(...)
   
   // ✅ FAZER no hook ou página
   ```

3. **Ternários aninhados:**
   ```jsx
   // ❌ NÃO FAZER
   {a ? (b ? <X/> : <Y/>) : <Z/>}
   
   // ✅ FAZER - componentizar
   <ConditionalComponent a={a} b={b} />
   ```

---

## 🔧 Comandos Úteis

```bash
# Desenvolvimento
npm run dev          # Inicia servidor de desenvolvimento

# Build
npm run build        # Gera build de produção

# Lint
npm run lint         # Verifica erros de lint
```

---

## 📊 Métricas de Qualidade

| Métrica | Meta |
|---------|------|
| Linhas por página | < 300 |
| useEffects por componente | ≤ 2 |
| Duplicação de constantes | 0 |
| Componentes com lógica de API | Apenas pages e hooks |

---

## 🗂️ Índice de Importações Rápidas

```jsx
// Componentes UI
import { Button, Input, Select, Card, Modal, Loading, Badge, Pagination } from '../components/ui'

// Componentes Comuns
import { InfoItem, BooleanItem, ToggleSwitch, PageHeader } from '../components/common'

// Hooks
import { useFuncionarioForm, useEstudanteForm, useCepLookup } from '../hooks'

// Constantes
import { TIPOS_USUARIO, ESTADOS_COMUNS, NOMENCLATURAS, AREAS_CONHECIMENTO } from '../data'

// Utilitários
import { formatCPF, displayCPF, formatTelefone } from '../utils/formatters'
import { formatDateBR, calcularIdade } from '../utils/date'
import { validateCPF } from '../utils/validators'
import { generatePassword } from '../utils/password'

// API
import { coreAPI, academicAPI, authAPI } from '../services/api'

// Contextos
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
```

---

> **Nota para LLMs:** Este documento descreve a arquitetura completa do frontend CEMEP Digital. Ao desenvolver novas funcionalidades, siga os padrões estabelecidos: use constantes do diretório `data/`, formatadores de `utils/`, componentes comuns de `components/common/`, e extraia lógica complexa para hooks customizados. Páginas devem orquestrar componentes e hooks, não conter lógica de negócio diretamente.
