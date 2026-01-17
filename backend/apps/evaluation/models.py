from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from apps.core.models import Funcionario, DisciplinaTurma, ProfessorDisciplinaTurma, UUIDModel, Arquivo, AnoLetivo, Habilidade, Disciplina
from apps.academic.models import Estudante, MatriculaTurma
from django.db.models.signals import m2m_changed, post_delete
from django.dispatch import receiver
from .config import BIMESTRE_CHOICES, OPCOES_FORMA_CALCULO

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

    bimestre = models.PositiveSmallIntegerField(
        choices=BIMESTRE_CHOICES,
        verbose_name='Bimestre'
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
        max_digits=10,
        decimal_places=5,
        validators=[
            MinValueValidator(Decimal('0.00')), 
            MaxValueValidator(999.9)
        ],
        verbose_name='Valor Máximo da Avaliação',
        default=Decimal('10.0'),
    )

    peso = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        validators=[
            MinValueValidator(Decimal('0.1')), 
            MaxValueValidator(Decimal('999.9'))
        ],
        verbose_name='Peso da Avaliação',
        default=Decimal('1.0'),
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

    data_inicio = models.DateField(verbose_name='Data de início da avaliação')
    data_fim = models.DateField(verbose_name='Data de fim da avaliação')
    arquivos = models.ManyToManyField(
        Arquivo,
        blank=True,
        related_name='avaliacoes_model',
        verbose_name='Arquivos'
    )
    habilidades = models.ManyToManyField(
        Habilidade,
        related_name='avaliacoes',
        blank=True
    )

    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    criado_por = models.ForeignKey(
        get_user_model(),
        on_delete=models.CASCADE,
        related_name='avaliacoes_criadas',
        verbose_name='Criado por'
    )

    def is_owner(self, user) -> bool:
        if not user or user.is_anonymous or not user.is_active:
            return False

        return self.criado_por == user

    def is_owner(self, user) -> bool:
        """
        Garante que o usuário seja considerado owner se ele possuir vínculo 
        com TODAS as turmas/disciplinas que esta avaliação abrange.
        Isso permite que múltiplos professores (regente/substituto) sejam 
        owners simultaneamente se ambos compartilharem o mesmo escopo.
        """
        if not user or user.is_anonymous or not user.is_active:
            return False
            
        # Pega a lista de IDs únicos de DisciplinaTurma (o escopo da avaliação)
        dt_ids_escopo = list(self.professores_disciplinas_turmas.values_list(
            'disciplina_turma_id', flat=True
        ).distinct())

        if not dt_ids_escopo:
            return False
            
        # Conta em quantas dessas turmas/disciplinas do escopo o usuário logado está presente
        # através da sua própria atribuição (ProfessorDisciplinaTurma)
        cobertura_usuario = self.professores_disciplinas_turmas.filter(
            professor__usuario=user
        ).values('disciplina_turma_id').distinct().count()
        
        return cobertura_usuario == len(dt_ids_escopo)


      
    class Meta:
        verbose_name = 'Avaliação'
        verbose_name_plural = 'Avaliações'
        # Removido unique_together para permitir várias REGULAR por bimestre
    
    def clean(self):
        from django.core.exceptions import ValidationError
        if self.data_inicio:
            # 1. Valida a integridade do intervalo (Data de início deve ser anterior ou igual à de fim)
            if self.data_fim and self.data_inicio > self.data_fim:
                raise ValidationError("A data de início não pode ser posterior à data de fim.")
            
            # 2. Executa validações de regras de negócio do calendário escolar centralizadas no AnoLetivo:
            # - Garante que exista um Ano Letivo cadastrado para o ano da avaliação.
            # - Garante que a data de início pertença a um bimestre definido.
            # - Garante que o intervalo escolhido possua ao menos um dia letivo (ignora feriados/recessos).
            ano_letivo = AnoLetivo.obter_ano_letivo_da_data(self.data_inicio)
            ano_letivo.validar_periodo_letivo(self.data_inicio, self.data_fim)

            # 3. Verifica se a criação de avaliações está permitida para este ano letivo
            if not self.pk: # Apenas na criação
                config_avaliacao = ano_letivo.controles.get('avaliacao', {})
                if not config_avaliacao.get('pode_criar', False):
                    raise ValidationError(
                        "A criação de novas avaliações está bloqueada para este ano letivo no momento. "
                        "Entre em contato com a secretaria/gestão."
                    )

    def save(self, *args, **kwargs):
        if self.data_inicio:
            # O clean() já garante que ele existe
            self.ano_letivo = AnoLetivo.obter_ano_letivo_da_data(self.data_inicio)
            self.bimestre = self.ano_letivo.bimestre(self.data_inicio)
                
        super().save(*args, **kwargs)

    def delete(self, *args, user=None, **kwargs):
        """
        Sobrescreve delete para garantir que arquivos vinculados 
        também sejam validados pelo usuário que está excluindo.
        """
        # Deleta arquivos vinculados passando o usuário
        # Fazemos uma cópia da lista para evitar problemas de mutação durante o loop
        arquivos_list = list(self.arquivos.all())
        for arquivo in arquivos_list:
            arquivo.delete(user=user)
            
        super().delete(*args, **kwargs)

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

    nota = models.DecimalField(
        max_digits=10,
        decimal_places=5,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(999.9)],
        verbose_name='Nota'
    )

    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    criado_por = models.ForeignKey(
        get_user_model(),
        on_delete=models.CASCADE,
        related_name='notas_avaliacoes_criadas',
        verbose_name='Criado por'
    )

    def is_owner(self, user) -> bool:
        if not user or user.is_anonymous or not user.is_active:
            return False

        return self.criado_por == user
    
    class Meta:
        verbose_name = 'Nota de Avaliação'
        verbose_name_plural = 'Notas de Avaliações'
        unique_together = ['avaliacao', 'matricula_turma']

    def is_owner(self, user):
        return self.avaliacao.is_owner(user)
    
    
    def __str__(self):
        return f"{self.avaliacao} - {self.matricula_turma}"
    
    def clean(self):
        from django.core.exceptions import ValidationError
        
        # 1. Nota não pode exceder o valor máximo da avaliação vinculada
        if self.nota is not None and self.avaliacao_id:
            if self.nota > self.avaliacao.valor:
                raise ValidationError({
                    'nota': f"A nota ({self.nota}) não pode exceder o valor máximo "
                            f"da avaliação ({self.avaliacao.valor})."
                })
        
        # 2. Matrícula deve pertencer a uma turma vinculada à avaliação
        if self.matricula_turma_id and self.avaliacao_id:
            turmas_avaliacao = set(
                self.avaliacao.professores_disciplinas_turmas.values_list(
                    'disciplina_turma__turma_id', flat=True
                )
            )
            if self.matricula_turma.turma_id not in turmas_avaliacao:
                raise ValidationError({
                    'matricula_turma': "O estudante não pertence a uma turma "
                                       "vinculada a esta avaliação."
                })


