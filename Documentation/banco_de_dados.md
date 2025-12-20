# Descrição Detalhada do Banco de Dados (Django Models)

Abaixo a estrutura sugerida para o `models.py` (pode ser dividido em apps como `academic`, `core`, `users`, `pedagogical`).

## 1. App `users` (Gestão de Acesso)

```python
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    class TipoUsuario(models.TextChoices):
        GESTAO = 'GESTAO', 'Gestão'
        SECRETARIA = 'SECRETARIA', 'Secretaria'
        PROFESSOR = 'PROFESSOR', 'Professor'
        MONITOR = 'MONITOR', 'Monitor'
        ESTUDANTE = 'ESTUDANTE', 'Estudante'
        RESPONSAVEL = 'RESPONSAVEL', 'Responsável'

    tipo_usuario = models.CharField(max_length=20, choices=TipoUsuario.choices)
    foto = models.ImageField(upload_to='profile_pics/', null=True, blank=True)
    dark_mode = models.BooleanField(default=False)
```

## 2. App `core` (Cadastros Base)

```python
class Funcionario(models.Model):
    usuario = models.OneToOneField(User, on_delete=models.CASCADE)
    funcao = models.CharField(max_length=100)
    ativo = models.BooleanField(default=True)

class PeriodoTrabalho(models.Model):
    funcionario = models.ForeignKey(Funcionario, on_delete=models.CASCADE)
    data_entrada = models.DateField()
    data_saida = models.DateField(null=True, blank=True)
    
    class Meta:
        verbose_name = "Período de Trabalho"
        # Validação de sobreposição de datas via clean() ou signals

class Disciplina(models.Model):
    nome = models.CharField(max_length=100)
    sigla = models.CharField(max_length=10)

class Curso(models.Model):
    nome = models.CharField(max_length=100)
    sigla = models.CharField(max_length=10)

class Turma(models.Model):
    class Nomenclatura(models.TextChoices):
        SERIE = 'SERIE', 'Série'
        ANO = 'ANO', 'Ano'
        MODULO = 'MODULO', 'Módulo'

    numero = models.PositiveSmallIntegerField()
    letra = models.CharField(max_length=1)
    ano_letivo = models.PositiveSmallIntegerField()
    nomenclatura = models.CharField(max_length=10, choices=Nomenclatura.choices)

class DisciplinaTurma(models.Model):
    disciplina = models.ForeignKey(Disciplina, on_delete=models.CASCADE)
    turma = models.ForeignKey(Turma, on_delete=models.CASCADE)
    carga_horaria = models.PositiveSmallIntegerField()

class ProfessorDisciplinaTurma(models.Model):
    professor = models.ForeignKey(Funcionario, on_delete=models.CASCADE)
    disciplina_turma = models.ForeignKey(DisciplinaTurma, on_delete=models.CASCADE)

class CalendarioEscolar(models.Model):
    class TipoNaoLetivo(models.TextChoices):
        FERIADO = 'FERIADO', 'Feriado'
        PONTO_FACULTATIVO = 'PONTO_FACULTATIVO', 'Ponto Facultativo'
        RECESSO = 'RECESSO', 'Recesso'
        FERIAS = 'FERIAS', 'Férias'

    data = models.DateField()
    letivo = models.BooleanField(default=True)
    tipo = models.CharField(max_length=20, choices=TipoNaoLetivo.choices, null=True, blank=True)
    descricao = models.CharField(max_length=255)
```

## 3. App `academic` (Vida Escolar)

