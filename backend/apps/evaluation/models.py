"""
App Evaluation - Configurações, Avaliações, Notas, Recuperação
"""
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from apps.core.models import Funcionario, ProfessorDisciplinaTurma, UUIDModel, Arquivo, AnoLetivo
from apps.academic.models import Estudante, MatriculaTurma
from django.db.models.signals import m2m_changed
from django.dispatch import receiver


# =============================================================================
# CONSTANTES GLOBAIS
# =============================================================================

VALOR_MAXIMO = Decimal('10.00')
MEDIA_APROVACAO = Decimal('6.00')

BIMESTRE_CHOICES = [
    (1, '1º Bimestre'),
    (2, '2º Bimestre'),
    (3, '3º Bimestre'),
    (4, '4º Bimestre'),
]


# =============================================================================
# CONFIGURAÇÕES DE AVALIAÇÃO
# =============================================================================

class FormaCalculo(models.TextChoices):
    """Opções de forma de cálculo das avaliações."""
    SOMA = 'SOMA', 'Soma'
    MEDIA_PONDERADA = 'MEDIA_PONDERADA', 'Média Ponderada'


class RegraArredondamento(models.TextChoices):
    """
    Regras de arredondamento disponíveis.
    Extensível para novas regras no futuro.
    Ver: Documentation/REGRAS_ARREDONDAMENTO.md
    """
    MATEMATICO_CLASSICO = 'MATEMATICO_CLASSICO', 'Arredondamento Matemático Clássico'
    FAIXAS_MULTIPLOS_05 = 'FAIXAS_MULTIPLOS_05', 'Arredondamento por Faixas (Múltiplos de 0,5)'
    SEMPRE_PARA_CIMA = 'SEMPRE_PARA_CIMA', 'Arredondamento Sempre para Cima (Base Decimal)'
    SEMPRE_PARA_CIMA_05 = 'SEMPRE_PARA_CIMA_05', 'Arredondamento Sempre para Cima (Múltiplos de 0,5)'


class ConfiguracaoAvaliacaoGeral(UUIDModel):
    """
    Configuração geral de avaliação definida pela gestão.
    Única por AnoLetivo.
    
    Nota: VALOR_MAXIMO e MEDIA_APROVACAO são constantes globais do módulo.
    """
    
    ano_letivo = models.OneToOneField(
        'core.AnoLetivo',
        on_delete=models.CASCADE,
        related_name='configuracao_avaliacao',
        verbose_name='Ano Letivo'
    )
    
    # Se True, o professor pode escolher a forma de cálculo
    livre_escolha_professor = models.BooleanField(
        default=True,
        verbose_name='Livre Escolha do Professor',
        help_text='Se marcado, o professor pode escolher a forma de cálculo das avaliações'
    )

    # Forma de cálculo para cada bimestre
    forma_calculo = models.CharField(
        max_length=20,
        choices=FormaCalculo.choices,
        default=FormaCalculo.SOMA,
        verbose_name='Forma de Cálculo'
    )
    
    # Casas decimais para arredondamento (Bimestral)
    numero_casas_decimais_bimestral = models.PositiveSmallIntegerField(
        default=1,
        validators=[MinValueValidator(0), MaxValueValidator(4)],
        verbose_name='Casas Decimais (Bimestral)',
        help_text='Quantidade de casas decimais para arredondamento da nota final do bimestre'
    )
    
    # Casas decimais para arredondamento (Avaliação)
    numero_casas_decimais_avaliacao = models.PositiveSmallIntegerField(
        default=2,
        validators=[MinValueValidator(0), MaxValueValidator(4)],
        verbose_name='Casas Decimais (Avaliação)',
        help_text='Quantidade de casas decimais para arredondamento de cada avaliação individualmente'
    )
    
    # Regra de arredondamento
    regra_arredondamento = models.CharField(
        max_length=30,
        choices=RegraArredondamento.choices,
        default=RegraArredondamento.FAIXAS_MULTIPLOS_05,
        verbose_name='Regra de Arredondamento',
        help_text='Regra utilizada para arredondamento das notas'
    )
    
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Configuração Geral de Avaliação'
        verbose_name_plural = 'Configurações Gerais de Avaliação'
    
    def __str__(self):
        return f"Configuração de Avaliação - {self.ano_letivo.ano}"

    def clean(self):
        from django.core.exceptions import ValidationError
        # Se existir algum registro de Avaliacao nesse mesmo ano_letivo então não pode mais mudar as configurações
        if not self._state.adding:
            if Avaliacao.objects.filter(ano_letivo=self.ano_letivo).exists():
                raise ValidationError(
                    "Não é possível alterar as configurações pois já existem avaliações registradas para este ano letivo."
                )

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Se livre_escolha_professor = False deve atualizar todos os ConfiguracaoAvaliacaoProfessor
        if not self.livre_escolha_professor:
            ConfiguracaoAvaliacaoProfessor.objects.filter(
                ano_letivo=self.ano_letivo
            ).update(
                forma_calculo_1bim=self.forma_calculo,
                forma_calculo_2bim=self.forma_calculo,
                forma_calculo_3bim=self.forma_calculo,
                forma_calculo_4bim=self.forma_calculo,
            )


