from django.db import models
from django.conf import settings
from apps.core.models import UUIDModel
from apps.core.validators import validate_cpf, clean_digits

class Parentesco(models.TextChoices):
    """Opções de parentesco - compartilhado entre apps."""
    PAI = 'PAI', 'Pai'
    MAE = 'MAE', 'Mãe'
    AVO_M = 'AVO_M', 'Avô(a) Materno'
    AVO_P = 'AVO_P', 'Avô(a) Paterno'
    TIO = 'TIO', 'Tio(a)'
    IRMAO = 'IRMAO', 'Irmão(ã)'
    OUTRO = 'OUTRO', 'Outro'


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
    def data_nascimento_formatada(self):
        if not self.data_nascimento:
            return ""
        return self.data_nascimento.strftime('%d/%m/%Y')

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
