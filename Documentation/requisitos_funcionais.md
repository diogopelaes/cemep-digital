# Requisitos Funcionais — CEMEP Digital

## 1. Módulo de Autenticação e Perfis
- **RF001 - Login:** O sistema deve permitir login via usuário (email ou username) e senha.
- **RF002 - Perfis de Acesso:** O sistema deve diferenciar acessos para: SuperAdmin, Gestão, Secretaria, Professor, Monitor, Estudante e Responsável.
- **RF003 - Recuperação de Senha:** O sisteme deve permitir recuperação de senha via e-mail.

## 2. Módulo de Gestão (SuperAdmin/Gestor)
- **RF004 - Cadastro de Funcionários:** Permitir cadastro completo, agrupando por funções (Gestor, Professor, Secretario, etc.).
- **RF005 - Cadastro de Disciplinas:** Gerenciar disciplinas ofertadas.
- **RF006 - Cadastro de Turmas:** Criar turmas e associá-las a séries/cursos.
- **RF007 - Controle de Acesso:** Configurar quais professores acessam quais registros e turmas.
- **RF008 - Calendário Escolar:** Cadastrar dias letivos, feriados, recessos e eventos escolares.
- **RF009 - Grade Horária:** Montar a grade de aulas por turma e professor.
- **RF010 - Opções de Ocorrências:** Cadastrar tipos/categorias de ocorrências pedagógicas (checkbox).
- **RF011 - Registro de Ocorrências:** Gestores podem registrar ocorrências disciplinares e pedagógicas para qualquer aluno.
- **RF012 - Prontuário do Estudante:** Visualização completa (360º) do histórico, notas, ocorrências e dados pessoais do aluno.
- **RF013 - Relatórios Gerenciais:**
    - Tarefas concluídas/pendentes da equipe.
    - Registros de aulas não realizados pelos professores.
    - Atas de reuniões.
- **RF014 - Cadastro de Habilidades:** Cadastrar habilidades (BNCC/Próprio) vinculadas às disciplinas.
- **RF015 - Configuração de Prazos:** Definir datas limite para:
    - Registro de planejamento bimestral.
    - Fechamento de notas por bimestre.
- **RF016 - Descritores de Desempenho:** Cadastrar descritores para uso no registro de notas.

## 3. Módulo Agenda e HTPC
- **RF017 - Agendamento de Tarefas:** Criar tarefas para grupos de funcionários ou individuais com prazo.
- **RF018 - Alertas:** O sistema deve notificar sobre prazos de tarefas.
- **RF019 - Eventos e Avisos:** Enviar comunicados para turmas, séries ou escola toda.
- **RF020 - Gestão de HTPC (Reuniões):**
    - Agendar reunião.
    - Definir pauta (visível apenas a docentes/gestão).
    - Registrar lista de presença.
    - Registrar Ata.
    - Emitir relatório da reunião.

## 4. Módulo Secretaria
- **RF021 - Cadastro de Estudantes:** Incluir dados pessoais, foto, e múltiplos responsáveis (com e-mail).
    - Matrícula Ensino Médio (opcional se Técnico preenchido).
    - Matrícula Ensino Técnico (opcional se Médio preenchido).
    - Pelo menos uma matrícula é obrigatória.
- **RF022 - Enturmação:** Vincular aluno a uma turma com data de *entrada* e *saída*.
- **RF023 - Emissão de Documentos:** Gerar Histórico Escolar, Boletim e Declarações.
- **RF024 - Atestados Médicos:**
    - Registrar atestado de estudante.
    - Registrar atestado de funcionário (Campo texto para protocolo da prefeitura, dias e horários).
- **RF025 - Horários de Aula:** Emitir relatórios de grade (Geral, Por Turma, Por Professor).

## 5. Módulo Professor
- **RF026 - Planejamento Bimestral:**
    - Registrar por Disciplina/Série.
    - Descrição semanal de conteúdos e habilidades.
    - Marcação obrigatória de "Semana de Avaliação".
- **RF027 - Planejamento Diário:** Registrar atividades e habilidades da aula (baseado no Bimestral ou livre).
- **RF028 - Registro de Aula (Diário de Classe):**
    - Conteúdo dado.
    - Frequência dos alunos.
    - **Regra:** Se houver mais de uma aula no dia, mostrar lista de aulas para registro individual de presença. Bloquear dia se não for letivo/calendário.
- **RF029 - Ocorrências:**
    - Pedagógicas: Seleção objetiva (checkbox) de itens pré-definidos.
    - Disciplinares: Texto discursivo.
- **RF030 - Avaliações:**
    - Criar Avaliação (Regular, Extra, Recuperação).
    - Definir método de cálculo (Soma ou Média Ponderada).
    - Anexar arquivos de orientação.
    - Instrumentos Avaliativos: Provas, Trabalhos, etc.
    - Instrumento "Vistos": Checklist (Feito/Não Feito/Desconsiderar).
    - Grupos: Definir grupos de alunos para avaliação coletiva.
- **RF031 - Notas:** Lançar notas para os instrumentos.
    - Cálculo automático da nota da Avaliação.
    - Soma das Avaliações (Regular+Extra) compõe a nota Bimestral.
    - **Regra da Recuperação:** Se Nota Recuperação > Nota Final Atual, a Recuperação substitui a Final.
- **RF032 - Visualizações:**
    - Carômetro da turma.
    - Mapa de sala.
    - Exportar Diário de Classe (XLSX).

## 6. Módulo Monitor
- **RF033 - Disciplina:** Registrar ocorrências disciplinares.

## 7. Módulo Estudante e Responsável
- **RF034 - Dashboard:** Visualização de notas (detalhada por instrumento) e faltas.
- **RF035 - Boletim:** Visualização do boletim atualizado em tempo real (conforme liberação de prazos).
- **RF036 - Notificações:**
    - Pedagógicas: Alerta persistente até confirmação de leitura.
    - Disciplinares: Não visíveis neste módulo (regra do usuário: "Ocorrências disciplinares não devem ser visualizadas" - *Nota: Confirmar se Responsável também não vê, assumindo regra estrita do documento original*).
    - *Correção Baseada em Contexto:* O documento original diz "Ocorrências disciplinares não devem ser visualizadas". Entretanto, RF048 diz "Emitir relatório disciplinar". O bloqueio visual é na interface do aluno/pais.

## 8. Conselho de Classe
- **RF037 - Painel do Conselho:** Visão geral das turmas e status de conclusão do conselho.
- **RF038 - Execução do Conselho:**
    - Por Bimestre/Turma.
    - Lista alunos com destaque para médias vermelhas (< 6.0).
    - Modal/Tela do Aluno: Foto, notas, todas ocorrências (incluindo disciplinares aqui), prontuário.
    - Campo para observações do conselho.
    - Navegação rápida (Salvar e Próximo).
