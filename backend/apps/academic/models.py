"""
App Academic - Vida Escolar (Estudantes, Matrículas, Responsáveis)
"""
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from apps.core.models import Parentesco, Curso, Turma, UUIDModel
from apps.core.validators import validate_cpf, clean_digits
import re


class Estudante(UUIDModel):
    """Estudante vinculado a um usuário do sistema."""
    
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='estudante'
    )
    cpf = models.CharField(
        max_length=14, 
        unique=True,
        blank=True,
        null=True,
        verbose_name='CPF',
        validators=[validate_cpf],
        help_text='Opcional para dados legados. Único quando preenchido.'
    )
    cin = models.CharField(max_length=20, verbose_name='CIN', blank=True)
    nome_social = models.CharField(max_length=255, blank=True, verbose_name='Nome Social')
    data_nascimento = models.DateField(verbose_name='Data de Nascimento')
    
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
    cidade = models.CharField(max_length=100, default='Paulínia', verbose_name='Cidade')
    estado = models.CharField(max_length=2, default='SP', verbose_name='Estado')
    cep = models.CharField(max_length=8, verbose_name='CEP')
    complemento = models.CharField(max_length=100, blank=True, verbose_name='Complemento')
    telefone = models.CharField(max_length=15, blank=True, verbose_name='Telefone')
    
    class Meta:
        verbose_name = 'Estudante'
        verbose_name_plural = 'Estudantes'
        ordering = ['usuario__first_name', 'usuario__last_name']
    
    def __str__(self):
        nome = self.nome_social or self.usuario.get_full_name()
        return f"{nome} ({self.cpf})"
    
    def save(self, *args, **kwargs):
        if self.cpf:
            self.cpf = clean_digits(self.cpf)
        if self.cep:
            self.cep = clean_digits(self.cep)
        if self.telefone:
            self.telefone = clean_digits(self.telefone)
        super().save(*args, **kwargs)

    @property
    def endereco_completo(self):
        partes = [self.logradouro, self.numero]
        if self.complemento:
            partes.append(self.complemento)
        partes.extend([self.bairro, f"{self.cidade}/{self.estado}", self.cep])
        return ', '.join(partes)

    @property
    def cpf_formatado(self):
        """Retorna o CPF formatado: XXX.XXX.XXX-XX"""
        if not self.cpf or len(self.cpf) != 11:
            return self.cpf
        return f"{self.cpf[:3]}.{self.cpf[3:6]}.{self.cpf[6:9]}-{self.cpf[9:]}"

    @property
    def cep_formatado(self):
        """Retorna o CEP formatado: XX.XXX-XXX"""
        if not self.cep or len(self.cep) != 8:
            return self.cep
        return f"{self.cep[:2]}.{self.cep[2:5]}-{self.cep[5:]}"

    @property
    def telefone_formatado(self):
        """Retorna o telefone formatado: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX"""
        if not self.telefone:
            return ""
        
        # Garante que trabalha apenas com números
        fone = clean_digits(self.telefone)
        
        if len(fone) == 11:
            return f"({fone[:2]}) {fone[2:7]}-{fone[7:]}"
        elif len(fone) == 10:
            return f"({fone[:2]}) {fone[2:6]}-{fone[6:]}"
        return self.telefone


class Responsavel(UUIDModel):
    """Responsável por um ou mais estudantes."""
    
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='responsavel'
    )
    cpf = models.CharField(
        max_length=14, 
        unique=True, 
        verbose_name='CPF',
        validators=[validate_cpf]
    )
    estudantes = models.ManyToManyField(
        Estudante,
        related_name='responsaveis',
        through='ResponsavelEstudante'
    )

    telefone = models.CharField(max_length=15, blank=True, verbose_name='Telefone')
    
    class Meta:
        verbose_name = 'Responsável'
        verbose_name_plural = 'Responsáveis'
    
    def __str__(self):
        return self.usuario.get_full_name()

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
            return ""
        
        # Garante que trabalha apenas com números
        fone = clean_digits(self.telefone)
        
        if len(fone) == 11:
            return f"({fone[:2]}) {fone[2:7]}-{fone[7:]}"
        elif len(fone) == 10:
            return f"({fone[:2]}) {fone[2:6]}-{fone[6:]}"
        return self.telefone


class ResponsavelEstudante(UUIDModel):
    """Tabela intermediária para relacionar Responsável e Estudante com parentesco."""
    
    responsavel = models.ForeignKey(Responsavel, on_delete=models.CASCADE)
    estudante = models.ForeignKey(Estudante, on_delete=models.CASCADE)
    parentesco = models.CharField(
        max_length=20,
        choices=Parentesco.choices,
        verbose_name='Parentesco'
    )
    telefone = models.CharField(max_length=15, blank=True, verbose_name='Telefone de Contato')
    
    class Meta:
        verbose_name = 'Vínculo Responsável-Estudante'
        verbose_name_plural = 'Vínculos Responsáveis-Estudantes'
        unique_together = ['responsavel', 'estudante']
    
    def __str__(self):
        return f"{self.responsavel} - {self.estudante} ({self.get_parentesco_display()})"

    def save(self, *args, **kwargs):
        if self.telefone:
            self.telefone = clean_digits(self.telefone)
        super().save(*args, **kwargs)

    @property
    def telefone_formatado(self):
        """Retorna o telefone formatado: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX"""
        if not self.telefone:
            return ""
        
        # Garante que trabalha apenas com números
        fone = clean_digits(self.telefone)
        
        if len(fone) == 11:
            return f"({fone[:2]}) {fone[2:7]}-{fone[7:]}"
        elif len(fone) == 10:
            return f"({fone[:2]}) {fone[2:6]}-{fone[6:]}"
        return self.telefone