class NotaBimestral(UUIDModel):
    """Nota bimestral de um estudante em uma disciplina."""

    bimestre = models.PositiveSmallIntegerField(
        choices=BIMESTRE_CHOICES,
        null=True,
        blank=True,
        verbose_name='Bimestre'
    )
    
    matricula_turma = models.ForeignKey(
        MatriculaTurma,
        on_delete=models.CASCADE,
        related_name='notas_bimestrais'
    )
    disciplina = models.ForeignKey(
        Disciplina,
        on_delete=models.CASCADE,
        related_name='notas_bimestrais'
    )

    nota_calculo_avaliacoes = models.DecimalField(
        max_digits=10,
        decimal_places=5,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(999.9)],
        verbose_name='Nota Calculada pelas Avaliações'
    )

    nota_recuperacao = models.DecimalField(
        max_digits=10,
        decimal_places=5,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(999.9)],
        verbose_name='Nota Recuperação'
    )

    nota_final = models.DecimalField(
        max_digits=10,
        decimal_places=5,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(999.9)],
        verbose_name='Nota Final'
    )


    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    criado_por = models.ForeignKey(
        get_user_model(),
        on_delete=models.CASCADE,
        related_name='notas_bimestrais_criadas',
        verbose_name='Criado por'
    )

    def is_owner(self, user) -> bool:
        if not user or user.is_anonymous or not user.is_active:
            return False

        return self.criado_por == user
    
    class Meta:
        verbose_name = 'Nota Bimestral'
        verbose_name_plural = 'Notas Bimestrais'
        unique_together = ['matricula_turma', 'disciplina', 'bimestre']
        ordering = ['matricula_turma']
    
    def is_owner(self, user) -> bool:
        if not user or user.is_anonymous or not user.is_active:
            return False
            
        return ProfessorDisciplinaTurma.objects.filter(
            professor__usuario=user,
            disciplina_turma__disciplina=self.disciplina,
            disciplina_turma__turma=self.matricula_turma.turma
        ).exists()

    def __str__(self):
        return f"{self.matricula_turma} - {self.disciplina}"
    
    def clean(self):
        from django.core.exceptions import ValidationError
        
        # nota_final não pode ser menor que nota_calculo_avaliacoes
        if self.nota_final is not None and self.nota_calculo_avaliacoes is not None:
            if self.nota_final < self.nota_calculo_avaliacoes:
                raise ValidationError({
                    'nota_final': "A nota final não pode ser menor que a nota calculada das avaliações."
                })
    
    # -------------------------------------------------------------------------
    # Properties de Status de Recuperação
    # -------------------------------------------------------------------------
    
    def _get_media_aprovacao(self) -> 'Decimal':
        """Obtém a média de aprovação do ano letivo relacionado."""
        from decimal import Decimal
        cfg = self.matricula_turma.turma.ano_letivo.controles['avaliacao']
        return Decimal(str(cfg['media_aprovacao']))
    
    @property
    def ficou_de_recuperacao(self) -> bool:
        """Retorna True se o aluno ficou de recuperação (nota < média de aprovação)."""
        if self.nota_calculo_avaliacoes is None:
            return False
        return self.nota_calculo_avaliacoes < self._get_media_aprovacao()
    
    @property
    def fez_recuperacao(self) -> bool:
        """Retorna True se o aluno fez a prova de recuperação (existe nota registrada)."""
        return self.nota_recuperacao is not None
    
    @property
    def melhorou_nota(self) -> bool:
        """Retorna True se a nota de recuperação é maior que a nota original."""
        if self.nota_calculo_avaliacoes is None or self.nota_recuperacao is None:
            return False
        return self.nota_recuperacao > self.nota_calculo_avaliacoes
    
    @property
    def recuperou(self) -> bool:
        """Retorna True se o aluno atingiu a média através da recuperação."""
        if self.nota_recuperacao is None:
            return False
        return self.nota_recuperacao >= self._get_media_aprovacao()
    