```python
class Estudante(models.Model):
    usuario = models.OneToOneField(User, on_delete=models.CASCADE)
    cpf = models.CharField(max_length=14, unique=True)
    cin = models.CharField(max_length=20, verbose_name="CIN")
    data_nascimento = models.DateField()
    data_entrada = models.DateField()
    bolsa_familia = models.BooleanField(default=False)
    pe_de_meia = models.BooleanField(default=True)
    usa_onibus = models.BooleanField(default=True)
    linha_onibus = models.CharField(max_length=100, blank=True)
    permissao_sair_sozinho = models.BooleanField(default=False)
    
    # Endereço
    logradouro = models.CharField(max_length=255)
    numero = models.CharField(max_length=10)
    bairro = models.CharField(max_length=100)
    cidade = models.CharField(max_length=100, default="Mogi Guaçu")
    estado = models.CharField(max_length=2, default="SP")
    cep = models.CharField(max_length=9)
    complemento = models.CharField(max_length=100, blank=True)

class Responsavel(models.Model):
    class Parentesco(models.TextChoices):
        PAI = 'PAI', 'Pai'
        MAE = 'MAE', 'Mãe'
        AVO_M = 'AVO_M', 'Avô(a) Materno'
        AVO_P = 'AVO_P', 'Avô(a) Paterno'
        OUTRO = 'OUTRO', 'Outro'

    usuario = models.OneToOneField(User, on_delete=models.CASCADE)
    estudantes = models.ManyToManyField(Estudante, related_name='responsaveis')
    parentesco = models.CharField(max_length=20, choices=Parentesco.choices)
    telefone = models.CharField(max_length=15)

class MatriculaCEMEP(models.Model):
    class Status(models.TextChoices):
        MATRICULADO = 'MATRICULADO', 'Matriculado'
        CONCLUIDO = 'CONCLUIDO', 'Concluído'
        ABANDONO = 'ABANDONO', 'Abandono'
        TRANSFERIDO = 'TRANSFERIDO', 'Transferido'
        OUTRO = 'OUTRO', 'Outro'

    numero_matricula = models.CharField(max_length=20, primary_key=True)
    estudante = models.ForeignKey(Estudante, on_delete=models.CASCADE)
    curso = models.ForeignKey(Curso, on_delete=models.CASCADE)
    data_entrada = models.DateField()
    data_saida = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.MATRICULADO)

class MatriculaTurma(models.Model):
    class Status(models.TextChoices):
        CURSANDO = 'CURSANDO', 'Cursando'
        TRANSFERIDO = 'TRANSFERIDO', 'Transferido'
        RETIDO = 'RETIDO', 'Retido'
        PROMOVIDO = 'PROMOVIDO', 'Promovido'

    estudante = models.ForeignKey(Estudante, on_delete=models.CASCADE)
    turma = models.ForeignKey(Turma, on_delete=models.CASCADE)
    data_entrada = models.DateField()
    data_saida = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.CURSANDO)

class Atestado(models.Model):
    usuario_alvo = models.ForeignKey(User, on_delete=models.CASCADE)
    data_inicio = models.DateTimeField()
    data_fim = models.DateTimeField()
    protocolo_prefeitura = models.CharField(max_length=50, blank=True)
    arquivo = models.FileField(upload_to='atestados/')
```

## 4. App `pedagogical` (Dia a dia e Notas)

```python
class PlanoAula(models.Model):
    professor = models.ForeignKey(Funcionario, on_delete=models.CASCADE)
    disciplina = models.ForeignKey(Disciplina, on_delete=models.CASCADE)
    turmas = models.ManyToManyField(Turma)
    data_inicio = models.DateField()
    data_fim = models.DateField()
    conteudo = models.TextField()
    habilidades = models.ManyToManyField('Habilidade')

class Aula(models.Model):
    professor = models.ForeignKey(Funcionario, on_delete=models.CASCADE)
    disciplina_turma = models.ForeignKey(DisciplinaTurma, on_delete=models.CASCADE)
    data = models.DateField()
    conteudo = models.TextField()
    numero_aulas = models.PositiveSmallIntegerField(default=1)

class Faltas(models.Model):
    aula = models.ForeignKey(Aula, on_delete=models.CASCADE)
    estudante = models.ForeignKey(Estudante, on_delete=models.CASCADE)
    aula_numero = models.PositiveSmallIntegerField(help_text="1 ou 2")

class TipoOcorrencia(models.Model):
    gestor = models.ForeignKey(Funcionario, on_delete=models.CASCADE)
    texto = models.CharField(max_length=100)

class OcorrenciaPedagogica(models.Model):
    estudante = models.ForeignKey(Estudante, on_delete=models.CASCADE)
    autor = models.ForeignKey(Funcionario, on_delete=models.CASCADE)
    tipo = models.ForeignKey(TipoOcorrencia, on_delete=models.PROTECT)
    data = models.DateTimeField(auto_now_add=True)
    texto = models.TextField()

class OcorrenciaResponsavelCiente(models.Model):
    responsavel = models.ForeignKey(Responsavel, on_delete=models.CASCADE)
    ocorrencia = models.ForeignKey(OcorrenciaPedagogica, on_delete=models.CASCADE)
    ciente = models.BooleanField(default=False)

class NotaBimestral(models.Model):
    matricula_turma = models.ForeignKey(MatriculaTurma, on_delete=models.CASCADE)
    disciplina_turma = models.ForeignKey(DisciplinaTurma, on_delete=models.CASCADE)
    bimestre = models.PositiveSmallIntegerField(choices=[(1,1),(2,2),(3,3),(4,4),(5,'5º Conceito')])
    nota = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)

class Recuperacao(models.Model):
    estudantes = models.ManyToManyField(Estudante)
    disciplina = models.ForeignKey(Disciplina, on_delete=models.CASCADE)
    professor = models.ForeignKey(Funcionario, on_delete=models.CASCADE)
    bimestre = models.PositiveSmallIntegerField()
    
class NotificacaoRecuperacao(models.Model):
    recuperacao = models.ForeignKey(Recuperacao, on_delete=models.CASCADE)
    funcionario = models.ForeignKey(Funcionario, on_delete=models.CASCADE)
    visualizado = models.BooleanField(default=False)
```