def validate_matricula_digits(value):
    """Valida se a matrícula contém apenas números, podendo terminar com X."""
    if not value:
        raise ValidationError('A matrícula é obrigatória.')
    
    # Remove formatação mas mantém X/x
    clean_value = re.sub(r'[^0-9Xx]', '', str(value))
    
    if not clean_value:
        raise ValidationError('A matrícula deve conter pelo menos um caractere válido.')
    
    # Verifica formato: apenas dígitos, podendo terminar com X
    # Se tem X, deve ser apenas no final
    if 'X' in clean_value.upper():
        # X só pode aparecer na última posição
        if clean_value.upper().index('X') != len(clean_value) - 1:
            raise ValidationError('X só pode aparecer no final da matrícula.')
        # Todos os caracteres antes do X devem ser dígitos
        if not clean_value[:-1].isdigit():
            raise ValidationError('Todos os caracteres antes do X devem ser dígitos.')
    else:
        # Sem X, todos devem ser dígitos
        if not clean_value.isdigit():
            raise ValidationError('A matrícula deve conter apenas números (e opcionalmente X no final).')


class MatriculaCEMEP(UUIDModel):
    """Matrícula central do estudante no CEMEP."""
    
    class Status(models.TextChoices):
        MATRICULADO = 'MATRICULADO', 'Matriculado'
        CONCLUIDO = 'CONCLUIDO', 'Concluído'
        ABANDONO = 'ABANDONO', 'Abandono'
        TRANSFERIDO = 'TRANSFERIDO', 'Transferido'
        OUTRO = 'OUTRO', 'Outro'
    
    numero_matricula = models.CharField(
        max_length=20,
        unique=True,
        verbose_name='Número da Matrícula',
        validators=[validate_matricula_digits],
        help_text='Números, podendo terminar com X. Só pode ser inserido por Gestão ou Secretaria.'
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
    data_entrada = models.DateField(verbose_name='Data de Entrada no Curso')
    data_saida = models.DateField(null=True, blank=True, verbose_name='Data de Saída do Curso')
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
        unique_together = ['estudante', 'curso']
    
    def __str__(self):
        return f"{self.numero_matricula} - {self.estudante} ({self.curso.sigla})"

    def save(self, *args, **kwargs):
        if self.numero_matricula:
            # Remove formatação mas mantém X/x (converte para maiúsculo)
            self.numero_matricula = re.sub(r'[^0-9Xx]', '', str(self.numero_matricula)).upper()
        super().save(*args, **kwargs)

    @property
    def numero_matricula_formatado(self):
        """Retorna a matrícula formatada: XXX.XXX.XXX-X"""
        if not self.numero_matricula or len(self.numero_matricula) != 10:
            return self.numero_matricula
        return f"{self.numero_matricula[:3]}.{self.numero_matricula[3:6]}.{self.numero_matricula[6:9]}-{self.numero_matricula[9:]}"


class MatriculaTurma(UUIDModel):
    """Enturmação - vínculo do estudante com uma turma específica."""
    
    class Status(models.TextChoices):
        CURSANDO = 'CURSANDO', 'Cursando'
        TRANSFERIDO = 'TRANSFERIDO', 'Transferido'
        RETIDO = 'RETIDO', 'Retido'
        PROMOVIDO = 'PROMOVIDO', 'Promovido'
    
    matricula_cemep = models.ForeignKey(
        MatriculaCEMEP,
        on_delete=models.CASCADE,
        related_name='matriculas_turma',
        verbose_name='Matrícula CEMEP'
    )
    turma = models.ForeignKey(
        Turma,
        on_delete=models.CASCADE,
        related_name='matriculas'
    )
    data_entrada = models.DateField(verbose_name='Data de Entrada na Turma')
    data_saida = models.DateField(null=True, blank=True, verbose_name='Data de Saída da Turma')
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.CURSANDO,
        verbose_name='Status'
    )
    
    class Meta:
        verbose_name = 'Matrícula na Turma'
        verbose_name_plural = 'Matrículas nas Turmas'
        ordering = ['-turma__ano_letivo', 'matricula_cemep__estudante__usuario__first_name']
        unique_together = ['matricula_cemep', 'turma']
    
    def clean(self):
        """Validações de integridade da matrícula na turma."""
        # 1. Valida que o curso da matrícula CEMEP é o mesmo da turma
        if hasattr(self, 'matricula_cemep') and hasattr(self, 'turma'):
            if self.matricula_cemep.curso != self.turma.curso:
                raise ValidationError(
                    f"O curso da matrícula CEMEP ({self.matricula_cemep.curso.sigla}) "
                    f"não coincide com o curso da turma ({self.turma.curso.sigla})."
                )
        
        # 2. Valida que a data de saída não é anterior à data de entrada
        if self.data_entrada and self.data_saida:
            if self.data_saida < self.data_entrada:
                raise ValidationError(
                    'A data de saída não pode ser anterior à data de entrada.'
                )
    
    def save(self, *args, **kwargs):
        # Status automático: CURSANDO se data_saida vazia
        if not self.data_saida and self.status != self.Status.CURSANDO:
            self.status = self.Status.CURSANDO
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.matricula_cemep.estudante} - {self.turma}"


class Atestado(UUIDModel):
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
