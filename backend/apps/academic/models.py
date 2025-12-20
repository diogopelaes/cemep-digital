"""
App Academic - Vida Escolar (Estudantes, Matrículas, Responsáveis)
"""
from django.db import models
from django.conf import settings
from apps.core.models import Parentesco, Curso, Turma


class Estudante(models.Model):
    """Estudante vinculado a um usuário do sistema."""
    
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='estudante'
    )
    cpf = models.CharField(max_length=14, unique=True, verbose_name='CPF')
    cin = models.CharField(max_length=20, verbose_name='CIN')
    nome_social = models.CharField(max_length=255, blank=True, verbose_name='Nome Social')
    data_nascimento = models.DateField(verbose_name='Data de Nascimento')
    data_entrada = models.DateField(verbose_name='Data de Entrada')
    
    # Benefícios e Transporte
    bolsa_familia = models.BooleanField(default=False, verbose_name='Bolsa Família')
    pe_de_meia = models.BooleanField(default=True, verbose_name='Pé de Meia')
    usa_onibus = models.BooleanField(default=True, verbose_name='Usa Ônibus Escolar')
    linha_onibus = models.CharField(max_length=100, blank=True, verbose_name='Linha do Ônibus')
    permissao_sair_sozinho = models.BooleanField(default=False, verbose_name='Permissão para Sair Sozinho')
    
    # Endereço
    logradouro = models.CharField(max_length=255, verbose_name='Logradouro')
    numero = models.CharField(max_length=10, verbose_name='Número')
    bairro = models.CharField(max_length=100, verbose_name='Bairro')
    cidade = models.CharField(max_length=100, default='Mogi Guaçu', verbose_name='Cidade')
    estado = models.CharField(max_length=2, default='SP', verbose_name='Estado')
    cep = models.CharField(max_length=9, verbose_name='CEP')
    complemento = models.CharField(max_length=100, blank=True, verbose_name='Complemento')
    
    class Meta:
        verbose_name = 'Estudante'
        verbose_name_plural = 'Estudantes'
        ordering = ['usuario__first_name', 'usuario__last_name']
    
    def __str__(self):
        nome = self.nome_social or self.usuario.get_full_name()
        return f"{nome} ({self.cpf})"
    
    @property
    def endereco_completo(self):
        partes = [self.logradouro, self.numero]
        if self.complemento:
            partes.append(self.complemento)
        partes.extend([self.bairro, f"{self.cidade}/{self.estado}", self.cep])
        return ', '.join(partes)


class Responsavel(models.Model):
    """Responsável por um ou mais estudantes."""
    
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='responsavel'
    )
    estudantes = models.ManyToManyField(
        Estudante,
        related_name='responsaveis',
        through='ResponsavelEstudante'
    )
    
    class Meta:
        verbose_name = 'Responsável'
        verbose_name_plural = 'Responsáveis'
    
    def __str__(self):
        return self.usuario.get_full_name()


class ResponsavelEstudante(models.Model):
    """Tabela intermediária para relacionar Responsável e Estudante com parentesco."""
    
    responsavel = models.ForeignKey(Responsavel, on_delete=models.CASCADE)
    estudante = models.ForeignKey(Estudante, on_delete=models.CASCADE)
    parentesco = models.CharField(
        max_length=20,
        choices=Parentesco.choices,
        verbose_name='Parentesco'
    )
    
    class Meta:
        verbose_name = 'Vínculo Responsável-Estudante'
        verbose_name_plural = 'Vínculos Responsáveis-Estudantes'
        unique_together = ['responsavel', 'estudante']
    
    def __str__(self):
        return f"{self.responsavel} - {self.estudante} ({self.get_parentesco_display()})"


class MatriculaCEMEP(models.Model):
    """Matrícula central do estudante no CEMEP."""
    
    class Status(models.TextChoices):
        MATRICULADO = 'MATRICULADO', 'Matriculado'
        CONCLUIDO = 'CONCLUIDO', 'Concluído'
        ABANDONO = 'ABANDONO', 'Abandono'
        TRANSFERIDO = 'TRANSFERIDO', 'Transferido'
        OUTRO = 'OUTRO', 'Outro'
    
    numero_matricula = models.CharField(
        max_length=20,
        primary_key=True,
        verbose_name='Número da Matrícula'
    )
    estudante = models.ForeignKey(
        Estudante,
        on_delete=models.CASCADE,
        related_name='matriculas_cemep'
    )
    curso = models.ForeignKey(
        Curso,
        on_delete=models.PROTECT,
        related_name='matriculas'
    )
    data_entrada = models.DateField(verbose_name='Data de Entrada')
    data_saida = models.DateField(null=True, blank=True, verbose_name='Data de Saída')
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.MATRICULADO,
        verbose_name='Status'
    )
    
    class Meta:
        verbose_name = 'Matrícula CEMEP'
        verbose_name_plural = 'Matrículas CEMEP'
        ordering = ['-data_entrada']
    
    def __str__(self):
        return f"{self.numero_matricula} - {self.estudante} ({self.curso.sigla})"


class MatriculaTurma(models.Model):
    """Enturmação - vínculo do estudante com uma turma específica."""
    
    class Status(models.TextChoices):
        CURSANDO = 'CURSANDO', 'Cursando'
        TRANSFERIDO = 'TRANSFERIDO', 'Transferido'
        RETIDO = 'RETIDO', 'Retido'
        PROMOVIDO = 'PROMOVIDO', 'Promovido'
    
    estudante = models.ForeignKey(
        Estudante,
        on_delete=models.CASCADE,
        related_name='matriculas_turma'
    )
    turma = models.ForeignKey(
        Turma,
        on_delete=models.CASCADE,
        related_name='matriculas'
    )
    data_entrada = models.DateField(verbose_name='Data de Entrada')
    data_saida = models.DateField(null=True, blank=True, verbose_name='Data de Saída')
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.CURSANDO,
        verbose_name='Status'
    )
    
    class Meta:
        verbose_name = 'Matrícula na Turma'
        verbose_name_plural = 'Matrículas nas Turmas'
        ordering = ['-turma__ano_letivo', 'estudante__usuario__first_name']
    
    def save(self, *args, **kwargs):
        # Status automático: CURSANDO se data_saida vazia
        if not self.data_saida and self.status != self.Status.CURSANDO:
            self.status = self.Status.CURSANDO
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.estudante} - {self.turma}"


class Atestado(models.Model):
    """Atestado médico de um usuário."""
    
    usuario_alvo = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='atestados'
    )
    data_inicio = models.DateTimeField(verbose_name='Data/Hora Início')
    data_fim = models.DateTimeField(verbose_name='Data/Hora Fim')
    protocolo_prefeitura = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='Protocolo da Prefeitura'
    )
    arquivo = models.FileField(upload_to='atestados/', verbose_name='Arquivo')
    criado_em = models.DateTimeField(auto_now_add=True)
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='atestados_criados'
    )
    
    class Meta:
        verbose_name = 'Atestado'
        verbose_name_plural = 'Atestados'
        ordering = ['-data_inicio']
    
    def __str__(self):
        return f"Atestado - {self.usuario_alvo} ({self.data_inicio.strftime('%d/%m/%Y')})"