class ConfiguracaoAvaliacaoProfessor(UUIDModel):
    """
    Configuração de avaliação do professor.
    Única por AnoLetivo e Professor.
    Só existe se a configuração geral permitir livre escolha do professor.
    """
    
    ano_letivo = models.ForeignKey(
        'core.AnoLetivo',
        on_delete=models.CASCADE,
        related_name='configuracoes_avaliacao_professores',
        verbose_name='Ano Letivo'
    )
    
    professor = models.ForeignKey(
        Funcionario,
        on_delete=models.CASCADE,
        related_name='configuracoes_avaliacao',
        verbose_name='Professor'
    )
    
    # Forma de cálculo para cada bimestre
    forma_calculo_1bim = models.CharField(
        max_length=20,
        choices=FormaCalculo.choices,
        default=FormaCalculo.SOMA,
        verbose_name='Forma de Cálculo - 1º Bimestre'
    )
    forma_calculo_2bim = models.CharField(
        max_length=20,
        choices=FormaCalculo.choices,
        default=FormaCalculo.SOMA,
        verbose_name='Forma de Cálculo - 2º Bimestre'
    )
    forma_calculo_3bim = models.CharField(
        max_length=20,
        choices=FormaCalculo.choices,
        default=FormaCalculo.SOMA,
        verbose_name='Forma de Cálculo - 3º Bimestre'
    )
    forma_calculo_4bim = models.CharField(
        max_length=20,
        choices=FormaCalculo.choices,
        default=FormaCalculo.SOMA,
        verbose_name='Forma de Cálculo - 4º Bimestre'
    )
    
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Configuração de Avaliação do Professor'
        verbose_name_plural = 'Configurações de Avaliação dos Professores'
        unique_together = ['ano_letivo', 'professor']
    
    def __str__(self):
        return f"Config. Avaliação - {self.professor} ({self.ano_letivo.ano})"
    
    def get_forma_calculo(self, bimestre: int) -> str:
        """Retorna a forma de cálculo para um bimestre específico."""
        mapa = {
            1: self.forma_calculo_1bim,
            2: self.forma_calculo_2bim,
            3: self.forma_calculo_3bim,
            4: self.forma_calculo_4bim,
        }
        return mapa.get(bimestre, FormaCalculo.SOMA)
    
    def clean(self):
        from django.core.exceptions import ValidationError
        
        # Verifica se existe ConfiguracaoAvaliacaoGeral para o AnoLetivo
        if self.ano_letivo_id:
            try:
                config_geral = ConfiguracaoAvaliacaoGeral.objects.get(
                    ano_letivo=self.ano_letivo
                )
            except ConfiguracaoAvaliacaoGeral.DoesNotExist:
                raise ValidationError(
                    'Não existe configuração geral de avaliação para este ano letivo.'
                )
            
            # Se não é a criação (é edição)
            if not self._state.adding:
                old_instance = ConfiguracaoAvaliacaoProfessor.objects.get(pk=self.pk)
                
                # Identifica quais bimestres mudaram
                changed_bimestres = []
                if self.forma_calculo_1bim != old_instance.forma_calculo_1bim:
                    changed_bimestres.append(1)
                if self.forma_calculo_2bim != old_instance.forma_calculo_2bim:
                    changed_bimestres.append(2)
                if self.forma_calculo_3bim != old_instance.forma_calculo_3bim:
                    changed_bimestres.append(3)
                if self.forma_calculo_4bim != old_instance.forma_calculo_4bim:
                    changed_bimestres.append(4)
                
                if changed_bimestres:
                    # Verifica se tem avaliações do professor nesses bimestres
                    if Avaliacao.objects.filter(
                        ano_letivo=self.ano_letivo,
                        bimestre__in=changed_bimestres,
                        professores_disciplinas_turmas__professor=self.professor
                    ).exists():
                        raise ValidationError(
                            "Não é possível alterar a forma de cálculo para bimestres que já possuem avaliações registradas para este professor."
                        )

    def save(self, *args, **kwargs):
        # Caso livre_escolha_professor = False faça todas as formas de cálculo ficarem como de ConfiguracaoAvaliacaoGeral
        try:
            config_geral = ConfiguracaoAvaliacaoGeral.objects.get(ano_letivo=self.ano_letivo)
            if not config_geral.livre_escolha_professor:
                self.forma_calculo_1bim = config_geral.forma_calculo
                self.forma_calculo_2bim = config_geral.forma_calculo
                self.forma_calculo_3bim = config_geral.forma_calculo
                self.forma_calculo_4bim = config_geral.forma_calculo
        except ConfiguracaoAvaliacaoGeral.DoesNotExist:
            pass
            
        super().save(*args, **kwargs)


