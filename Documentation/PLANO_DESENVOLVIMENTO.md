# 🏗️ Plano de Desenvolvimento Rigoroso - CEMEP Digital

Este documento estabelece a ordem lógica de desenvolvimento baseada em **dependências técnicas**, garantindo que cada módulo seja construído sobre uma base sólida.

---

## 📐 Princípios de Desenvolvimento

### 1. Regras de Ouro
- ✅ **Nunca avance sem testar** a etapa anterior
- ✅ **Backend primeiro**, depois Frontend
- ✅ **CRUD completo** antes de funcionalidades avançadas
- ✅ **Validações** no backend E no frontend
- ✅ **Commit** após cada etapa concluída

### 2. Definição de "Concluído"
Uma funcionalidade só está concluída quando:
- [ ] Backend: Model, Serializer, View, URL funcionando
- [ ] Backend: Testado via API (Postman/Insomnia)
- [ ] Frontend: Página com listagem funcional
- [ ] Frontend: Formulário de criação/edição funcional
- [ ] Frontend: Exclusão com confirmação
- [ ] Frontend: Mensagens de sucesso/erro
- [ ] Testado com dados reais

---

## 🔄 Ordem de Desenvolvimento por Dependências

```
┌─────────────────────────────────────────────────────────────────┐
│                        CAMADA 0 - BASE                          │
│  (Já implementado: Users, Estrutura, Autenticação)              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CAMADA 1 - CADASTROS BASE                     │
│  Cursos → Disciplinas → Funcionários → Habilidades             │
│  (Não dependem de nada além de Users)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CAMADA 2 - ESTRUTURA ESCOLAR                  │
│  Turmas → Disciplinas da Turma → Atribuição de Aulas           │
│  (Dependem da Camada 1)                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CAMADA 3 - VIDA ESCOLAR                       │
│  Estudantes → Responsáveis → Matrículas → Enturmação           │
│  (Dependem das Camadas 1 e 2)                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CAMADA 4 - PEDAGÓGICO                         │
│  Calendário → Diário → Faltas → Notas → Recuperação            │
│  (Dependem das Camadas 1, 2 e 3)                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CAMADA 5 - COMUNICAÇÃO                        │
│  Tipos Ocorrência → Ocorrências → Tarefas → Avisos → HTPC      │
│  (Dependem das camadas anteriores)                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CAMADA 6 - VISUALIZAÇÃO                       │
│  Boletim → Prontuário → Conselho → Relatórios → Histórico      │
│  (Apenas leitura, dependem de tudo)                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 FASE 1: Cadastros Base (Fundação)

> **Objetivo:** Criar toda a base de dados que será usada pelo sistema.
> **Tempo estimado:** 3-4 dias

### 1.1 Cursos
**Dependências:** Nenhuma

| Etapa | Descrição | Arquivo | Checklist |
|-------|-----------|---------|-----------|
| 1.1.1 | Testar API existente | - | [ ] GET /api/v1/core/cursos/ funciona |
| 1.1.2 | Criar página Cursos.jsx | `frontend/src/pages/Cursos.jsx` | [ ] Listagem |
| 1.1.3 | Modal de criação | Cursos.jsx | [ ] Formulário nome + sigla |
| 1.1.4 | Edição inline ou modal | Cursos.jsx | [ ] Botão editar funciona |
| 1.1.5 | Exclusão com confirmação | Cursos.jsx | [ ] Botão excluir funciona |
| 1.1.6 | Adicionar rota | `App.jsx` | [ ] /cursos acessível |

**Critérios de Aceite:**
- [ ] Posso criar um curso "Técnico em Informática (TI)"
- [ ] Posso editar o nome/sigla
- [ ] Posso excluir (se não tiver turmas vinculadas)
- [ ] Lista atualiza após cada ação

---

### 1.2 Disciplinas
**Dependências:** Nenhuma

| Etapa | Descrição | Checklist |
|-------|-----------|-----------|
| 1.2.1 | Criar página Disciplinas.jsx | [ ] |
| 1.2.2 | CRUD completo (nome + sigla) | [ ] |
| 1.2.3 | Adicionar à rota | [ ] |

**Critérios de Aceite:**
- [ ] Posso criar "Matemática (MAT)"
- [ ] Lista ordenada alfabeticamente

---

### 1.3 Funcionários
**Dependências:** Users (já existe)

| Etapa | Descrição | Checklist |
|-------|-----------|-----------|
| 1.3.1 | Criar página Funcionarios.jsx | [ ] |
| 1.3.2 | Listagem com filtro por tipo | [ ] |
| 1.3.3 | Modal criar (cria User + Funcionário) | [ ] |
| 1.3.4 | Submodal: Períodos de Trabalho | [ ] |
| 1.3.5 | Ativar/Desativar funcionário | [ ] |

**Critérios de Aceite:**
- [ ] Criar funcionário cria usuário automaticamente
- [ ] Posso adicionar múltiplos períodos de trabalho
- [ ] Validação: períodos não se sobrepõem
- [ ] Funcionário inativo não aparece em seletores

---

### 1.4 Habilidades (BNCC)
**Dependências:** Disciplinas

| Etapa | Descrição | Checklist |
|-------|-----------|-----------|
| 1.4.1 | Criar página ou seção em Disciplinas | [ ] |
| 1.4.2 | CRUD (código + descrição + disciplina) | [ ] |

**Critérios de Aceite:**
- [ ] Posso vincular habilidade a uma disciplina
- [ ] Código é único

---

## 📋 FASE 2: Estrutura Escolar

> **Objetivo:** Montar a estrutura de turmas e atribuições.
> **Tempo estimado:** 3-4 dias
> **Pré-requisito:** FASE 1 completa

### 2.1 Turmas (Completar)
**Dependências:** Cursos

| Etapa | Descrição | Checklist |
|-------|-----------|-----------|
| 2.1.1 | Formulário de criação funcional | [ ] |
| 2.1.2 | Seletor de curso | [ ] |
| 2.1.3 | Edição de turma | [ ] |
| 2.1.4 | Exclusão (se não tiver alunos) | [ ] |
| 2.1.5 | Filtro por ano letivo | [ ] |

**Critérios de Aceite:**
- [ ] Criar "1º Ano A - TI (2025)"
- [ ] Validação: não duplicar número+letra+ano+curso

---

### 2.2 Disciplinas da Turma
**Dependências:** Turmas, Disciplinas

| Etapa | Descrição | Checklist |
|-------|-----------|-----------|
| 2.2.1 | Na página Turmas, aba "Disciplinas" | [ ] |
| 2.2.2 | Adicionar disciplina + carga horária | [ ] |
| 2.2.3 | Remover disciplina da turma | [ ] |

**Critérios de Aceite:**
- [ ] Posso vincular "Matemática" à turma com 80h
- [ ] Total de carga horária é exibido

---

### 2.3 Atribuição de Aulas
**Dependências:** Funcionários (tipo Professor), Disciplinas da Turma

| Etapa | Descrição | Checklist |
|-------|-----------|-----------|
| 2.3.1 | Na página Turmas, aba "Professores" | [ ] |
| 2.3.2 | Para cada disciplina, selecionar professor | [ ] |
| 2.3.3 | Validar que professor é do tipo PROFESSOR | [ ] |

**Critérios de Aceite:**
- [ ] Posso atribuir "Prof. João" para "Matemática" na turma
- [ ] Professor vê apenas suas turmas em "Minhas Turmas"

---

## 📋 FASE 3: Vida Escolar

> **Objetivo:** Cadastrar alunos e matrículas.
> **Tempo estimado:** 4-5 dias
> **Pré-requisito:** FASE 2 completa

### 3.1 Estudantes (Completar)
**Dependências:** Users

| Etapa | Descrição | Checklist |
|-------|-----------|-----------|
| 3.1.1 | Formulário completo de cadastro | [ ] |
| 3.1.2 | Campos: CPF, CIN, Data Nasc., Endereço | [ ] |
| 3.1.3 | Checkboxes: Bolsa Família, Pé de Meia, Ônibus | [ ] |
| 3.1.4 | Validação de CPF único | [ ] |
| 3.1.5 | Edição de estudante | [ ] |

**Critérios de Aceite:**
- [ ] Cadastro cria User tipo ESTUDANTE automaticamente
- [ ] CPF é validado (formato e unicidade)
- [ ] Endereço completo salvo

---

### 3.2 Responsáveis
**Dependências:** Estudantes

| Etapa | Descrição | Checklist |
|-------|-----------|-----------|
| 3.2.1 | Na página Estudantes, seção "Responsáveis" | [ ] |
| 3.2.2 | Adicionar responsável (cria User) | [ ] |
| 3.2.3 | Definir parentesco | [ ] |
| 3.2.4 | Um responsável pode ter múltiplos filhos | [ ] |

**Critérios de Aceite:**
- [ ] Responsável recebe login
- [ ] Vínculo com parentesco salvo

---

### 3.3 Matrícula CEMEP
**Dependências:** Estudantes, Cursos

| Etapa | Descrição | Checklist |
|-------|-----------|-----------|
| 3.3.1 | Na página Estudantes, seção "Matrículas" | [ ] |
| 3.3.2 | Criar matrícula (número manual) | [ ] |
| 3.3.3 | Selecionar curso | [ ] |
| 3.3.4 | Gerenciar status | [ ] |

**Critérios de Aceite:**
- [ ] Número da matrícula é PK manual
- [ ] Status: Matriculado, Concluído, Abandono, Transferido

---

### 3.4 Enturmação
**Dependências:** Estudantes, Turmas, Matrícula CEMEP

| Etapa | Descrição | Checklist |
|-------|-----------|-----------|
| 3.4.1 | Na página Estudantes ou Turmas | [ ] |
| 3.4.2 | Vincular estudante à turma | [ ] |
| 3.4.3 | Status automático "Cursando" | [ ] |
| 3.4.4 | Transferir de turma | [ ] |

**Critérios de Aceite:**
- [ ] Aluno aparece na lista da turma
- [ ] Aluno só pode estar em 1 turma por ano

---

## 📋 FASE 4: Pedagógico

> **Objetivo:** Registro de aulas, faltas e notas.
> **Tempo estimado:** 5-7 dias
> **Pré-requisito:** FASE 3 completa

### 4.1 Calendário Escolar
**Dependências:** Nenhuma (pode ser paralelo)

| Etapa | Descrição | Checklist |
|-------|-----------|-----------|
| 4.1.1 | Criar página Calendario.jsx | [ ] |
| 4.1.2 | Visualização mensal | [ ] |
| 4.1.3 | Marcar dia como não letivo | [ ] |
| 4.1.4 | Tipos: Feriado, Recesso, Férias | [ ] |

**Critérios de Aceite:**
- [ ] Dias não letivos destacados visualmente
- [ ] Total de dias letivos calculado

---

### 4.2 Minhas Turmas (Professor)
**Dependências:** Atribuição de Aulas

| Etapa | Descrição | Checklist |
|-------|-----------|-----------|
| 4.2.1 | Criar página MinhasTurmas.jsx | [ ] |
| 4.2.2 | Listar apenas turmas do professor logado | [ ] |
| 4.2.3 | Card por disciplina/turma | [ ] |
| 4.2.4 | Link para Diário de Classe | [ ] |

**Critérios de Aceite:**
- [ ] Professor só vê suas próprias turmas
- [ ] Acesso rápido ao diário

---

### 4.3 Diário de Classe
**Dependências:** Minhas Turmas, Calendário

| Etapa | Descrição | Checklist |
|-------|-----------|-----------|
| 4.3.1 | Criar página Diario.jsx | [ ] |
| 4.3.2 | Selecionar turma/disciplina | [ ] |
| 4.3.3 | Calendário com dias de aula | [ ] |
| 4.3.4 | Registrar conteúdo + nº aulas | [ ] |
| 4.3.5 | Indicador de aulas registradas | [ ] |

**Critérios de Aceite:**
- [ ] Só posso registrar em dias letivos
- [ ] Conteúdo salvo corretamente
- [ ] Dias com registro marcados

---

### 4.4 Registro de Faltas
**Dependências:** Diário de Classe, Enturmação

| Etapa | Descrição | Checklist |
|-------|-----------|-----------|
| 4.4.1 | No Diário, botão "Chamada" | [ ] |
| 4.4.2 | Lista de alunos da turma | [ ] |
| 4.4.3 | Checkbox por aula (1, 2) | [ ] |
| 4.4.4 | Salvar faltas em lote | [ ] |

**Critérios de Aceite:**
- [ ] Alunos ordenados por nome
- [ ] Posso marcar falta na aula 1 e presente na 2
- [ ] Faltas salvas e recuperadas corretamente

---

### 4.5 Notas Bimestrais
**Dependências:** Enturmação, Disciplinas da Turma

| Etapa | Descrição | Checklist |
|-------|-----------|-----------|
| 4.5.1 | Criar página Notas.jsx | [ ] |
| 4.5.2 | Selecionar turma/disciplina/bimestre | [ ] |
| 4.5.3 | Planilha de notas | [ ] |
| 4.5.4 | Input para cada aluno | [ ] |
| 4.5.5 | Salvar em lote | [ ] |
| 4.5.6 | Suporte a nota de recuperação | [ ] |

**Critérios de Aceite:**
- [ ] Nota máxima 10.00
- [ ] Nota recuperação substitui se maior
- [ ] 5º Conceito (Conselho) editável

---

### 4.6 Recuperação
**Dependências:** Notas Bimestrais

| Etapa | Descrição | Checklist |
|-------|-----------|-----------|
| 4.6.1 | Identificar alunos com nota < 5 | [ ] |
| 4.6.2 | Criar registro de recuperação | [ ] |
| 4.6.3 | Notificar estudantes | [ ] |

**Critérios de Aceite:**
- [ ] Lista automática de alunos em recuperação
- [ ] Notificação visível no dashboard do aluno

---

## 📋 FASE 5: Comunicação

> **Objetivo:** Sistema de ocorrências, tarefas e avisos.
> **Tempo estimado:** 4-5 dias
> **Pré-requisito:** FASE 4 completa

### 5.1 Tipos de Ocorrência
| Etapa | Descrição | Checklist |
|-------|-----------|-----------|
| 5.1.1 | CRUD em Configurações ou separado | [ ] |

---

### 5.2 Ocorrências Pedagógicas
| Etapa | Descrição | Checklist |
|-------|-----------|-----------|
| 5.2.1 | No prontuário do aluno | [ ] |
| 5.2.2 | Formulário de registro | [ ] |
| 5.2.3 | Notificar responsáveis | [ ] |
| 5.2.4 | Marcar ciência | [ ] |

---

### 5.3 Ocorrências Disciplinares (Permanentes)
| Etapa | Descrição | Checklist |
|-------|-----------|-----------|
| 5.3.1 | Apenas Gestão pode criar | [ ] |
| 5.3.2 | Salva no app `permanent` | [ ] |
| 5.3.3 | Anexar documentos | [ ] |

---

### 5.4 Tarefas (Completar)
| Etapa | Descrição | Checklist |
|-------|-----------|-----------|
| 5.4.1 | Criar página Tarefas.jsx | [ ] |
| 5.4.2 | Criar tarefa com prazo | [ ] |
| 5.4.3 | Anexar documento | [ ] |
| 5.4.4 | Selecionar funcionários | [ ] |
| 5.4.5 | Marcar como concluída | [ ] |
| 5.4.6 | Filtros: Minhas, Pendentes, Concluídas | [ ] |

---

### 5.5 Avisos (Completar)
| Etapa | Descrição | Checklist |
|-------|-----------|-----------|
| 5.5.1 | Formulário de criação | [ ] |
| 5.5.2 | Selecionar destinatários | [ ] |
| 5.5.3 | Anexar documento | [ ] |
| 5.5.4 | Marcar como lido | [ ] |

---

### 5.6 Reuniões HTPC
| Etapa | Descrição | Checklist |
|-------|-----------|-----------|
| 5.6.1 | Criar página HTPC.jsx | [ ] |
| 5.6.2 | Agendar reunião com pauta | [ ] |
| 5.6.3 | Registrar ata | [ ] |
| 5.6.4 | Lista de presença | [ ] |
| 5.6.5 | Notificar funcionários | [ ] |

---

## 📋 FASE 6: Visualização e Relatórios

> **Objetivo:** Interfaces de consulta.
> **Tempo estimado:** 4-5 dias
> **Pré-requisito:** FASE 5 completa

### 6.1 Boletim
| Etapa | Descrição | Checklist |
|-------|-----------|-----------|
| 6.1.1 | Página para Estudante/Responsável | [ ] |
| 6.1.2 | Notas por disciplina e bimestre | [ ] |
| 6.1.3 | Frequência calculada | [ ] |
| 6.1.4 | Média final | [ ] |

---

### 6.2 Prontuário (Completar)
| Etapa | Descrição | Checklist |
|-------|-----------|-----------|
| 6.2.1 | Aba: Dados Pessoais ✅ | [x] |
| 6.2.2 | Aba: Matrículas ✅ | [x] |
| 6.2.3 | Aba: Notas | [ ] |
| 6.2.4 | Aba: Faltas | [ ] |
| 6.2.5 | Aba: Ocorrências | [ ] |
| 6.2.6 | Aba: Atestados | [ ] |
| 6.2.7 | Aba: Histórico Permanente | [ ] |

---

### 6.3 Conselho de Classe
| Etapa | Descrição | Checklist |
|-------|-----------|-----------|
| 6.3.1 | Página dedicada | [ ] |
| 6.3.2 | Selecionar turma | [ ] |
| 6.3.3 | Navegação entre alunos | [ ] |
| 6.3.4 | Editar 5º Conceito | [ ] |
| 6.3.5 | "Salvar e Próximo" | [ ] |

---

### 6.4 Relatórios
| Etapa | Descrição | Checklist |
|-------|-----------|-----------|
| 6.4.1 | Tarefas pendentes/concluídas | [ ] |
| 6.4.2 | Aulas não registradas | [ ] |
| 6.4.3 | Alunos em recuperação | [ ] |
| 6.4.4 | Frequência por turma | [ ] |
| 6.4.5 | Exportar para Excel | [ ] |

---

### 6.5 Emissão de Histórico
| Etapa | Descrição | Checklist |
|-------|-----------|-----------|
| 6.5.1 | Buscar por CPF no `permanent` | [ ] |
| 6.5.2 | Gerar PDF formatado | [ ] |
| 6.5.3 | Incluir notas e frequência | [ ] |

---

## 🧪 Checklist de Qualidade por Funcionalidade

Antes de marcar como concluído, verificar:

```
□ Backend
  □ Model com validações
  □ Serializer com campos corretos
  □ ViewSet com permissões
  □ URL registrada
  □ Testado via API

