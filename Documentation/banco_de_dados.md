# Descrição Detalhada do Banco de Dados (Django Models)

Abaixo a estrutura atualizada dos models, refletindo as refatorações recentes (RichText, anexos múltiplos, permissões e ajustes de integridade).

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

    tipo_usuario = models.CharField(max_length=20, choices=TipoUsuario.choices, default=TipoUsuario.ESTUDANTE)
    telefone = models.CharField(max_length=15, blank=True)
    foto = models.ImageField(upload_to='profile_pics/', null=True, blank=True)
    dark_mode = models.BooleanField(default=False)
```

## 2. App `core` (Cadastros Base)

```python
from ckeditor.fields import RichTextField

class Parentesco(models.TextChoices):
    PAI = 'PAI', 'Pai'
    MAE = 'MAE', 'Mãe'
    AVO_M = 'AVO_M', 'Avô(a) Materno'
    AVO_P = 'AVO_P', 'Avô(a) Paterno'
    TIO = 'TIO', 'Tio(a)'
    IRMAO = 'IRMAO', 'Irmão(ã)'
    OUTRO = 'OUTRO', 'Outro'

class Funcionario(models.Model):
    usuario = models.OneToOneField(User, on_delete=models.CASCADE)
    matricula = models.PositiveIntegerField()
    area_atuacao = models.CharField(max_length=100, null=True, blank=True)
    apelido = models.CharField(max_length=50, null=True, blank=True)
    ativo = models.BooleanField(default=True)

class PeriodoTrabalho(models.Model):
    funcionario = models.ForeignKey(Funcionario, on_delete=models.CASCADE)
    data_entrada = models.DateField()
    data_saida = models.DateField(null=True, blank=True)

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
    nomenclatura = models.CharField(max_length=10, choices=Nomenclatura.choices, default=Nomenclatura.ANO)
    curso = models.ForeignKey(Curso, on_delete=models.PROTECT)

class DisciplinaTurma(models.Model):
    disciplina = models.ForeignKey(Disciplina, on_delete=models.CASCADE)
    turma = models.ForeignKey(Turma, on_delete=models.CASCADE)
    aulas_semanais = models.PositiveSmallIntegerField()

class ProfessorDisciplinaTurma(models.Model):
    professor = models.ForeignKey(Funcionario, on_delete=models.CASCADE)
    disciplina_turma = models.ForeignKey(DisciplinaTurma, on_delete=models.CASCADE)

class Bimestre(models.Model):
    numero = models.PositiveSmallIntegerField()
    data_inicio = models.DateField()
    data_fim = models.DateField()
    ano_letivo = models.PositiveSmallIntegerField()

class CalendarioEscolar(models.Model):
    class TipoNaoLetivo(models.TextChoices):
        FERIADO = 'FERIADO', 'Feriado'
        PONTO_FACULTATIVO = 'PONTO_FACULTATIVO', 'Ponto Facultativo'
        RECESSO = 'RECESSO', 'Recesso'
        FERIAS = 'FERIAS', 'Férias'

    data = models.DateField(unique=True)
    ano_letivo = models.PositiveSmallIntegerField()
    letivo = models.BooleanField(default=True)
    tipo = models.CharField(max_length=20, choices=TipoNaoLetivo.choices, null=True, blank=True)
    descricao = models.CharField(max_length=255)

class Habilidade(models.Model):
    codigo = models.CharField(max_length=20, unique=True)
    descricao = RichTextField()
    disciplina = models.ForeignKey(Disciplina, on_delete=models.CASCADE, null=True, blank=True)
```

## 3. App `academic` (Vida Escolar)

```python
class Estudante(models.Model):
    usuario = models.OneToOneField(User, on_delete=models.CASCADE)
    cpf = models.CharField(max_length=14, primary_key=True)
    cin = models.CharField(max_length=20)
    nome_social = models.CharField(max_length=255, blank=True)
    data_nascimento = models.DateField()
    
    # Benefícios e Transporte
    bolsa_familia = models.BooleanField(default=False)
    pe_de_meia = models.BooleanField(default=True)
    usa_onibus = models.BooleanField(default=True)
    linha_onibus = models.CharField(max_length=100, blank=True)
    permissao_sair_sozinho = models.BooleanField(default=False)
    
    # Endereço
    logradouro = models.CharField(max_length=255)
    numero = models.CharField(max_length=10)
    bairro = models.CharField(max_length=100)
    cidade = models.CharField(max_length=100, default='Mogi Guaçu')
    estado = models.CharField(max_length=2, default='SP')
    cep = models.CharField(max_length=8)
    complemento = models.CharField(max_length=100, blank=True)
    telefone = models.CharField(max_length=15, blank=True)