## 5. App `management` (Agenda e Tarefas)

```python
class Tarefa(models.Model):
    titulo = models.CharField(max_length=200)
    prazo = models.DateTimeField()
    funcionarios = models.ManyToManyField(Funcionario)
    concluido = models.BooleanField(default=False)
    data_cadastro = models.DateTimeField(auto_now_add=True)
    criador = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tarefas_criadas')
    documento = models.FileField(upload_to='tarefas/', null=True, blank=True)

class NotificacaoTarefa(models.Model):
    tarefa = models.ForeignKey(Tarefa, on_delete=models.CASCADE)
    funcionario = models.ForeignKey(Funcionario, on_delete=models.CASCADE)
    visualisado = models.BooleanField(default=False)

class ReuniaoHTPC(models.Model):
    data_reuniao = models.DateTimeField()
    pauta = models.TextField()
    ata = models.TextField(blank=True)
    presentes = models.ManyToManyField(Funcionario)
    data_registro = models.DateTimeField(auto_now_add=True)
    quem_registrou = models.ForeignKey(User, on_delete=models.CASCADE)

class NotificacaoHTPC(models.Model):
    reuniao = models.ForeignKey(ReuniaoHTPC, on_delete=models.CASCADE)
    funcionario = models.ForeignKey(Funcionario, on_delete=models.CASCADE)
    visualisado = models.BooleanField(default=False)

class Aviso(models.Model):
    titulo = models.CharField(max_length=200)
    texto = models.TextField()
    documento = models.FileField(upload_to='avisos/', null=True, blank=True)
    data_aviso = models.DateTimeField(auto_now_add=True)
    criador = models.ForeignKey(Funcionario, on_delete=models.CASCADE)
    destinatarios = models.ManyToManyField(User, related_name='avisos_recebidos')
```

## 6. App `permanent` (Histórico e Registros Imutáveis)
*Nota: Estes modelos usam CPF como PK para garantir a sobrevivência dos dados após o expurgo de usuários do banco principal.*

```python
class HistoricoEscolar(models.Model):
    estudante_cpf = models.CharField(max_length=14, primary_key=True)
    nome_estudante = models.CharField(max_length=255)
    numero_matricula = models.CharField(max_length=20)
    nome_curso = models.CharField(max_length=100)
    data_entrada_cemep = models.DateField()
    data_saida_cemep = models.DateField(null=True, blank=True)
    concluido = models.BooleanField(default=False)
    observacoes_gerais = models.TextField(blank=True)

class HistoricoEscolarAnoLetivo(models.Model):
    historico = models.ForeignKey(HistoricoEscolar, on_delete=models.CASCADE)
    ano_letivo = models.PositiveSmallIntegerField()
    nomenclatura_turma = models.CharField(max_length=50)
    numero_turma = models.PositiveSmallIntegerField()
    status_final = models.CharField(max_length=20, choices=[('RETIDO','Retido'),('PROMOVIDO','Promovido')])
    descricao_status = models.CharField(max_length=100)
    observacoes = models.TextField(blank=True)

class HistoricoEscolarNotas(models.Model):
    ano_letivo_ref = models.ForeignKey(HistoricoEscolarAnoLetivo, on_delete=models.CASCADE)
    nome_disciplina = models.CharField(max_length=100)
    carga_horaria = models.PositiveSmallIntegerField()
    nota_final = models.DecimalField(max_digits=4, decimal_places=2)
    frequencia_total = models.PositiveSmallIntegerField()

class OcorrenciaDisciplinarEstudante(models.Model):
    cpf = models.CharField(max_length=14, primary_key=True)
    nome = models.CharField(max_length=255)
    responsavel_nome = models.CharField(max_length=255)
    telefone = models.CharField(max_length=15)
    email = models.EmailField(blank=True)
    endereco_completo = models.TextField()

class OcorrenciaDisciplinar(models.Model):
    estudante = models.ForeignKey(OcorrenciaDisciplinarEstudante, on_delete=models.CASCADE)
    pai_ocorrencia = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)
    autor_nome = models.CharField(max_length=255)
    data_ocorrido = models.DateTimeField()
    data_registro = models.DateTimeField(auto_now_add=True)
    descricao = models.TextField()
    anexos = models.FileField(upload_to='ocorrencias_permanentes/', null=True, blank=True)
```
