# Requisitos Funcionais — CEMEP Digital

## 1. Módulo de Autenticação e Perfis
- **RF001 - Login:** O sistema deve permitir login via usuário (email ou username) e senha.
- **RF002 - Perfis de Acesso:** O sistema utiliza os perfis: Gestão (com acesso SuperAdmin), Secretaria, Professor, Monitor, Estudante e Responsável.
- **RF003 - Recuperação de Senha:** O sisteme deve permitir recuperação de senha via e-mail.

## 2. Módulo de Gestão (Gestor)
- **RF004 - Cadastro de Funcionários:** Permitir cadastro completo.
- **RF005 - Períodos de Trabalho:** Registrar múltiplos períodos de trabalho para funcionários, com data de entrada obrigatória e saída opcional, sem sobreposição de datas.
- **RF006 - Cadastro de Disciplinas:** Gerenciar disciplinas (nome e sigla).
- **RF007 - Cadastro de Cursos:** Gerenciar cursos (nome e sigla).
- **RF008 - Cadastro de Turmas:** Criar turmas com número, letra, ano letivo e nomenclatura (Série, Ano ou Módulo).
- **RF009 - Disciplinas da Turma:** Associar disciplinas às turmas definindo a carga horária.
- **RF010 - Atribuição de Aulas:** Vincular professores às disciplinas das turmas.
- **RF011 - Calendário Escolar:** Cadastrar dias letivos e não letivos (Feriado, Ponto Facultativo, Recesso, Férias).
- **RF012 - Opções de Ocorrências:** Cadastrar tipos de ocorrências pedagógicas.
- **RF013 - Registro de Ocorrências:** Gestores podem registrar ocorrências disciplinares (permanentes) e pedagógicas.
- **RF014 - Prontuário do Estudante:** Visualização completa do histórico (inclusive permanente), notas, ocorrências e dados pessoais.
- **RF015 - Relatórios Gerenciais:**
    - Tarefas concluídas/pendentes.
    - Registros de aulas não realizados.
    - Atas de reuniões HTPC.
- **RF016 - Cadastro de Habilidades:** BNCC ou interno por disciplina.

## 3. Módulo Agenda, HTPC e Avisos
- **RF017 - Agendamento de Tarefas:** Criar tarefas com prazo, anexo de documentos e seleção de funcionários (M2M).
- **RF018 - Alertas e Notificações:** Notificar funcionários sobre novas tarefas, reuniões HTPC e recuperações.
- **RF019 - Eventos e Avisos:** Enviar comunicados com anexos para destinatários específicos (M2M Users).
- **RF020 - Gestão de HTPC (Reuniões):**
    - Agendar reunião, definir pauta e registrar ata.
    - Registrar data do registro e usuário responsável pelo registro.
    - Lista de presença (M2M Funcionários).

## 4. Módulo Secretaria
- **RF021 - Cadastro de Estudantes:** 
    - Dados: CPF, CIN, Bolsa Família, Pé de Meia, Data de Entrada (obrigatória).
    - Endereço completo.
    - Transporte: Uso de ônibus escolar e Linha do ônibus.
    - Autorização de saída sem responsável.
- **RF022 - Matrícula CEMEP:** Registro central da matrícula com número (PK manual), curso, datas e status (Matriculado, Concluído, Abandono, Transferido, Outro).
- **RF023 - Enturmação (Matrícula Turma):** Vincular aluno a uma turma com status (Cursando, Transferido, Retido, Promovido). O status "Cursando" é automático se a data de saída estiver vazia.
- **RF024 - Responsáveis:** Vincular múltiplos responsáveis com definição de parentesco (Choices: Pai, Mãe, Avô, etc.).
- **RF025 - Atestados Médicos:** Registrar data/hora inicial e data/hora final (obrigatórios). Protocolo da prefeitura opcional.

## 5. Módulo Professor
- **RF026 - Plano de Aula:** Criar planos com data inicial/final, conteúdo, habilidades e múltiplas turmas. Serve como base para o registro diário.
- **RF027 - Registro de Aula (Diário):** Conteúdo e número de aulas (geminadas).
- **RF028 - Registro de Faltas:** O sistema registra apenas as ausências. Permite indicar em qual aula do dia ocorreu a falta (1 ou 2).
- **RF029 - Ocorrências:** 
    - Pedagógicas: Registrar e gerenciar ciência dos responsáveis.
    - Disciplinares: Texto e anexos (registradas no módulo permanente).
- **RF030 - Avaliações e Instrumentos:** Criar avaliações com instrumentos (Provas, Trabalhos, Vistos).
- **RF031 - Notas Bimestrais:** Lançar ou importar notas para os 4 bimestres + 5º Conceito (Conselho).
- **RF032 - Recuperação:** Vincular estudantes para recuperação por disciplina e bimestre.

## 6. Módulo Estudante e Responsável
- **RF033 - Dashboard:** Notas e faltas (calculadas).
- **RF034 - Ciência de Ocorrência:** Responsável deve marcar ciência em ocorrências pedagógicas.

## 7. Conselho de Classe e Histórico
- **RF035 - Painel do Conselho:** Visualização e edição do 5º Conceito.
- **RF036 - Emissão de Histórico:** Gerar documento baseado nos dados permanentes (App `permanent`).
- **RF037 - Registro Permanente:** Garantir que ao excluir um aluno, o histórico escolar por ano letivo e as ocorrências disciplinares sejam preservados via CPF.