class Responsavel(models.Model):
    usuario = models.OneToOneField(User, on_delete=models.CASCADE)
    cpf = models.CharField(max_length=14, primary_key=True)
    estudantes = models.ManyToManyField(Estudante, through='ResponsavelEstudante')
    telefone = models.CharField(max_length=15, blank=True)

class ResponsavelEstudante(models.Model):
    responsavel = models.ForeignKey(Responsavel, on_delete=models.CASCADE)
    estudante = models.ForeignKey(Estudante, on_delete=models.CASCADE)
    parentesco = models.CharField(max_length=20, choices=Parentesco.choices)
    telefone = models.CharField(max_length=15, blank=True)

class MatriculaCEMEP(models.Model):
    class Status(models.TextChoices):
        MATRICULADO = 'MATRICULADO', 'Matriculado'
        CONCLUIDO = 'CONCLUIDO', 'Concluído'
        ABANDONO = 'ABANDONO', 'Abandono'
        TRANSFERIDO = 'TRANSFERIDO', 'Transferido'
        OUTRO = 'OUTRO', 'Outro'

    numero_matricula = models.CharField(max_length=10, primary_key=True)
    estudante = models.ForeignKey(Estudante, on_delete=models.CASCADE)
    curso = models.ForeignKey(Curso, on_delete=models.PROTECT)
    data_entrada = models.DateField()
    data_saida = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.MATRICULADO)

class MatriculaTurma(models.Model):
    class Status(models.TextChoices):
        CURSANDO = 'CURSANDO', 'Cursando'
        TRANSFERIDO = 'TRANSFERIDO', 'Transferido'
        RETIDO = 'RETIDO', 'Retido'
        PROMOVIDO = 'PROMOVIDO', 'Promovido'

    matricula_cemep = models.ForeignKey(MatriculaCEMEP, on_delete=models.CASCADE)
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
    criado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
```

## 4. App `pedagogical` (Dia a dia e Notas)

```python
from ckeditor.fields import RichTextField

class PlanoAula(models.Model):
    professor = models.ForeignKey(Funcionario, on_delete=models.CASCADE)
    disciplina = models.ForeignKey(Disciplina, on_delete=models.PROTECT)
    turmas = models.ManyToManyField(Turma)
    data_inicio = models.DateField()
    data_fim = models.DateField()
    conteudo = RichTextField()
    habilidades = models.ManyToManyField(Habilidade, blank=True)
    bimestre = models.ForeignKey(Bimestre, on_delete=models.PROTECT, null=True, blank=True)

class Aula(models.Model):
    professor_disciplina_turma = models.ForeignKey(ProfessorDisciplinaTurma, on_delete=models.CASCADE)
    data = models.DateField()
    conteudo = RichTextField()
    numero_aulas = models.PositiveSmallIntegerField(default=1)
    bimestre = models.ForeignKey(Bimestre, on_delete=models.PROTECT, null=True, blank=True)

class Faltas(models.Model):
    aula = models.ForeignKey(Aula, on_delete=models.CASCADE)
    estudante = models.ForeignKey(Estudante, on_delete=models.CASCADE)
    aula_numero = models.PositiveSmallIntegerField()

class DescritorOcorrenciaPedagogica(models.Model):
    gestor = models.ForeignKey(Funcionario, on_delete=models.CASCADE)
    texto = models.CharField(max_length=100)
    ativo = models.BooleanField(default=True)

class OcorrenciaPedagogica(models.Model):
    estudante = models.ForeignKey(Estudante, on_delete=models.CASCADE)
    autor = models.ForeignKey(Funcionario, on_delete=models.CASCADE)
    tipo = models.ForeignKey(DescritorOcorrenciaPedagogica, on_delete=models.PROTECT)
    bimestre = models.ForeignKey(Bimestre, on_delete=models.PROTECT, null=True, blank=True)
    data = models.DateTimeField(auto_now_add=True)

class OcorrenciaResponsavelCiente(models.Model):
    responsavel = models.ForeignKey(Responsavel, on_delete=models.CASCADE)
    ocorrencia = models.ForeignKey(OcorrenciaPedagogica, on_delete=models.CASCADE)
    ciente = models.BooleanField(default=False)
    data_ciencia = models.DateTimeField(null=True, blank=True)