class AvaliacaoConfigDisciplinaTurma(UUIDModel):
    ano_letivo = models.ForeignKey(
        'core.AnoLetivo',
        on_delete=models.CASCADE,
        related_name='configuracoes_avaliacoes_disciplinas',
        verbose_name='Ano Letivo'
    )
    disciplina_turma = models.ForeignKey(
        DisciplinaTurma,
        on_delete=models.CASCADE,
        related_name='configuracao_avaliacao',
        verbose_name='Disciplina Turma'
    )
    forma_calculo = models.CharField(
        max_length=20, 
        choices=[(k, v) for k, v in OPCOES_FORMA_CALCULO if k != 'LIVRE_ESCOLHA'], 
        default='SOMA',
        verbose_name='Forma de Cálculo'
    )
    pode_alterar = models.BooleanField(
        default=True,
        verbose_name='Pode Alterar'
    )

    class Meta:
        verbose_name = 'Configuração de Avaliação da Disciplina na Turma'
        verbose_name_plural = 'Configurações de Avaliação das Disciplinas nas Turmas'
        unique_together = ['ano_letivo', 'disciplina_turma']

    def is_owner(self, user) -> bool:
        """
        Retorna True se o usuário for um dos professores vinculados 
        a esta DisciplinaTurma e estiver com a conta ativa.
        """
        if not user or user.is_anonymous or not user.is_active:
            return False
            
        return ProfessorDisciplinaTurma.objects.filter(
            disciplina_turma=self.disciplina_turma,
            professor__usuario=user
        ).exists()


    def __str__(self):
        return f"{self.disciplina_turma} - {self.ano_letivo} ({self.forma_calculo})"


@receiver(m2m_changed, sender=Avaliacao.professores_disciplinas_turmas.through)
def bloquear_configuracao_ao_vincular_avaliacao(sender, instance, action, pk_set, **kwargs):
    """
    Quando uma avaliação é vinculada a um ProfessorDisciplinaTurma, 
    bloqueia a alteração da configuração dessa disciplina/turma.
    """
    if action == "post_add":
        for pdt_id in pk_set:
            pdt = ProfessorDisciplinaTurma.objects.get(pk=pdt_id)
            config, created = AvaliacaoConfigDisciplinaTurma.objects.get_or_create(
                ano_letivo=instance.ano_letivo,
                disciplina_turma=pdt.disciplina_turma
            )
            if config.pode_alterar:
                config.pode_alterar = False
                config.save()