□ Frontend
  □ Página criada
  □ Rota adicionada
  □ Listagem funciona
  □ Criação funciona
  □ Edição funciona
  □ Exclusão funciona
  □ Mensagens de erro claras
  □ Loading states
  □ Responsivo (mobile)

□ Integração
  □ Dados salvam corretamente
  □ Dados carregam corretamente
  □ Validações respeitadas
  □ Permissões funcionando
```

---

## 🔐 Matriz de Permissões (Referência)

| Funcionalidade | Gestão | Secretaria | Professor | Monitor | Estudante | Responsável |
|----------------|--------|------------|-----------|---------|-----------|-------------|
| Funcionários | CRUD | - | - | - | - | - |
| Cursos | CRUD | R | R | - | - | - |
| Disciplinas | CRUD | R | R | - | - | - |
| Turmas | CRUD | R | R | - | - | - |
| Estudantes | CRUD | CRUD | R | - | Self | Filhos |
| Matrículas | CRUD | CRUD | R | - | Self | Filhos |
| Diário | CRUD | R | CRUD (próprio) | - | - | - |
| Notas | CRUD | R | CRUD (próprio) | - | Self | Filhos |
| Ocorrências | CRUD | CRUD | CRU | - | R | R + Ciência |
| Tarefas | CRUD | R | RU | RU | - | - |
| Avisos | CRUD | CRU | CRU | R | R | R |
| HTPC | CRUD | R | R | - | - | - |
| Relatórios | R | R | R (próprio) | - | - | - |

**Legenda:** C=Create, R=Read, U=Update, D=Delete

---

## 📅 Cronograma Sugerido

| Semana | Fase | Entregas |
|--------|------|----------|
| 1 | Fase 1 | Cursos, Disciplinas, Funcionários |
| 2 | Fase 2 | Turmas completo, Vínculos |
| 3 | Fase 3 | Estudantes, Responsáveis, Matrículas |
| 4 | Fase 4a | Calendário, Diário, Faltas |
| 5 | Fase 4b | Notas, Recuperação |
| 6 | Fase 5 | Ocorrências, Tarefas, Avisos |
| 7 | Fase 6 | Boletim, Prontuário, Relatórios |
| 8 | Polimento | Testes, Ajustes, Deploy |

---

## ⚠️ Armadilhas Comuns a Evitar

1. **Não testar o backend antes de fazer o frontend**
   - Use Postman/Insomnia para testar cada endpoint

2. **Esquecer validações no backend**
   - O frontend pode ser burlado, backend é a última defesa

3. **Não tratar erros no frontend**
   - Sempre exibir mensagem clara ao usuário

4. **Hardcode de IDs**
   - Sempre usar seletores dinâmicos

5. **Não limpar formulários após submit**
   - Resetar form e fechar modal

6. **Esquecer permissões**
   - Testar com cada tipo de usuário

---

**Mantenha este documento atualizado conforme avança no desenvolvimento!**