# =============================================================================
# AVALIAÇÕES
# =============================================================================


class Avaliacao(UUIDModel):
    """
    Avaliação de uma disciplina em uma turma para um bimestre.
    
    Tipos:
    - AVALIACAO_REGULAR: Várias por bimestre, soma dos valores <= VALOR_MAXIMO
    - AVALIACAO_RECUPERACAO: Uma única por bimestre, valor = VALOR_MAXIMO
    - AVALIACAO_EXTRA: Uma única por bimestre, valor <= VALOR_MAXIMO
    """

    ano_letivo = models.ForeignKey(
        AnoLetivo,
        on_delete=models.CASCADE,
        related_name='avaliacoes',
        verbose_name='Ano Letivo'
    )

    titulo = models.CharField(
        max_length=255,
        verbose_name='Título da Avaliação'

    )

    descricao = models.TextField(
        verbose_name='Descrição da Avaliação',
        null=True,
        blank=True,
    )

    professores_disciplinas_turmas = models.ManyToManyField(
        ProfessorDisciplinaTurma,
        related_name='avaliacoes',
        blank=True,
        verbose_name='Professores/Disciplinas/Turmas'
    )

    valor = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01')), MaxValueValidator(VALOR_MAXIMO)],
        verbose_name='Valor Máximo da Avaliação'
    )

    tipo = models.CharField(
        max_length=30,
        choices=[
            ('AVALIACAO_REGULAR', 'Avaliação Regular'),
            ('AVALIACAO_RECUPERACAO', 'Avaliação de Recuperação'),
            ('AVALIACAO_EXTRA', 'Avaliação Extra'),
        ],
        default='AVALIACAO_REGULAR',
        verbose_name='Tipo de Avaliação'
    )

    bimestre = models.PositiveSmallIntegerField(
        choices=BIMESTRE_CHOICES,
        null=True,
        blank=True,
        verbose_name='Bimestre'
    )

    data_inicio = models.DateField(verbose_name='Data de início da avaliação')
    data_fim = models.DateField(verbose_name='Data de fim da avaliação')
    arquivos = models.ManyToManyField(
        Arquivo,
        blank=True,
        related_name='avaliacoes_model',
        verbose_name='Arquivos'
    )

    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    criado_por = models.ForeignKey(
        get_user_model(),
        on_delete=models.CASCADE,
        related_name='avaliacoes_criadas',
        verbose_name='Criado por'
    )
      
    class Meta:
        verbose_name = 'Avaliação'
        verbose_name_plural = 'Avaliações'
        # Removido unique_together para permitir várias REGULAR por bimestre
    
    def __str__(self):
        return f"{self.titulo} ({self.get_tipo_display()})"


