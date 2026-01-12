"""
App Evaluation - Configurações, Avaliações, Notas, Recuperação
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from apps.core.models import Funcionario, ProfessorDisciplinaTurma, UUIDModel
from apps.academic.models import Estudante, MatriculaTurma


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


def soma_valores_avaliacoes_regulares(disciplina_turma, bimestre, excluir_pk=None):
    """
    Calcula a soma dos valores das avaliações regulares para uma disciplina/turma/bimestre.
    
    Args:
        disciplina_turma: Instância de DisciplinaTurma
        bimestre: Número do bimestre (1-4)
        excluir_pk: PK de avaliação a excluir do cálculo (para edição)
    
    Returns:
        Decimal com a soma dos valores
    """
    # Import local para evitar import circular
    from apps.evaluation.models import Avaliacao
    
    qs = Avaliacao.objects.filter(
        professor_disciplina_turma__disciplina_turma=disciplina_turma,
        tipo='AVALIACAO_REGULAR',
        bimestre=bimestre
    )
    if excluir_pk:
        qs = qs.exclude(pk=excluir_pk)
    
    return qs.aggregate(total=models.Sum('valor'))['total'] or Decimal('0.00')



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
        default=RegraArredondamento.MATEMATICO_CLASSICO,
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
            
            # Verifica se permite livre escolha do professor
            if not config_geral.livre_escolha_professor:
                raise ValidationError(
                    'A configuração geral não permite livre escolha do professor. '
                    'Não é necessário criar configuração individual.'
                )


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

    professor_disciplina_turma = models.ForeignKey(
        ProfessorDisciplinaTurma,
        on_delete=models.CASCADE,
        related_name='avaliacoes'
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

    data_inicio = models.DateField(verbose_name='Data de inicio da avaliação')
    data_fim = models.DateField(verbose_name='Data de fim da avaliação')
    
    class Meta:
        verbose_name = 'Avaliação'
        verbose_name_plural = 'Avaliações'
        # Removido unique_together para permitir várias REGULAR por bimestre
    
    def __str__(self):
        return f"{self.professor_disciplina_turma.disciplina_turma.disciplina} ({self.get_tipo_display()})"

    def clean(self):
        """Validações de regras de negócio."""
        from django.core.exceptions import ValidationError

        if self.data_inicio > self.data_fim:
            raise ValidationError(
                'A data de inicio da avaliação não pode ser maior que a data de fim.'
            )
        
        if not self.professor_disciplina_turma_id:
            return
        
        disciplina_turma = self.professor_disciplina_turma.disciplina_turma
        
        # Validação: valor não pode ultrapassar VALOR_MAXIMO
        if self.valor and self.valor > VALOR_MAXIMO:
            raise ValidationError(
                f'O valor da avaliação ({self.valor}) não pode ser maior que {VALOR_MAXIMO}.'
            )
        
        # Validação: soma dos valores das avaliações regulares <= VALOR_MAXIMO
        if self.tipo == 'AVALIACAO_REGULAR' and self.bimestre:
            soma_atual = soma_valores_avaliacoes_regulares(disciplina_turma, self.bimestre, self.pk)
            
            if soma_atual + self.valor > VALOR_MAXIMO:
                raise ValidationError(
                    f'A soma das avaliações regulares ({soma_atual} + {self.valor}) '
                    f'ultrapassa {VALOR_MAXIMO} pontos para esta disciplina/turma/bimestre.'
                )
        
        # Validação: só pode existir UMA avaliação de recuperação por disciplina/turma/bimestre
        if self.tipo == 'AVALIACAO_RECUPERACAO' and self.bimestre:
            qs = Avaliacao.objects.filter(
                professor_disciplina_turma__disciplina_turma=disciplina_turma,
                tipo='AVALIACAO_RECUPERACAO',
                bimestre=self.bimestre
            )
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if qs.exists():
                raise ValidationError(
                    'Já existe uma avaliação de recuperação para esta disciplina/turma/bimestre.'
                )
            
            # Valor da avaliação de recuperação é sempre VALOR_MAXIMO
            if self.valor != VALOR_MAXIMO:
                raise ValidationError(
                    f'O valor da avaliação de recuperação deve ser sempre {VALOR_MAXIMO}.'
                )
            
            # Para criar recuperação, soma das avaliações regulares deve ser = VALOR_MAXIMO
            soma_regulares = soma_valores_avaliacoes_regulares(disciplina_turma, self.bimestre)
            
            if soma_regulares != VALOR_MAXIMO:
                raise ValidationError(
                    f'Para criar avaliação de recuperação, a soma das avaliações regulares '
                    f'deve ser exatamente {VALOR_MAXIMO}. Soma atual: {soma_regulares}.'
                )
        
        # Validação: só pode existir UMA avaliação extra por disciplina/turma/bimestre
        if self.tipo == 'AVALIACAO_EXTRA' and self.bimestre:
            qs = Avaliacao.objects.filter(
                professor_disciplina_turma__disciplina_turma=disciplina_turma,
                tipo='AVALIACAO_EXTRA',
                bimestre=self.bimestre
            )
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if qs.exists():
                raise ValidationError(
                    'Já existe uma avaliação extra para esta disciplina/turma/bimestre.'
                )


class ControleVisto(UUIDModel):
    """Registro de visto de um estudante."""
    
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
    titulo = models.CharField(max_length=100, verbose_name='Título')
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

    def clean(self):
        """Validações de regras de negócio."""
        from django.core.exceptions import ValidationError
        
        # Nota não pode ultrapassar o valor máximo da avaliação
        if self.nota is not None and self.avaliacao_id:
            if self.nota > self.avaliacao.valor:
                raise ValidationError(
                    f'A nota ({self.nota}) não pode ser maior que o valor máximo '
                    f'da avaliação ({self.avaliacao.valor}).'
                )


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
    
    def get_config_geral(self):
        """Retorna a ConfiguracaoAvaliacaoGeral do ano letivo da turma."""
        ano_letivo = self.professor_disciplina_turma.disciplina_turma.turma.ano_letivo
        try:
            return ConfiguracaoAvaliacaoGeral.objects.get(ano_letivo__ano=ano_letivo)
        except ConfiguracaoAvaliacaoGeral.DoesNotExist:
            return None
    
    def get_config_professor(self):
        """Retorna a ConfiguracaoAvaliacaoProfessor do professor, se existir."""
        professor = self.professor_disciplina_turma.professor
        ano_letivo = self.professor_disciplina_turma.disciplina_turma.turma.ano_letivo
        try:
            return ConfiguracaoAvaliacaoProfessor.objects.get(
                ano_letivo__ano=ano_letivo,
                professor=professor
            )
        except ConfiguracaoAvaliacaoProfessor.DoesNotExist:
            return None
    
    def get_forma_calculo(self) -> str:
        """
        Retorna a forma de cálculo para este bimestre.
        Se livre_escolha_professor, usa config do professor. Caso contrário, SOMA padrão.
        """
        if not self.bimestre:
            return FormaCalculo.SOMA
        
        config_geral = self.get_config_geral()
        if not config_geral:
            return FormaCalculo.SOMA
        
        if config_geral.livre_escolha_professor:
            config_prof = self.get_config_professor()
            if config_prof:
                return config_prof.get_forma_calculo(self.bimestre)
        
        return FormaCalculo.SOMA
    
    def fez_recuperacao_status(self) -> tuple:
        """
        Retorna (fez_recuperacao, recuperou).
        - fez_recuperacao: True se há nota de recuperação lançada
        - recuperou: True se a nota de recuperação foi maior que a nota das avaliações
        """
        fez = self.nota_recuperacao is not None
        recuperou = False
        
        if fez and self.nota_calculo_avaliacoes is not None:
            recuperou = self.nota_recuperacao > self.nota_calculo_avaliacoes
        
        return (fez, recuperou)
    
    def calcular_nota_recuperacao(self) -> Decimal | None:
        """Busca a nota da avaliação de recuperação para este bimestre."""
        if not self.bimestre:
            return None
        
        nota_rec = NotaAvaliacao.objects.filter(
            avaliacao__professor_disciplina_turma=self.professor_disciplina_turma,
            avaliacao__tipo='AVALIACAO_RECUPERACAO',
            avaliacao__bimestre=self.bimestre,
            matricula_turma=self.matricula_turma,
            nota__isnull=False
        ).first()
        
        return nota_rec.nota if nota_rec else None
    
    def calcular_nota_avaliacoes(self) -> Decimal | None:
        """
        Calcula nota das avaliações conforme forma de cálculo.
        a) SOMA ou MEDIA_PONDERADA das REGULAR
        b) + EXTRA
        
        Nota: A comparação com RECUPERACAO é feita em atualizar_notas().
        Retorna None se não houver notas lançadas.
        """
        if not self.bimestre:
            return None
        
        # Buscar notas de avaliações regulares
        notas_regular = NotaAvaliacao.objects.filter(
            avaliacao__professor_disciplina_turma=self.professor_disciplina_turma,
            avaliacao__tipo='AVALIACAO_REGULAR',
            avaliacao__bimestre=self.bimestre,
            matricula_turma=self.matricula_turma,
            nota__isnull=False
        ).select_related('avaliacao')
        
        if not notas_regular.exists():
            return None
        
        forma_calculo = self.get_forma_calculo()
        
        # (a) Cálculo de soma ou média ponderada das REGULAR
        if forma_calculo == FormaCalculo.SOMA:
            resultado = sum(n.nota for n in notas_regular)
        else:  # MEDIA_PONDERADA
            soma_ponderada = sum(n.avaliacao.valor * n.nota for n in notas_regular)
            soma_pesos = sum(n.avaliacao.valor for n in notas_regular)
            if soma_pesos > 0:
                resultado = (soma_ponderada / soma_pesos)
            else:
                resultado = Decimal('0.00')
        
        # (b) Somar nota EXTRA se existir
        nota_extra = NotaAvaliacao.objects.filter(
            avaliacao__professor_disciplina_turma=self.professor_disciplina_turma,
            avaliacao__tipo='AVALIACAO_EXTRA',
            avaliacao__bimestre=self.bimestre,
            matricula_turma=self.matricula_turma,
            nota__isnull=False
        ).first()
        
        if nota_extra:
            resultado += nota_extra.nota
        
        # Limitar ao VALOR_MAXIMO
        resultado = min(resultado, VALOR_MAXIMO)
        
        return resultado.quantize(Decimal('0.01'))
    
    def atualizar_notas(self):
        """
        Popula nota_calculo_avaliacoes, nota_recuperacao e fez_recuperacao
        com base nas notas de avaliação lançadas.
        """
        # Calcular nota das avaliações
        self.nota_calculo_avaliacoes = self.calcular_nota_avaliacoes()
        
        # Calcular nota de recuperação
        self.nota_recuperacao = self.calcular_nota_recuperacao()
        
        # Atualizar flag fez_recuperacao
        self.fez_recuperacao = self.nota_recuperacao is not None
        
        # Calcular nota final (maior entre calculada e recuperação)
        if self.nota_calculo_avaliacoes is not None:
            if self.nota_recuperacao is not None:
                self.nota_final = max(self.nota_calculo_avaliacoes, self.nota_recuperacao)
            else:
                self.nota_final = self.nota_calculo_avaliacoes
        elif self.nota_recuperacao is not None:
            self.nota_final = self.nota_recuperacao
        else:
            self.nota_final = None
    
    def clean(self):
        """
        Validações de regras de negócio.
        - Em SOMA: soma dos VALORES das avaliações regulares deve ser = VALOR_MAXIMO
        - Notas não podem ultrapassar VALOR_MAXIMO
        """
        from django.core.exceptions import ValidationError
        
        if not self.professor_disciplina_turma_id or not self.bimestre:
            return
        
        disciplina_turma = self.professor_disciplina_turma.disciplina_turma
        forma_calculo = self.get_forma_calculo()
        
        # Em SOMA: validar que a soma dos VALORES das avaliações regulares = VALOR_MAXIMO
        if forma_calculo == FormaCalculo.SOMA:
            soma_valores = soma_valores_avaliacoes_regulares(disciplina_turma, self.bimestre)
            
            if soma_valores != VALOR_MAXIMO:
                raise ValidationError(
                    f'Para o cálculo por SOMA, a soma dos valores das avaliações regulares '
                    f'deve ser exatamente {VALOR_MAXIMO}. Soma atual: {soma_valores}.'
                )
        
        # Notas não podem ultrapassar VALOR_MAXIMO
        if self.nota_final is not None and self.nota_final > VALOR_MAXIMO:
            raise ValidationError(
                f'A nota final ({self.nota_final}) não pode ser maior que {VALOR_MAXIMO}.'
            )


