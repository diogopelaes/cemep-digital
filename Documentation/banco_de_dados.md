# Descrição Detalhada do Banco de Dados (Django Models)

Abaixo a estrutura sugerida para o `models.py` (pode ser dividido em apps como `academic`, `core`, `users`, `pedagogical`).

## 1. App `users` (Gestão de Acesso)

### Model `User` (AbstractUser)
- Extende o usuário padrão do Django.
- `tipo_usuario`: Enum (SuperAdmin, Gestao, Secretaria, Professor, Monitor, Estudante, Responsavel).
- `foto`: ImageField.
- `dark_mode`: Boolean (Preferência de tema).

## 2. App `core` (Cadastros Base)

### Model `Funcionario`
- `usuario`: OneToOne -> User.
- `funcao`: Char (Gestor, Prof, etc).
- `ativo`: Boolean.

### Model `Disciplina`
- `nome`: Char.
- `sigla`: Char.

### Model `Curso` ou `Serie`
- `nome`: Char (ex: 1º Ano EM, 2º Mod Tec).
- `nivel`: Enum (Medio, Tecnico).

### Model `Turma`
- `nome`: Char (ex: "1º A").
- `serie`: FK -> Serie.
- `ano_letivo`: Integer.

### Model `CalendarioEscolar`
- `data`: Date.
- `tipo`: Enum (Letivo, Feriado, Recesso, Evento, Conselho).
- `descricao`: Char.

## 3. App `academic` (Vida Escolar)

### Model `Estudante`
- `usuario`: OneToOne -> User.
- `matricula_em`: Unique (Nullable).
- `matricula_tec`: Unique (Nullable).
- `data_nascimento`: Date.
- `responsaveis`: M2M -> `Responsavel`.
- `data_saida`: Date (Nullable - Gatilho para expurgo).

### Model `MatriculaTurma`
- `estudante`: FK -> Estudante.
- `turma`: FK -> Turma.
- `data_entrada`: Date.
- `data_saida`: Date (Nullable).
- `ativo`: Boolean.

### Model `Responsavel`
- `usuario`: OneToOne -> User.
- `telefone`: Char.

### Model `Atestado`
- `usuario_alvo`: FK -> User (Estudante ou Funcionario).
- `data_inicio`: Date.
- `dias`: Int.
- `protocolo_prefeitura`: Char (Opcional).
- `arquivo`: FileField (Privado).

### Model `HistoricoEscolar` (Tabela Permanente)
- **Objetivo:** Armazenar dados finais para consulta futura após o expurgo dos detalhes.
- `estudante`: FK -> Estudante.
- `ano_letivo`: Int.
- `serie`: Char.
- `disciplina`: Char (Nome estático para persistência).
- `nota_final`: Decimal.
- `frequencia_total`: Int.
- `situacao`: Enum (Aprovado, Reprovado).
- `arquivo_pdf`: FileField (Cópia digitalizada se houver).

## 4. App `pedagogical` (Dia a dia e Notas)

### Model `Habilidade`
- `disciplina`: FK -> Disciplina.
- `codigo`: Char (BNCC ou interno).
- `descricao`: Text.

### Model `PlanejamentoBimestral`
- `professor`: FK -> Funcionario.
- `disciplina`: FK -> Disciplina.
- `turma`: FK -> Turma.
- `bimestre`: Int.
- `conteudo_semanal`: JSON/Text (Estrutura detalhada por semana).
- `semana_avaliacao`: DateRange.

### Model `Aula` (Diário)
- `professor`: FK -> Funcionario.
- `turma`: FK -> Turma.
- `disciplina`: FK -> Disciplina.
- `data`: Date.
- `conteudo`: Text.
- `habilidades`: M2M -> Habilidade.
- `numero_aulas`: Int (ex: 2 aulas geminadas).

### Model `Frequencia`
- `aula`: FK -> Aula.
- `estudante`: FK -> Estudante.
- `presente`: Boolean.
- `aula_numero`: Int (Se houver 2 aulas no dia, indica qual delas: 1 ou 2).

### Model `OcorrenciaDisciplinar` (Tabela Permanente)
- `estudante`: FK -> Estudante.
- `autor`: FK -> Funcionario.
- `data`: DateTime.
- `descricao`: Text.
- `gravidade`: Enum.

### Model `OcorrenciaPedagogica`
- `estudante`: FK -> Estudante.
- `autor`: FK -> Funcionario.
- `tipo`: FK -> `TipoOcorrencia` (Opções cadastradas pelo gestor).
- `data`: DateTime.
- `ciente_responsavel`: Boolean.

### Model `Avaliacao`
- `professor`: FK -> Funcionario.
- `turma`: FK -> Turma.
- `disciplina`: FK -> Disciplina.
- `bimestre`: Int.
- `nome`: Char.
- `tipo`: Enum (Regular, Extra, Recuperacao).
- `valor_maximo`: Decimal (ex: 10.0).
- `metodo_calculo`: Enum (Soma, MediaPonderada).
- `grupos`: JSON (Definição dos grupos de alunos se houver).

### Model `InstrumentoAvaliativo`
- `avaliacao`: FK -> Avaliacao.
- `nome`: Char (Prova, Trabalho, Visto).
- `peso`: Decimal (Se média ponderada).
- `valor`: Decimal (Se soma).
- `tipo_visto`: Boolean (Se True, usa lógica de check).

### Model `Nota`
- `instrumento`: FK -> InstrumentoAvaliativo.
- `estudante`: FK -> Estudante.
- `valor_numerico`: Decimal.
- `status_visto`: Enum (Feito, NaoFeito, Desconsiderar, None).

## 5. App `management` (Agenda e Reuniões)

### Model `Tarefa`
- `titulo`: Char.
- `grupo_destino`: FK -> GrupoFuncionarios.
- `prazo`: DateTime.
- `concluido_por`: M2M -> User.

### Model `ReuniaoHTPC`
- `data`: DateTime.
- `pauta`: Text.
- `ata`: Text.
- `presentes`: M2M -> Funcionario.

## Regras de Negócio Importantes no Banco
1. **Unicidade de Matrícula:** Garantir que `matricula_em` ou `matricula_tec` não se repitam, mas aceitem NULL.
2. **Deleção Lógica x Física:**
   - Usuários e Turmas podem ter `soft delete` (campo `ativo=False`).
   - Dados detalhados de notas/frequência são deletados fisicamente após 1 ano da saída (Job de limpeza).
