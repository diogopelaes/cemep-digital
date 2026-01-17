# Análise de Performance Frontend - CEMEP Digital

**Última Atualização:** 03/01/2026
**Foco:** Compliance com Infraestrutura VPS Single Core (1 vCPU / 4GB RAM)

Este documento mapeia o estado atual do frontend em relação às diretrizes definidas em [FRONTEND_BEST_PRACTICES.md](./FRONTEND_BEST_PRACTICES.md).

---

## 1. Visão Geral (Resumo Executivo)

O frontend evoluiu significativamente com a introdução do `ReferenceContext`, eliminando chamadas redundantes para dados estáticos. No entanto, o sistema ainda apresenta riscos críticos de performance em listas longas ("Professores") e operações de PDF, que podem saturar o servidor Single Core com requisições concorrentes ou payloads grandes não paginados.

**Score Atual:** 🟡 **EM PROGRESSO**

---

## 2. Inventário de Otimizações

### ✅ Implementado (Conforme Padrão)
| Componente/Hook | Otimização Realizada | Impacto |
|----------------|----------------------|---------|
| `ReferenceContext` | Cache Global de Cursos e Anos Letivos | **Crítico:** Redução de ~40% nas requisições de init. |
| `Dashboard.jsx` | `Promise.all` + Remoção de fetch redundante | Carregamento inicial acelerado (Paralelo). |
| `TurmaForm.jsx` | Consumo de `ReferenceContext` | Formulário abre instantaneamente (dados cacheados). |
| `useEstudanteForm.js` | Consumo de `ReferenceContext` | Menos carga ao editar estudantes. |
| `Estudantes.jsx` | Paginação Server-Side correta | Protege o banco de dados de queries "select *". |

### ⚠️ Pontos de Atenção (Anti-Patterns Detectados)
| Local | Problema | Risco (1-Core) | Solução Recomendada |
|-------|----------|----------------|---------------------|
| `useRepresentantesTurma.js` | `page_size: 100` fixo ao buscar professores. | **Alto:** Se houver 150 profs, 50 somem. Se 1000, trava o json parse. | Implementar `AsyncSelect` (Busca sob demanda). |
| `Configuracoes.jsx` | Busca `anosLetivos` direto da API, ignorando cache. | **Médio:** Desperdício de banda e possível desincronia. | Usar `ReferenceContext` e implementar `invalidate`. |
| `Estudantes.jsx` (PDF) | PDF Individual busca `prontuario` (pesado) sob demanda. | **Baixo/Médio:** Se 50 usuários gerarem PDF juntos, CPU do banco sobe. | Aceitável por hora, monitorar. |
| `TurmaDetalhes` | Hooks (`useRepresentantes`, `useEstudantes`) recarregam ao mudar de aba. | **Baixo:** UX levemente lenta. | Implementar Cache (React Query) futuro. |

---

## 3. Análise Detalhada por Categoria

### 3.1. Data Fetching & Caching
O padrão "Waterfall" (requisições em cascata) foi mitigado na `Dashboard`, mas ainda existe risco em componentes menores.
*   **Problema:** O hook `useDisciplinasTurma` e outros ainda injetam `page_size: 100` para "fugir" da paginação padrão. Isso é uma bomba-relógio.
*   **Ação Imediata:** Substituir Selects simples (que precisam carregar tudo) por **AsyncSelects** (que buscam conforme o usuário digita).

### 3.2. Gerenciamento de Estado
*   **Context API:** O uso de `ReferenceContext` está correto para dados estáticos.
*   **Sincronia:** A página `Configuracoes.jsx` cria novos Anos Letivos, mas não avisa o `ReferenceContext` para recarregar. Isso exige um refresh de página F5 do usuário para ver o novo ano no resto do sistema.

### 3.3. UX e Feedback
*   **Feedback Visual:** Excelente uso de `Loading` e Skeleton screens.
*   **Interatividade:** Tabelas e Formulários respondem bem. O uso de `Debounce` (400ms) nas buscas de `Estudantes.jsx` é exemplar.

---

## 4. Plano de Ação (Roadmap de Performance)

Para garantir estabilidade no servidor de 1 Core, os próximos passos são:

### Fase 1: Correção de Riscos (Imediato)
1.  **Refatorar `Configuracoes.jsx`:** Integrar com `ReferenceContext` (usar `reloadReferences` após criar ano).
2.  **Audit de `page_size`:** Localizar todos `page_size: 100` e avaliar risco. Se a tabela tende a crescer (ex: Funcionários/Professores), mudar para Async Search.

### Fase 2: Migração Arquitetural (Médio Prazo)
3.  **Adotar TanStack Query (React Query):** Substituir o cache manual do `ReferenceContext` e os `useEffect` de listagem por `useQuery`. Isso dará cache automático, deduplicação de requests e revalidação em background "de graça".

### Fase 3: Otimização Fina (Longo Prazo)
4.  **Code Splitting:** Verificar se `react-pdf` (usado em `Estudantes.jsx`) está sendo carregado no bundle principal. Mover para carregamento dinâmico (`import()`) para reduzir tamanho do JS inicial.

---

**Conclusão:** O frontend é robusto, mas ainda carrega "vícios" de desenvolvimento local (como pedir listas inteiras de 100 itens). A transição para Async Selects é a chave para escalabilidade no hardware atual.