class Avaliacao(models.Model):
    professor_disciplina_turma = models.ForeignKey(ProfessorDisciplinaTurma, on_delete=models.CASCADE)
    bimestre = models.ForeignKey(Bimestre, on_delete=models.PROTECT)
    valor = models.DecimalField(max_digits=4, decimal_places=2)
    tipo = models.CharField(max_length=30, choices=[...], default='AVALIACAO_REGULAR')
    tipo_calculo_instrumentos = models.CharField(max_length=20, choices=[...], default='SOMA')

class InstrumentoAvaliativo(models.Model):
    avaliacao = models.ForeignKey(Avaliacao, on_delete=models.CASCADE)
    titulo = models.CharField(max_length=100)
    data_inicio = models.DateField()
    data_fim = models.DateField()
    usa_vistos = models.BooleanField(default=False)
    peso = models.DecimalField(max_digits=4, decimal_places=2, default=1.00)
    valor = models.DecimalField(max_digits=4, decimal_places=2)

class ControleVisto(models.Model):
    matricula_turma = models.ForeignKey(MatriculaTurma, on_delete=models.CASCADE)
    professor_disciplina_turma = models.ForeignKey(ProfessorDisciplinaTurma, on_delete=models.CASCADE)
    instrumento_avaliativo = models.ForeignKey(InstrumentoAvaliativo, on_delete=models.CASCADE, null=True, blank=True)
    titulo = models.CharField(max_length=100)
    visto = models.BooleanField(null=True, blank=True, default=None)

class NotaInstrumentoAvaliativo(models.Model):
    instrumento_avaliativo = models.ForeignKey(InstrumentoAvaliativo, on_delete=models.CASCADE)
    matricula_turma = models.ForeignKey(MatriculaTurma, on_delete=models.CASCADE)
    valor = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)

class NotaAvaliacao(models.Model):
    avaliacao = models.ForeignKey(Avaliacao, on_delete=models.CASCADE)
    matricula_turma = models.ForeignKey(MatriculaTurma, on_delete=models.CASCADE)
    valor = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)

class NotaBimestral(models.Model):
    matricula_turma = models.ForeignKey(MatriculaTurma, on_delete=models.CASCADE)
    professor_disciplina_turma = models.ForeignKey(ProfessorDisciplinaTurma, on_delete=models.CASCADE)
    bimestre = models.ForeignKey(Bimestre, on_delete=models.PROTECT)
    nota = models.DecimalField(max_digits=4, decimal_places=2)

class NotificacaoRecuperacao(models.Model):
    estudante = models.ForeignKey(Estudante, on_delete=models.CASCADE)
    professor_disciplina_turma = models.ForeignKey(ProfessorDisciplinaTurma, on_delete=models.CASCADE)
    visualizado = models.BooleanField(default=False)
```

## 5. App `management` (Agenda e Tarefas)

```python
from ckeditor.fields import RichTextField

class Tarefa(models.Model):
    titulo = models.CharField(max_length=200)
    descricao = RichTextField(blank=True)
    prazo = models.DateTimeField()
    funcionarios = models.ManyToManyField(Funcionario)
    concluido = models.BooleanField(default=False)
    criador = models.ForeignKey(User, on_delete=models.CASCADE)

class TarefaAnexo(models.Model):
    tarefa = models.ForeignKey(Tarefa, on_delete=models.CASCADE)
    arquivo = models.FileField(upload_to=get_anexo_path)
    descricao = models.CharField(max_length=100, blank=True)

class TarefaResposta(models.Model):
    tarefa = models.ForeignKey(Tarefa, on_delete=models.CASCADE)
    funcionario = models.ForeignKey(Funcionario, on_delete=models.CASCADE)
    texto = RichTextField(blank=True)
    data_envio = models.DateTimeField(auto_now_add=True)

class TarefaRespostaAnexo(models.Model):
    resposta = models.ForeignKey(TarefaResposta, on_delete=models.CASCADE)
    arquivo = models.FileField(upload_to=get_anexo_path)

class NotificacaoTarefa(models.Model):
    tarefa = models.ForeignKey(Tarefa, on_delete=models.CASCADE)
    funcionario = models.ForeignKey(Funcionario, on_delete=models.CASCADE)
    visualizado = models.BooleanField(default=False)

