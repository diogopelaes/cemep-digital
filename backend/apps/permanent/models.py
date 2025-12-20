"""
App Permanent - Histórico e Registros Imutáveis
Usa CPF como PK para garantir sobrevivência dos dados após expurgo.
"""
from django.db import models
from apps.core.models import Parentesco


class DadosPermanenteEstudante(models.Model):
    """Dados permanentes do estudante identificados por CPF."""
    
    cpf = models.CharField(max_length=14, primary_key=True, verbose_name='CPF')
    nome = models.CharField(max_length=255, verbose_name='Nome Completo')
    data_nascimento = models.DateField(null=True, blank=True, verbose_name='Data de Nascimento')
    telefone = models.CharField(max_length=15, blank=True, verbose_name='Telefone')
    email = models.EmailField(blank=True, verbose_name='E-mail')
    endereco_completo = models.TextField(blank=True, verbose_name='Endereço Completo')
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Dados Permanentes do Estudante'
        verbose_name_plural = 'Dados Permanentes dos Estudantes'
        ordering = ['nome']
    
    def __str__(self):
        return f"{self.nome} ({self.cpf})"


class DadosPermanenteResponsavel(models.Model):
    """Dados permanentes do responsável vinculado a um estudante."""
    
    estudante = models.ForeignKey(
        DadosPermanenteEstudante,
        on_delete=models.CASCADE,
        related_name='responsaveis'
    )
    cpf = models.CharField(max_length=14, primary_key=True, verbose_name='CPF')
    nome = models.CharField(max_length=255, verbose_name='Nome Completo')
    telefone = models.CharField(max_length=15, verbose_name='Telefone')
    email = models.EmailField(blank=True, verbose_name='E-mail')
    parentesco = models.CharField(
        max_length=20,
        choices=Parentesco.choices,
        blank=True,
        verbose_name='Parentesco'
    )
    
    class Meta:
        verbose_name = 'Dados Permanentes do Responsável'
        verbose_name_plural = 'Dados Permanentes dos Responsáveis'
    
    def __str__(self):
        return f"{self.nome} - Responsável de {self.estudante.nome}"


class HistoricoEscolar(models.Model):
    """Histórico escolar do estudante."""
    
    estudante = models.OneToOneField(
        DadosPermanenteEstudante,
        on_delete=models.CASCADE,
        related_name='historico'
    )
    numero_matricula = models.CharField(max_length=20, verbose_name='Número da Matrícula')
    nome_curso = models.CharField(max_length=100, verbose_name='Nome do Curso')
    data_entrada_cemep = models.DateField(verbose_name='Data de Entrada no CEMEP')
    data_saida_cemep = models.DateField(null=True, blank=True, verbose_name='Data de Saída do CEMEP')
    concluido = models.BooleanField(default=False, verbose_name='Curso Concluído')
    observacoes_gerais = models.TextField(blank=True, verbose_name='Observações Gerais')
    
    class Meta:
        verbose_name = 'Histórico Escolar'
        verbose_name_plural = 'Históricos Escolares'
    
    def __str__(self):
        return f"Histórico de {self.estudante.nome}"


class HistoricoEscolarAnoLetivo(models.Model):
    """Detalhes do histórico por ano letivo."""
    
    STATUS_CHOICES = [
        ('RETIDO', 'Retido'),
        ('PROMOVIDO', 'Promovido'),
    ]
    
    historico = models.ForeignKey(
        HistoricoEscolar,
        on_delete=models.CASCADE,
        related_name='anos_letivos'
    )
    ano_letivo = models.PositiveSmallIntegerField(verbose_name='Ano Letivo')
    nomenclatura_turma = models.CharField(max_length=50, verbose_name='Nomenclatura da Turma')
    numero_turma = models.PositiveSmallIntegerField(verbose_name='Número da Turma')
    letra_turma = models.CharField(max_length=1, default='A', verbose_name='Letra da Turma')
    status_final = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        verbose_name='Status Final'
    )
    descricao_status = models.CharField(max_length=100, verbose_name='Descrição do Status')
    observacoes = models.TextField(blank=True, verbose_name='Observações')
    
    class Meta:
        verbose_name = 'Histórico por Ano Letivo'
        verbose_name_plural = 'Históricos por Ano Letivo'
        ordering = ['ano_letivo']
        unique_together = ['historico', 'ano_letivo']
    
    def __str__(self):
        return f"{self.historico.estudante.nome} - {self.ano_letivo}"


class HistoricoEscolarNotas(models.Model):
    """Notas finais por disciplina no ano letivo."""
    
    ano_letivo_ref = models.ForeignKey(
        HistoricoEscolarAnoLetivo,
        on_delete=models.CASCADE,
        related_name='notas'
    )
    nome_disciplina = models.CharField(max_length=100, verbose_name='Nome da Disciplina')
    aulas_semanais = models.PositiveSmallIntegerField(verbose_name='Aulas Semanais')
    nota_final = models.DecimalField(max_digits=4, decimal_places=2, verbose_name='Nota Final')
    frequencia_total = models.PositiveSmallIntegerField(
        verbose_name='Frequência Total (%)',
        help_text='Porcentagem de frequência'
    )
    
    class Meta:
        verbose_name = 'Nota Final do Histórico'
        verbose_name_plural = 'Notas Finais do Histórico'
        ordering = ['nome_disciplina']
    
    def __str__(self):
        return f"{self.nome_disciplina} - {self.nota_final}"


class OcorrenciaDisciplinar(models.Model):
    """Ocorrência disciplinar permanente (grave)."""
    
    cpf = models.CharField(max_length=14, db_index=True, verbose_name='CPF do Estudante')
    nome_estudante = models.CharField(max_length=255, verbose_name='Nome do Estudante')
    pai_ocorrencia = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='filhas',
        verbose_name='Ocorrência Pai'
    )
    autor_nome = models.CharField(max_length=255, verbose_name='Nome do Autor')
    data_ocorrido = models.DateTimeField(verbose_name='Data do Ocorrido')
    data_registro = models.DateTimeField(auto_now_add=True, verbose_name='Data do Registro')
    descricao = models.TextField(verbose_name='Descrição')
    anexos = models.FileField(
        upload_to='ocorrencias_permanentes/',
        null=True,
        blank=True,
        verbose_name='Anexos'
    )
    
    class Meta:
        verbose_name = 'Ocorrência Disciplinar'
        verbose_name_plural = 'Ocorrências Disciplinares'
        ordering = ['-data_ocorrido']
    
    def __str__(self):
        return f"Ocorrência - {self.nome_estudante} ({self.data_ocorrido.strftime('%d/%m/%Y')})"

