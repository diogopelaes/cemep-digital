"""
App Permanent - Histórico e Registros Imutáveis
Usa CPF como PK para garantir sobrevivência dos dados após expurgo.
"""
from django.db import models
from apps.core.models import Parentesco, UUIDModel
from apps.core.validators import validate_cpf, clean_digits
from ckeditor.fields import RichTextField


class DadosPermanenteEstudante(UUIDModel):
    """Dados permanentes do estudante identificados por CPF."""
    
    cpf = models.CharField(
        max_length=14, 
        unique=True, 
        verbose_name='CPF',
        validators=[validate_cpf]
    )
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

    def save(self, *args, **kwargs):
        if self.cpf:
            self.cpf = clean_digits(self.cpf)
        if self.telefone:
            self.telefone = clean_digits(self.telefone)
        super().save(*args, **kwargs)

    @property
    def cpf_formatado(self):
        """Retorna o CPF formatado: XXX.XXX.XXX-XX"""
        if not self.cpf or len(self.cpf) != 11:
            return self.cpf
        return f"{self.cpf[:3]}.{self.cpf[3:6]}.{self.cpf[6:9]}-{self.cpf[9:]}"

    @property
    def telefone_formatado(self):
        """Retorna o telefone formatado: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX"""
        if not self.telefone:
            return self.telefone
        
        # Garante que trabalha apenas com números
        fone = clean_digits(self.telefone)
        
        if len(fone) == 11:
            return f"({fone[:2]}) {fone[2:7]}-{fone[7:]}"
        elif len(fone) == 10:
            return f"({fone[:2]}) {fone[2:6]}-{fone[6:]}"
        return self.telefone


class DadosPermanenteResponsavel(UUIDModel):
    """Dados permanentes do responsável vinculado a um estudante."""
    
    estudante = models.ForeignKey(
        DadosPermanenteEstudante,
        on_delete=models.CASCADE,
        related_name='responsaveis'
    )
    cpf = models.CharField(
        max_length=14, 
        unique=True, 
        verbose_name='CPF',
        validators=[validate_cpf]
    )
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

    def save(self, *args, **kwargs):
        if self.cpf:
            self.cpf = clean_digits(self.cpf)
        if self.telefone:
            self.telefone = clean_digits(self.telefone)
        super().save(*args, **kwargs)

    @property
    def cpf_formatado(self):
        """Retorna o CPF formatado: XXX.XXX.XXX-XX"""
        if not self.cpf or len(self.cpf) != 11:
            return self.cpf
        return f"{self.cpf[:3]}.{self.cpf[3:6]}.{self.cpf[6:9]}-{self.cpf[9:]}"

    @property
    def telefone_formatado(self):
        """Retorna o telefone formatado: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX"""
        if not self.telefone:
            return self.telefone
        
        # Garante que trabalha apenas com números
        fone = clean_digits(self.telefone)
        
        if len(fone) == 11:
            return f"({fone[:2]}) {fone[2:7]}-{fone[7:]}"
        elif len(fone) == 10:
            return f"({fone[:2]}) {fone[2:6]}-{fone[6:]}"
        return self.telefone


class HistoricoEscolar(UUIDModel):
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
    observacoes_gerais = RichTextField(blank=True, verbose_name='Observações Gerais')
    
    class Meta:
        verbose_name = 'Histórico Escolar'
        verbose_name_plural = 'Históricos Escolares'
    
    def __str__(self):
        return f"Histórico de {self.estudante.nome}"


class HistoricoEscolarAnoLetivo(UUIDModel):
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
    observacoes = RichTextField(blank=True, verbose_name='Observações')
    
    class Meta:
        verbose_name = 'Histórico por Ano Letivo'
        verbose_name_plural = 'Históricos por Ano Letivo'
        ordering = ['ano_letivo']
        unique_together = ['historico', 'ano_letivo']
    
    def __str__(self):
        return f"{self.historico.estudante.nome} - {self.ano_letivo}"


class HistoricoEscolarNotas(UUIDModel):
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


class RegistroProntuario(UUIDModel):
    """Registro do prontuário."""

    ocorrencia_disciplinar = models.BooleanField(default=True, verbose_name='Ocorrência Disciplinar')
    
    cpf = models.CharField(
        max_length=14, 
        db_index=True, 
        verbose_name='CPF do Estudante',
        validators=[validate_cpf]
    )
    nome_estudante = models.CharField(max_length=255, verbose_name='Nome do Estudante')
    pai_ocorrencia = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='filhas',
        verbose_name='Registro Pai'
    )
    autor_nome = models.CharField(max_length=255, verbose_name='Nome do Autor')
    data_ocorrido = models.DateTimeField(verbose_name='Data da Ocorrência')
    data_registro = models.DateTimeField(auto_now_add=True, verbose_name='Data do Registro')
    descricao = RichTextField(verbose_name='Descrição')
    
    # Snapshot fields (auto-populated)
    ano_letivo = models.PositiveSmallIntegerField(verbose_name='Ano Letivo', null=True, blank=True)
    bimestre = models.PositiveSmallIntegerField(verbose_name='Bimestre', null=True, blank=True)
    
    class Meta:
        verbose_name = 'Registro de Prontuário'
        verbose_name_plural = 'Registros de Prontuário'
        ordering = ['-data_ocorrido']
    
    def __str__(self):
        return f"Registro - {self.nome_estudante} ({self.data_ocorrido.strftime('%d/%m/%Y')})"

    def save(self, *args, **kwargs):
        if self.cpf:
            self.cpf = clean_digits(self.cpf)
        
        super().save(*args, **kwargs)

    @property
    def cpf_formatado(self):
        """Retorna o CPF formatado: XXX.XXX.XXX-XX"""
        if not self.cpf or len(self.cpf) != 11:
            return self.cpf
        return f"{self.cpf[:3]}.{self.cpf[3:6]}.{self.cpf[6:9]}-{self.cpf[9:]}"


class RegistroProntuarioAnexo(models.Model):
    """Anexos para registro do prontuário."""
    
    registro_prontuario = models.ForeignKey(
        RegistroProntuario,
        on_delete=models.CASCADE,
        related_name='anexos'
    )
    arquivo = models.FileField(
        upload_to='registro_prontuario/',
        verbose_name='Arquivo'
    )
    descricao = models.CharField(
        max_length=255, 
        blank=True, 
        verbose_name='Descrição do Anexo'
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Anexo de Registro Prontuário'
        verbose_name_plural = 'Anexos de Registro Prontuário'
    
    def __str__(self):
        return f"Anexo de {self.registro_prontuario} ({self.descricao or 'Sem descrição'})"