class ReuniaoHTPC(models.Model):
    data_reuniao = models.DateTimeField()
    pauta = RichTextField()
    ata = RichTextField(blank=True)
    presentes = models.ManyToManyField(Funcionario, blank=True)
    quem_registrou = models.ForeignKey(User, on_delete=models.CASCADE)

class ReuniaoHTPCAnexo(models.Model):
    reuniao = models.ForeignKey(ReuniaoHTPC, on_delete=models.CASCADE)
    arquivo = models.FileField(upload_to=get_anexo_path)

class NotificacaoHTPC(models.Model):
    reuniao = models.ForeignKey(ReuniaoHTPC, on_delete=models.CASCADE)
    funcionario = models.ForeignKey(Funcionario, on_delete=models.CASCADE)
    visualizado = models.BooleanField(default=False)

class Aviso(models.Model):
    titulo = models.CharField(max_length=200)
    texto = RichTextField()
    criador = models.ForeignKey(Funcionario, on_delete=models.CASCADE)
    destinatarios = models.ManyToManyField(User)

class AvisoAnexo(models.Model):
    aviso = models.ForeignKey(Aviso, on_delete=models.CASCADE)
    arquivo = models.FileField(upload_to=get_anexo_path)

class AvisoVisualizacao(models.Model):
    aviso = models.ForeignKey(Aviso, on_delete=models.CASCADE)
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    visualizado = models.BooleanField(default=False)
```

## 6. App `permanent` (Histórico e Registros Imutáveis)

```python
from ckeditor.fields import RichTextField

class DadosPermanenteEstudante(models.Model):
    cpf = models.CharField(max_length=14, primary_key=True)
    nome = models.CharField(max_length=255)
    data_nascimento = models.DateField(null=True, blank=True)
    telefone = models.CharField(max_length=15, blank=True)
    email = models.EmailField(blank=True)
    endereco_completo = models.TextField(blank=True)

class DadosPermanenteResponsavel(models.Model):
    estudante = models.ForeignKey(DadosPermanenteEstudante, on_delete=models.CASCADE)
    cpf = models.CharField(max_length=14, primary_key=True)
    nome = models.CharField(max_length=255)
    telefone = models.CharField(max_length=15)
    parentesco = models.CharField(max_length=20, choices=Parentesco.choices, blank=True)

class HistoricoEscolar(models.Model):
    estudante = models.OneToOneField(DadosPermanenteEstudante, on_delete=models.CASCADE)
    numero_matricula = models.CharField(max_length=20)
    nome_curso = models.CharField(max_length=100)
    data_entrada_cemep = models.DateField()
    data_saida_cemep = models.DateField(null=True, blank=True)
    concluido = models.BooleanField(default=False)
    observacoes_gerais = RichTextField(blank=True)

class HistoricoEscolarAnoLetivo(models.Model):
    historico = models.ForeignKey(HistoricoEscolar, on_delete=models.CASCADE)
    ano_letivo = models.PositiveSmallIntegerField()
    nomenclatura_turma = models.CharField(max_length=50)
    numero_turma = models.PositiveSmallIntegerField()
    letra_turma = models.CharField(max_length=1, default='A')
    status_final = models.CharField(max_length=20, choices=[('RETIDO', 'Retido'), ('PROMOVIDO', 'Promovido')])
    observacoes = RichTextField(blank=True)

class HistoricoEscolarNotas(models.Model):
    ano_letivo_ref = models.ForeignKey(HistoricoEscolarAnoLetivo, on_delete=models.CASCADE)
    nome_disciplina = models.CharField(max_length=100)
    aulas_semanais = models.PositiveSmallIntegerField()
    nota_final = models.DecimalField(max_digits=4, decimal_places=2)
    frequencia_total = models.PositiveSmallIntegerField()

class OcorrenciaDisciplinar(models.Model):
    cpf = models.CharField(max_length=14)
    nome_estudante = models.CharField(max_length=255)
    pai_ocorrencia = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)
    autor_nome = models.CharField(max_length=255)
    data_ocorrido = models.DateTimeField()
    descricao = RichTextField()
    ano_letivo = models.PositiveSmallIntegerField(null=True, blank=True)
    bimestre = models.PositiveSmallIntegerField(null=True, blank=True)

class OcorrenciaDisciplinarAnexo(models.Model):
    ocorrencia = models.ForeignKey(OcorrenciaDisciplinar, on_delete=models.CASCADE)
    arquivo = models.FileField(upload_to='ocorrencias_permanentes/')
    descricao = models.CharField(max_length=255, blank=True)
```
