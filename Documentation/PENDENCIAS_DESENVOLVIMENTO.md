# 📋 Pendências de Desenvolvimento - CEMEP Digital

Documento de acompanhamento de todas as funcionalidades pendentes de implementação.

**Última atualização:** Dezembro 2025

---

## 📊 Resumo Geral

| Categoria | Total | Concluído | Pendente |
|-----------|-------|-----------|----------|
| Páginas Frontend | 15 | 4 | 11 |
| Funcionalidades Completas | 37 | ~10 | ~27 |

---

## ✅ Páginas IMPLEMENTADAS

| Página | Rota | Perfis | Status |
|--------|------|--------|--------|
| Login | `/login` | Todos | ✅ Completo |
| Recuperar Senha | `/recuperar-senha` | Todos | ✅ Completo |
| Dashboard | `/dashboard` | Todos | ✅ Básico |
| Estudantes | `/estudantes` | Gestão, Secretaria | ✅ Básico (lista + prontuário) |
| Turmas | `/turmas` | Gestão, Secretaria | ✅ Básico (lista) |
| Avisos | `/avisos` | Todos | ✅ Básico (lista) |

---

## 🚧 Páginas PENDENTES (Frontend)

### 🔴 Prioridade Alta

| # | Página | Rota | Perfis | Descrição |
|---|--------|------|--------|-----------|
| 1 | **Funcionários** | `/funcionarios` | Gestão | CRUD completo de funcionários e períodos de trabalho |
| 2 | **Disciplinas** | `/disciplinas` | Gestão | CRUD de disciplinas + vínculo com turmas |
| 3 | **Diário de Classe** | `/diario` | Professor | Registro de aulas + chamada (faltas) |
| 4 | **Notas** | `/notas` | Professor | Lançamento de notas bimestrais |
| 5 | **Boletim** | `/boletim` | Estudante, Responsável | Visualização de notas e frequência |

### 🟡 Prioridade Média

| # | Página | Rota | Perfis | Descrição |
|---|--------|------|--------|-----------|
| 6 | **Calendário** | `/calendario` | Gestão, Secretaria | CRUD de dias letivos/não letivos |
| 7 | **Tarefas** | `/tarefas` | Gestão, Professor, Monitor | Gerenciamento de tarefas e notificações |
| 8 | **Minhas Turmas** | `/minhas-turmas` | Professor | Turmas atribuídas ao professor |
| 9 | **Ocorrências** | `/ocorrencias` | Responsável | Visualizar e dar ciência em ocorrências |
| 10 | **Relatórios** | `/relatorios` | Gestão | Relatórios gerenciais diversos |

### 🟢 Prioridade Baixa

| # | Página | Rota | Perfis | Descrição |
|---|--------|------|--------|-----------|
| 11 | **Configurações** | `/configuracoes` | Gestão | Configurações do sistema |

---

## 📝 Funcionalidades Detalhadas por Módulo

### 1. Módulo de Autenticação ✅

- [x] RF001 - Login com usuário/email e senha
- [x] RF002 - Perfis de acesso (6 tipos)
- [x] RF003 - Recuperação de senha via e-mail

### 2. Módulo de Gestão (Gestor)

- [ ] **RF004 - Cadastro de Funcionários**
  - [ ] Formulário de cadastro completo
  - [ ] Listagem com filtros
  - [ ] Edição e exclusão
  
- [ ] **RF005 - Períodos de Trabalho**
  - [ ] Interface para adicionar múltiplos períodos
  - [ ] Validação de sobreposição de datas
  
- [ ] **RF006 - Cadastro de Disciplinas**
  - [ ] CRUD de disciplinas (nome/sigla)
  
- [ ] **RF007 - Cadastro de Cursos**
  - [ ] CRUD de cursos (nome/sigla)
  
- [x] RF008 - Cadastro de Turmas (parcial)
  - [x] Listagem de turmas
  - [ ] Formulário de criação funcional
  - [ ] Edição e exclusão
  
- [ ] **RF009 - Disciplinas da Turma**
  - [ ] Interface para vincular disciplinas às turmas
  - [ ] Definir carga horária
  
- [ ] **RF010 - Atribuição de Aulas**
  - [ ] Interface para vincular professores às disciplinas/turmas
  
- [ ] **RF011 - Calendário Escolar**
  - [ ] Visualização em calendário
  - [ ] CRUD de dias letivos/não letivos
  - [ ] Tipos: Feriado, Ponto Facultativo, Recesso, Férias
  
- [ ] **RF012 - Tipos de Ocorrências**
  - [ ] CRUD de tipos de ocorrências pedagógicas
  
- [ ] **RF013 - Registro de Ocorrências**
  - [ ] Formulário para ocorrências disciplinares (permanentes)
  - [ ] Formulário para ocorrências pedagógicas
  
- [x] RF014 - Prontuário do Estudante (parcial)
  - [x] Dados pessoais
  - [x] Matrículas
  - [ ] Histórico permanente
  - [ ] Notas
  - [ ] Ocorrências
  
- [ ] **RF015 - Relatórios Gerenciais**
  - [ ] Tarefas concluídas/pendentes
  - [ ] Registros de aulas não realizados
  - [ ] Atas de reuniões HTPC
  
- [ ] **RF016 - Cadastro de Habilidades**
  - [ ] CRUD de habilidades BNCC
  - [ ] Vínculo com disciplinas

### 3. Módulo Agenda, HTPC e Avisos

- [ ] **RF017 - Agendamento de Tarefas**
  - [ ] Criar tarefa com prazo
  - [ ] Anexar documentos
  - [ ] Selecionar funcionários
  - [ ] Marcar como concluída
  
