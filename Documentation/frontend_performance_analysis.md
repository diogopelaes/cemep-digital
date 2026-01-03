# Relatório de Análise de Performance: Alinhamento com Infraestrutura

**Data:** 03/01/2026
**Responsável:** Antigravity Agent
**Contexto Infraestrutura:** VPS (1 Core CPU, 4GB RAM) @ Hostinger

Este relatório propõe otimizações de **UX e Performance** estritamente necessárias para garantir a estabilidade e fluidez do sistema, considerando as limitações severas de hardware do servidor (Single Core).

---

## 1. O Gargalo da Infraestrutura
O servidor possui **apenas 1 Núcleo de CPU**.
*   **Risco Crítico:** Qualquer requisição pesada (ex: serializar 1000 estudantes) pode bloquear o processo Python/Django, fazendo com que **todas as outras requisições de outros usuários aguardem na fila**.
*   **Consequência UX:** O sistema pode parecer "travado" para todos se um único usuário abrir uma tela mal otimizada.

**Diretriz:** O Frontend deve ser um "Guarditão", evitando ao máximo incomodar o Backend. O cache no cliente é obrigatório, não opcional.

---

## 2. Ações de Melhoria (Mapeamento Infra vs UX)

### A. Eliminação de Payloads Gigantes (Prioridade Máxima)
**Problema:** O hook `useDisciplinasTurma.js` solicita `page_size: 1000` para listar professores.
**Impacto Infra:** O processo Django gasta ~100% da CPU (Single Core) para converter 1000 objetos em JSON. O servidor "engasga".
**Ação:**
1.  **Backend:** Garantir que todos os ViewSets tenham paginação padrão forçada (ex: 20 itens).
2.  **Frontend:** Substituir selects simples por componentes `AsyncSelect` (Combo Box) que buscam no servidor apenas quando o usuário digita.
    *   *Ganho UX:* Abertura instantânea de modais.
    *   *Ganho Infra:* Redução drástica de uso de CPU e Memória RAM.

### B. Paralelismo de Requisições (Dashboard)
**Problema:** Requisições em "Cascata" (Waterfall) no Dashboard.
**Impacto Infra:** Mantém conexões abertas por mais tempo do que o necessário, consumindo "workers" do servidor web (Uvicorn).
**Ação:** Agrupar chamadas em `Promise.all`.
*   *Ganho UX:* Carregamento da página inicial até 50% mais rápido.
*   *Ganho Infra:* Liberação mais rápida dos workers do servidor para atender outros usuários.

### C. Estratégia de Cache Agressivo (Reference Data)
**Problema:** Formulários baixam listas de "Cursos" e "Anos Letivos" repetidamente.
**Impacto Infra:** Desperdício de ciclos de CPU para buscar dados que nunca mudam (Static Data). Em um servidor de 1 Core, cada ciclo conta.
**Ação:** Implementar `ReferenceDataContext` ou `React Query` com `staleTime: Infinity` para tabelas auxiliares.
*   *Ganho UX:* Formulários abrem instantaneamente (Zero Loading).
*   *Ganho Infra:* Redução de ~30% no número total de hits ao banco de dados.

### D. Redução de Redundância (Dados do Usuário)
**Problema:** Busca duplicada de "Ano Letivo Selecionado" no Dashboard.
**Ação:** Usar dados já carregados no Login (`AuthContext`).
*   *Ganho:* Economia direta de I/O.

---

## 3. Inventário de Otimizações por Componente

| Componente | Ação | Justificativa (Infra 1 Core/4GB) |
| :--- | :--- | :--- |
| **`Dashboard.jsx`** | Implementar `Promise.all` e remover fetch redundante. | Liberar workers do servidor mais rápido; Poupar CPU de queries duplicadas. |
| **`useDisciplinasTurma.js`** | Implementar busca paginada (Combo Box) para Professores. | **Crítico:** Evitar pico de CPU que trava o servidor para outros usuários. |
| **`TurmaForm.jsx`** | Cachear Cursos/Configurações no cliente. | Evitar hits repetitivos ao banco de dados para dados estáticos. |
| **`MainLayout.jsx`** | (Já realizado) Exibir ano do Contexto. | Zero requests = Zero carga no servidor. |
| **Geral (Api Service)** | Implementar interceptor de repetição (Retry com Backoff). | Em caso de sobrecarga momentânea da CPU (100%), o front aguarda e tenta de novo sem erro para o usuário. |

---

## 4. Conclusão e Próximos Passos
Dada a restrição de **1 Core**, o sistema não pode se dar ao luxo de ser ineficiente. O Frontend deve assumir a responsabilidade de "blindar" o Backend.

**Recomendação de Execução:**
1.  **Hoje:** Corrigir `Dashboard` e remover `page_size: 1000` (risco de travamento).
2.  **Semana 1:** Implementar Contexto de Cache para dados estáticos (Cursos, etc).
3.  **Semana 2:** Adotar React Query para gestão automática de cache e background refetching.
