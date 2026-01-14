from django.db import models
from django.utils import timezone
from .base import UUIDModel
from .funcionario import Funcionario
from .curso import Curso
from .disciplina import Disciplina

class Turma(UUIDModel):
    """Turma de estudantes."""
    
    class Nomenclatura(models.TextChoices):
        SERIE = 'SERIE', 'Série'
        ANO = 'ANO', 'Ano'
        MODULO = 'MODULO', 'Módulo'
    
    numero = models.PositiveSmallIntegerField(verbose_name='Número')
    letra = models.CharField(max_length=1, verbose_name='Letra')
    ano_letivo = models.PositiveSmallIntegerField(verbose_name='Ano Letivo')
    professores_representantes = models.ManyToManyField(
        Funcionario,
        related_name='turmas_representantes',
        verbose_name='Professores Representantes'
    )
    nomenclatura = models.CharField(
        max_length=10,
        choices=Nomenclatura.choices,
        default=Nomenclatura.ANO,
        verbose_name='Nomenclatura'
    )
    curso = models.ForeignKey(
        Curso,
        on_delete=models.PROTECT,
        related_name='turmas',
        verbose_name='Curso'
    )
    is_active = models.BooleanField(default=True, verbose_name='Ativa')
    
    # Cache da grade horária da turma
    grade_horaria = models.JSONField(
        null=True,
        blank=True,
        default=None,
        verbose_name='Grade Horária (Cache)',
        help_text='Grade horária da turma gerada automaticamente'
    )
    
    class Meta:
        verbose_name = 'Turma'
        verbose_name_plural = 'Turmas'
        ordering = ['-ano_letivo', 'numero', 'letra']
        unique_together = ['numero', 'letra', 'ano_letivo', 'curso']
    
    def __str__(self):
        return self.nome_completo
    
    @property
    def nome(self):
        if self.nomenclatura == 'SERIE':
            return f"{self.numero}ª {self.get_nomenclatura_display()} {self.letra}"
        return f"{self.numero}º {self.get_nomenclatura_display()} {self.letra}"
    
    @property
    def sigla(self):
        return f"{self.numero}{self.letra} - {self.curso.sigla}"
    
    @property
    def numero_letra(self):
        return f"{self.numero}{self.letra}"
    
    @property
    def nome_completo(self):
        return f"{self.nome} - {self.curso.sigla}"

    @property
    def get_ano_letivo_object(self):
        from .calendario import AnoLetivo
        return AnoLetivo.objects.get(ano=self.ano_letivo)

    def build_grade_horaria(self, save=True):
        """
        Constrói e atualiza o cache da grade horária da turma.
        """
        from .grade_horaria import GradeHorariaValidade, GradeHoraria
        
        hoje = timezone.now().date()
        
        # Busca a validade vigente para esta turma (por numero/letra)
        validade = GradeHorariaValidade.objects.filter(
            ano_letivo__ano=self.ano_letivo,
            turma_numero=self.numero,
            turma_letra=self.letra,
            data_inicio__lte=hoje,
            data_fim__gte=hoje
        ).first()
        
        if not validade:
            self.grade_horaria = None
            if save:
                self.save(update_fields=['grade_horaria'])
            return None
        
        # Busca os itens da grade dessa validade
        grades = GradeHoraria.objects.filter(
            validade=validade
        ).select_related(
            'horario_aula',
            'disciplina'
        ).order_by('horario_aula__dia_semana', 'horario_aula__hora_inicio')
        
        # Busca disciplinas VINCLULADAS a esta turma específica
        disciplinas_turma_ids = set(
            DisciplinaTurma.objects.filter(turma=self).values_list('disciplina_id', flat=True)
        )

        grades_filtradas = [g for g in grades if g.disciplina_id in disciplinas_turma_ids]
        
        if not grades_filtradas:
            self.grade_horaria = {
                'ano_letivo': self.ano_letivo,
                'validade': validade.data_fim.isoformat(),
                'matriz': {},
                'horarios': {},
                'gerado_em': timezone.now().isoformat()
            }
            if save:
                self.save(update_fields=['grade_horaria'])
            return self.grade_horaria
        
        # Busca os professores das disciplinas desta turma
        professores_map = {}
        disciplinas_turma = DisciplinaTurma.objects.filter(
            turma=self
        ).prefetch_related('professores__professor')
        
        for dt in disciplinas_turma:
            professor_ativo = dt.professores.filter(
                models.Q(data_fim__isnull=True) | models.Q(data_fim__gte=hoje)
            ).order_by(
                models.Case(
                    models.When(tipo='TITULAR', then=0),
                    models.When(tipo='SUBSTITUTO', then=1),
                    models.When(tipo='AUXILIAR', then=2),
                    default=3,
                    output_field=models.IntegerField()
                )
            ).first()
            
            if professor_ativo:
                professores_map[dt.disciplina_id] = professor_ativo.professor.get_apelido()
            else:
                professores_map[dt.disciplina_id] = None
        
        matriz = {}
        horarios = {}
        
        for g in grades_filtradas:
            numero = g.horario_aula.numero
            dia = g.horario_aula.dia_semana
            num_key = str(numero)
            dia_key = str(dia)
            
            if num_key not in matriz:
                matriz[num_key] = {}
            
            matriz[num_key][dia_key] = {
                'disciplina_id': str(g.disciplina.id),
                'disciplina_nome': g.disciplina.nome,
                'disciplina_sigla': g.disciplina.sigla,
                'curso_sigla': g.curso.sigla if g.curso else '',
                'professor_apelido': professores_map.get(g.disciplina_id)
            }
            
            if num_key not in horarios:
                horarios[num_key] = {
                    'hora_inicio': g.horario_aula.hora_inicio.strftime('%H:%M'),
                    'hora_fim': g.horario_aula.hora_fim.strftime('%H:%M')
                }
        
        self.grade_horaria = {
            'ano_letivo': self.ano_letivo,
            'validade': validade.data_fim.isoformat(),
            'matriz': matriz,
            'horarios': horarios,
            'cursos_turmas': { 
                 str(t.id): {'curso_sigla': t.curso.sigla, 'turma_nome': t.nome} 
                 for t in Turma.objects.filter(
                    ano_letivo=self.ano_letivo,
                    numero=self.numero,
                    letra=self.letra
                 ).select_related('curso')
            },
            'gerado_em': timezone.now().isoformat()
        }
        
        if save:
            self.save(update_fields=['grade_horaria'])
        
        return self.grade_horaria