- [ ] **RF018 - Alertas e Notificações**
  - [ ] Sistema de notificações (badge no menu)
  - [ ] Notificar novas tarefas
  - [ ] Notificar reuniões HTPC
  - [ ] Notificar recuperações
  
- [x] RF019 - Eventos e Avisos (parcial)
  - [x] Listagem de avisos
  - [ ] Formulário de criação funcional
  - [ ] Anexar documentos
  - [ ] Selecionar destinatários
  
- [ ] **RF020 - Gestão de HTPC**
  - [ ] Agendar reunião
  - [ ] Definir pauta
  - [ ] Registrar ata
  - [ ] Lista de presença

### 4. Módulo Secretaria

- [x] RF021 - Cadastro de Estudantes (parcial)
  - [x] Listagem com busca
  - [ ] Formulário de cadastro completo
  - [ ] Edição e exclusão
  
- [ ] **RF022 - Matrícula CEMEP**
  - [ ] Formulário de matrícula
  - [ ] Número manual
  - [ ] Gerenciar status
  
- [ ] **RF023 - Enturmação**
  - [ ] Interface para vincular aluno à turma
  - [ ] Gerenciar status (Cursando, Transferido, Retido, Promovido)
  
- [ ] **RF024 - Responsáveis**
  - [ ] CRUD de responsáveis
  - [ ] Vincular ao estudante com parentesco
  
- [ ] **RF025 - Atestados Médicos**
  - [ ] Formulário de registro
  - [ ] Upload de arquivo
  - [ ] Visualização protegida

### 5. Módulo Professor

- [ ] **RF026 - Plano de Aula**
  - [ ] Criar plano com período
  - [ ] Selecionar turmas
  - [ ] Vincular habilidades
  
- [ ] **RF027 - Registro de Aula (Diário)**
  - [ ] Registrar conteúdo ministrado
  - [ ] Indicar número de aulas geminadas
  
- [ ] **RF028 - Registro de Faltas**
  - [ ] Lista de chamada
  - [ ] Marcar faltas por aula (1, 2, 3, 4)
  - [ ] Salvar em lote
  
- [ ] **RF029 - Ocorrências**
  - [ ] Registrar ocorrência pedagógica
  - [ ] Registrar ocorrência disciplinar
  - [ ] Gerenciar ciência dos responsáveis
  
- [ ] **RF030 - Avaliações e Instrumentos**
  - [ ] Criar avaliações (Provas, Trabalhos, Vistos)
  - [ ] Definir peso
  
- [ ] **RF031 - Notas Bimestrais**
  - [ ] Interface de lançamento de notas
  - [ ] Suporte a 4 bimestres + 5º Conceito
  - [ ] Nota de recuperação
  
- [ ] **RF032 - Recuperação**
  - [ ] Vincular estudantes para recuperação
  - [ ] Por disciplina e bimestre

### 6. Módulo Estudante e Responsável

- [ ] **RF033 - Dashboard Estudante**
  - [ ] Exibir notas
  - [ ] Exibir frequência calculada
  - [ ] Próximas recuperações
  
- [ ] **RF034 - Ciência de Ocorrência**
  - [ ] Listar ocorrências pendentes
  - [ ] Marcar ciência

### 7. Conselho de Classe e Histórico

- [ ] **RF035 - Painel do Conselho**
  - [ ] Navegação entre alunos ("Salvar e Próximo")
  - [ ] Editar 5º Conceito
  - [ ] Resumo por turma
  
- [ ] **RF036 - Emissão de Histórico**
  - [ ] Gerar PDF do histórico escolar
  - [ ] Dados do app `permanent`
  
- [x] RF037 - Registro Permanente (backend)
  - [x] Models implementados
  - [x] Management command de limpeza

---

## 🔧 Melhorias Técnicas Pendentes

### Frontend

- [ ] Formulário completo de cadastro de estudante
- [ ] Formulário completo de cadastro de funcionário
- [ ] Sistema de notificações em tempo real
- [ ] Paginação em todas as listagens
- [ ] Filtros avançados
- [ ] Exportação para Excel/PDF
- [ ] Modo offline (PWA)

### Backend

- [ ] Testes automatizados (pytest)
- [ ] Documentação da API (Swagger/OpenAPI)
- [ ] Rate limiting
- [ ] Logs estruturados
- [ ] Backup automático do banco

---

## 🎯 Sugestão de Ordem de Desenvolvimento

### Sprint 1 - Base Gestão
1. Funcionários (CRUD completo)
2. Disciplinas (CRUD completo)
3. Cursos (completar CRUD)
4. Turmas (completar formulário)
5. Vínculo Disciplina-Turma
6. Atribuição de Aulas

### Sprint 2 - Fluxo Professor
7. Minhas Turmas
8. Diário de Classe
9. Registro de Faltas
10. Lançamento de Notas

### Sprint 3 - Fluxo Estudante/Responsável
11. Boletim
12. Ocorrências (visualização)
13. Ciência de Ocorrência

### Sprint 4 - Gestão Avançada
14. Calendário
15. Tarefas
16. HTPC
17. Relatórios

### Sprint 5 - Conselho e Histórico
18. Painel do Conselho
19. Emissão de Histórico

### Sprint 6 - Polimento
20. Sistema de Notificações
21. Configurações
22. Testes e documentação

---

## 📌 Notas Importantes

1. **Regra da Recuperação:** A nota de recuperação SUBSTITUI a nota final se for maior (já implementado no backend)

2. **Faltas:** Sistema registra apenas ausências. Frequência calculada com base nos dias letivos

3. **Dados Permanentes:** Histórico e ocorrências disciplinares NUNCA são excluídos

4. **Proteção de Arquivos:** Media files devem ser servidos via view protegida do Django

---

**Legenda:**
- ✅ Completo
- 🔄 Parcial
- ⬜ Não iniciado

