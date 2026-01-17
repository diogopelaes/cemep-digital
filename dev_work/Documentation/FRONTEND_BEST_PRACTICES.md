# Guia de Boas Práticas e Padronização do Frontend

Este documento estabelece os padrões de desenvolvimento para o frontend do **CEMEP Digital**. O objetivo é garantir que o sistema permaneça performático, seguro e eficiente, especialmente considerando a infraestrutura de servidor único (1 Core CPU / 4GB RAM).

## 1. Princípios Fundamentais (Infraestrutura)

### O "Mandamento do Servidor Único"
Nosso backend roda em uma VPS com recursos limitados.
*   **Regra de Ouro:** O Backend **NUNCA** deve ser usado para armazenar estado de UI ou servir dados repetidos que não mudaram.
*   **Responsabilidade:** O Frontend deve ser agressivo no Cache e econômico nas requisições.

---

## 2. Padrões de Data Fetching

### 2.1. "Waterfall" é Proibido
Nunca faça requisições independentes em sequência (uma esperando a outra).
**Errado:**
```javascript
await getEstudantes(); // Espera acabar
await getTurmas();     // Só começa agora
```
**Correto (Paralelismo):**
```javascript
await Promise.all([
  getEstudantes(),
  getTurmas()
]);
```

### 2.2. Payloads e Paginação
Nunca solicite listas completas ("Select *") de tabelas que podem crescer (Estudantes, Log de Acesso, etc).
*   **Proibido:** `page_size: 1000` (ou valores > 100).
*   **Obrigatório:** Usar paginação padrão (20 itens) ou busca sob demanda (`search`).

### 2.3. Redundância de Dados Estáticos
Dados que mudam raramente (Tabelas de Referência) devem ser buscados **UMA VEZ** por sessão.
*   **Tabelas:** Cursos, Anos Letivos, Configurações do Sistema.
*   **Padrão:** Usar `ReferenceContext` (ou React Query com staleTime infinito).
*   **Nunca:** Fazer `useEffect` para buscar lista de Cursos dentro de um formulário que é aberto várias vezes.

### 2.4. Organização de Páginas por Perfil
As páginas são organizadas em subdiretórios conforme o perfil de usuário:
*   `pages/gestao-secretaria/` - Dashboards e CRUD administrativo
*   `pages/professor/` - Turmas, plano de aula, registro de aulas
*   `pages/monitor/` - Dashboard do monitor
*   `pages/estudante-responsavel/` - Dashboard do estudante/responsável
*   `pages/` (raiz) - Páginas comuns (Login, Avisos, NotFound)

**Imports devem refletir o caminho correto:**
```javascript
// Correto
import DashboardGestao from './pages/gestao-secretaria/DashboardGestao'
import Turmas from './pages/gestao-secretaria/Turmas'

// Errado
import Turmas from './pages/Turmas' // Arquivo foi movido!
```

## 3. Padrões de UX e Componentes

### 3.1. Selects de Grandes Listas
Para selecionar itens em listas potencialmente grandes (ex: Professores, Estudantes):
*   **Proibido:** `<select>` simples (HTML) renderizando 500+ `<option>`. Isso trava a renderização do navegador e consome muita memória.
*   **Obrigatório:** Usar `AsyncCombobox` ou Componentes de Busca que filtram no servidor enquanto o usuário digita.

### 3.2. Feedback Otimista
Sempre que possível, atualize a UI imediatamente após a ação do usuário, antes mesmo do servidor responder (Optimistic UI).
*   *Exemplo:* Ao marcar uma tarefa como concluída, mude a cor para verde imediatamente. Se a requisição falhar, reverta e mostre erro.

---

## 4. Segurança no Código

### 4.1. Dados no Frontend
Nunca confie que dados sensíveis (ex: senhas, salários de outros usuários) estão seguros só porque não são exibidos na tela.
*   Filtragem de segurança deve ser feita no **Backend (Serializer/QuerySet)**, não no Frontend.

### 4.2. Tratamento de Erros
Use `try/catch` em todas as operações assíncronas e forneça feedback visual (Toast) ao usuário. Não deixe a aplicação "morrer" silenciosamente no console.

---

## checklist para Code Review

Antes de submeter código novo, verifique:
- [ ] Estou fazendo requisições em paralelo (`Promise.all`)?
- [ ] Estou evitando re-buscar dados que o usuário já baixou (Cursos, Anos)?
- [ ] O componente lida bem com internet lenta? (Loading states)
- [ ] Estou solicitando apenas a quantidade necessária de dados (Paginação)?
- [ ] Se estou usando `useEffect`, as dependências estão corretas?

---

**Lembre-se:** Código eficiente é aquele que **não precisou ser executado**. Cache é vida.