class ControleVisto(UUIDModel):
    """Registro de visto de um estudante."""

    titulo = models.CharField(
        max_length=255,
        verbose_name='Título da Avaliação'

    )

    descricao = models.TextField(
        verbose_name='Descrição da Avaliação',
        null=True,
        blank=True,
    )
    
    matricula_turma = models.ForeignKey(
        MatriculaTurma,
        on_delete=models.CASCADE,
        related_name='vistos'
    )
    professor_disciplina_turma = models.ForeignKey(
        ProfessorDisciplinaTurma,
        on_delete=models.CASCADE,
        related_name='vistos'
    )
    data_visto = models.DateTimeField(auto_now_add=True)
    visto = models.BooleanField(
        null=True, 
        blank=True, 
        default=None,
        verbose_name='Visto',
        help_text='True=Feito, False=Não Feito, Vazio=Não Avaliado'
    )
    bimestre = models.PositiveSmallIntegerField(
        choices=BIMESTRE_CHOICES,
        null=True,
        blank=True,
        verbose_name='Bimestre'
    )
    arquivos = models.ManyToManyField(
        Arquivo,
        blank=True,
        related_name='vistos',
        verbose_name='Arquivos'
    )
    
    class Meta:
        verbose_name = 'Visto'
        verbose_name_plural = 'Vistos'
        unique_together = ['matricula_turma', 'professor_disciplina_turma', 'titulo']
    
    def __str__(self):
        status = 'Sim' if self.visto is True else ('Não' if self.visto is False else 'N/A')
        return f"{self.titulo} - {status}"


# =============================================================================
# NOTAS
# =============================================================================

class NotaAvaliacao(UUIDModel):
    """Nota de um estudante em uma avaliação específica."""
    
    avaliacao = models.ForeignKey(
        Avaliacao,
        on_delete=models.CASCADE,
        related_name='notas'
    )

    matricula_turma = models.ForeignKey(
        MatriculaTurma,
        on_delete=models.CASCADE,
        related_name='notas_avaliacoes'
    )
    
    is_active = models.BooleanField(default=True, verbose_name='Ativa')

    nota = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(VALOR_MAXIMO)],
        verbose_name='Nota'
    )
    
    class Meta:
        verbose_name = 'Nota de Avaliação'
        verbose_name_plural = 'Notas de Avaliações'
        unique_together = ['avaliacao', 'matricula_turma']
    
    def __str__(self):
        return f"{self.avaliacao} - {self.matricula_turma}"

    


class NotaBimestral(UUIDModel):
    """Nota bimestral de um estudante em uma disciplina."""
    
    matricula_turma = models.ForeignKey(
        MatriculaTurma,
        on_delete=models.CASCADE,
        related_name='notas_bimestrais'
    )
    professor_disciplina_turma = models.ForeignKey(
        ProfessorDisciplinaTurma,
        on_delete=models.CASCADE,
        related_name='notas_bimestrais'
    )

    nota_calculo_avaliacoes = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(VALOR_MAXIMO)],
        verbose_name='Nota Calculada pelas Avaliações'
    )

    nota_recuperacao = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(VALOR_MAXIMO)],
        verbose_name='Nota Recuperação'
    )

    nota_final = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(VALOR_MAXIMO)],
        verbose_name='Nota Final'
    )

    fez_recuperacao = models.BooleanField(
        default=False,
        verbose_name='Fez Recuperação'
    )

    bimestre = models.PositiveSmallIntegerField(
        choices=BIMESTRE_CHOICES,
        null=True,
        blank=True,
        verbose_name='Bimestre'
    )
    
    class Meta:
        verbose_name = 'Nota Bimestral'
        verbose_name_plural = 'Notas Bimestrais'
        unique_together = ['matricula_turma', 'professor_disciplina_turma', 'bimestre']
        ordering = ['matricula_turma']
    
    def __str__(self):
        return f"{self.matricula_turma} - {self.professor_disciplina_turma.disciplina_turma.disciplina}"
    
    