class DisciplinaTurma(UUIDModel):
    """Vínculo entre Disciplina e Turma com carga horária."""
    
    disciplina = models.ForeignKey(
        Disciplina,
        on_delete=models.CASCADE,
        related_name='turmas_vinculadas'
    )
    turma = models.ForeignKey(
        Turma,
        on_delete=models.CASCADE,
        related_name='disciplinas_vinculadas'
    )
    aulas_semanais = models.PositiveSmallIntegerField(verbose_name='Aulas Semanais', default=4)
    
    class Meta:
        verbose_name = 'Disciplina da Turma'
        verbose_name_plural = 'Disciplinas das Turmas'
        unique_together = ['disciplina', 'turma']
    
    def __str__(self):
        return f"{self.disciplina.sigla} - {self.turma} ({self.aulas_semanais} aulas/sem)"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.turma.build_grade_horaria(save=True)

    def delete(self, *args, **kwargs):
        turma = self.turma
        super().delete(*args, **kwargs)
        turma.build_grade_horaria(save=True)


class ProfessorDisciplinaTurma(UUIDModel):
    """Vínculo entre Professor e Disciplina/Turma (atribuição de aulas)."""
    
    class TipoProfessor(models.TextChoices):
        TITULAR = 'TITULAR', 'Titular'
        SUBSTITUTO = 'SUBSTITUTO', 'Substituto'
        AUXILIAR = 'AUXILIAR', 'Auxiliar'
    
    professor = models.ForeignKey(
        Funcionario,
        on_delete=models.CASCADE,
        related_name='atribuicoes'
    )
    disciplina_turma = models.ForeignKey(
        DisciplinaTurma,
        on_delete=models.CASCADE,
        related_name='professores'
    )
    tipo = models.CharField(
        max_length=15,
        choices=TipoProfessor.choices,
        default=TipoProfessor.TITULAR,
        verbose_name='Tipo'
    )
    data_inicio = models.DateField(
        null=True,
        blank=True,
        verbose_name='Data de Início'
    )
    data_fim = models.DateField(
        null=True,
        blank=True,
        verbose_name='Data de Fim'
    )
    
    class Meta:
        verbose_name = 'Atribuição de Professor'
        verbose_name_plural = 'Atribuições de Professores'
        ordering = ['tipo', 'professor__usuario__first_name']
    
    def __str__(self):
        tipo = self.get_tipo_display()
        return f"{self.professor.usuario.get_full_name()} ({tipo}) - {self.disciplina_turma}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        self.professor.build_grade_horaria(save=True)
        self.disciplina_turma.turma.build_grade_horaria(save=True)
        
        if is_new:
            self._criar_configuracao_avaliacao_professor()

    def _criar_configuracao_avaliacao_professor(self):
        """Cria a configuração de avaliação para o professor no ano da turma."""
        try:
            from apps.evaluation.models import ConfiguracaoAvaliacaoProfessor, FormaCalculo
            from .calendario import AnoLetivo
            
            ano_int = self.disciplina_turma.turma.ano_letivo
            ano_letivo_obj = AnoLetivo.objects.filter(ano=ano_int).first()
            
            if ano_letivo_obj:
                ConfiguracaoAvaliacaoProfessor.objects.get_or_create(
                    ano_letivo=ano_letivo_obj,
                    professor=self.professor,
                    defaults={'forma_calculo': FormaCalculo.SOMA}
                )
        except Exception:
            pass

    def delete(self, *args, **kwargs):
        professor = self.professor
        turma = self.disciplina_turma.turma
        super().delete(*args, **kwargs)
        professor.build_grade_horaria(save=True)
        turma.build_grade_horaria(save=True)
