from django.db import models
from django.core.exceptions import ValidationError
from .base import UUIDModel
from .calendario import AnoLetivo
from .disciplina import Disciplina
from .curso import Curso

class HorarioAula(UUIDModel):
    """Horário de aula de referência (grades horárias)."""
    
    class DiaSemana(models.IntegerChoices):
        SEGUNDA = 0, 'Segunda-feira'
        TERCA = 1, 'Terça-feira'
        QUARTA = 2, 'Quarta-feira'
        QUINTA = 3, 'Quinta-feira'
        SEXTA = 4, 'Sexta-feira'
        SABADO = 5, 'Sábado'
        DOMINGO = 6, 'Domingo'

    ano_letivo = models.ForeignKey(
        AnoLetivo,
        on_delete=models.CASCADE,
        related_name='horarios_aula',
        verbose_name='Ano Letivo'
    )
    numero = models.PositiveSmallIntegerField(verbose_name='Número da aula')
    dia_semana = models.PositiveSmallIntegerField(
        choices=DiaSemana.choices,
        verbose_name='Dia da semana'
    )
    hora_inicio = models.TimeField(verbose_name='Hora de início')
    hora_fim = models.TimeField(verbose_name='Hora de fim')
    
    class Meta:
        verbose_name = 'Horário de Aula'
        verbose_name_plural = 'Horários de Aula'
        ordering = ['dia_semana', 'hora_inicio']
        unique_together = ['ano_letivo', 'dia_semana', 'hora_inicio']

    def clean(self):
        if self.hora_inicio and self.hora_fim and self.hora_inicio >= self.hora_fim:
            raise ValidationError('A hora de início não pode ser posterior ou igual à hora de fim.')
            
    def save(self, *args, **kwargs):
        if not self.pk and not self.numero:
            self.numero = 999 
            
        super().save(*args, **kwargs)
        
        horarios = HorarioAula.objects.filter(
            ano_letivo=self.ano_letivo,
            dia_semana=self.dia_semana
        ).order_by('hora_inicio')
        
        for index, horario in enumerate(horarios, start=1):
            if horario.numero != index:
                HorarioAula.objects.filter(pk=horario.pk).update(numero=index)
        
        self._rebuild_all_caches()

    def __str__(self):
        return f"{self.get_dia_semana_display()} - {self.numero}ª Aula ({self.hora_inicio.strftime('%H:%M')} - {self.hora_fim.strftime('%H:%M')})"
        
    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)
        self._rebuild_all_caches()

    def _rebuild_all_caches(self):
        from .turma import Turma, ProfessorDisciplinaTurma
        from .funcionario import Funcionario
        
        for t in Turma.objects.filter(ano_letivo=self.ano_letivo.ano):
            t.build_grade_horaria(save=True)
            
        professores_ids = ProfessorDisciplinaTurma.objects.filter(
            disciplina_turma__turma__ano_letivo=self.ano_letivo.ano
        ).values_list('professor_id', flat=True).distinct()
        
        for p in Funcionario.objects.filter(id__in=professores_ids):
            p.build_grade_horaria(save=True)


class GradeHorariaValidade(UUIDModel):
    """Grade horária com validade."""
    ano_letivo = models.ForeignKey(
        AnoLetivo,
        on_delete=models.CASCADE,
        related_name='validades_grade',
        verbose_name='Ano Letivo'
    )
    turma_numero = models.PositiveSmallIntegerField(verbose_name='Número da Turma')
    turma_letra = models.CharField(max_length=1, verbose_name='Letra da Turma')
    
    data_inicio = models.DateField(verbose_name='Data de início')
    data_fim = models.DateField(verbose_name='Data de fim')

    class Meta:
        verbose_name = 'Vigência de Grade Horária'
        verbose_name_plural = 'Vigências de Grade Horária'
        ordering = ['ano_letivo', 'turma_numero', 'turma_letra', '-data_inicio']

    def clean(self):
        if self.data_inicio and self.data_fim:
            if self.data_inicio > self.data_fim:
                raise ValidationError('A data de início deve ser menor ou igual à data de fim.')
            
            sobreposicoes = GradeHorariaValidade.objects.filter(
                ano_letivo=self.ano_letivo,
                turma_numero=self.turma_numero,
                turma_letra=self.turma_letra,
                data_inicio__lte=self.data_fim,
                data_fim__gte=self.data_inicio
            )
            if self.pk:
                sobreposicoes = sobreposicoes.exclude(pk=self.pk)
            
            if sobreposicoes.exists():
                raise ValidationError('Já existe uma vigência de grade horária para este período e grupo de turmas.')

    def __str__(self):
        return f"{self.turma_numero}{self.turma_letra} ({self.data_inicio.strftime('%d/%m')} a {self.data_fim.strftime('%d/%m')})"

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
        self._rebuild_turmas()

    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)
        self._rebuild_turmas()
        
    def _rebuild_turmas(self):
        from .turma import Turma
        turmas = Turma.objects.filter(
            ano_letivo=self.ano_letivo.ano,
            numero=self.turma_numero,
            letra=self.turma_letra
        )
        for t in turmas:
            t.build_grade_horaria(save=True)


class GradeHoraria(UUIDModel):
    """Item da grade horária (Aula específica em um dia/hora)."""
    validade = models.ForeignKey(
        GradeHorariaValidade,
        on_delete=models.CASCADE,
        related_name='itens_grade',
        null=True,
        blank=True,
        verbose_name='Vigência'
    )
    horario_aula = models.ForeignKey(
        HorarioAula, 
        on_delete=models.CASCADE, 
        related_name='grades_horarias', 
        verbose_name='Horário de Aula'
    )
    disciplina = models.ForeignKey(
        Disciplina, 
        on_delete=models.CASCADE, 
        related_name='grades_horarias', 
        verbose_name='Disciplina'
    )

    curso = models.ForeignKey(
        Curso, 
        on_delete=models.CASCADE, 
        related_name='grades_horarias', 
        verbose_name='Curso'
    )

    class Meta:
        verbose_name = 'Item de Grade Horária'
        verbose_name_plural = 'Itens de Grade Horária'
        unique_together = ['validade', 'horario_aula']
        ordering = ['horario_aula__dia_semana', 'horario_aula__hora_inicio']

    def clean(self):
        from .turma import Turma
        if self.validade_id and self.horario_aula_id:
            ano_validade = self.validade.ano_letivo.ano
            ano_horario = self.horario_aula.ano_letivo.ano
            
            if ano_validade != ano_horario:
                raise ValidationError(f'O horário de aula ({ano_horario}) deve ser do mesmo ano letivo da validade ({ano_validade}).')
            
            if self.disciplina_id:
                turma = Turma.objects.filter(
                    ano_letivo=ano_validade,
                    numero=self.validade.turma_numero,
                    letra=self.validade.turma_letra,
                    disciplinas_vinculadas__disciplina=self.disciplina
                ).first()
                
                if not turma:
                     raise ValidationError(
                        f'A disciplina {self.disciplina.sigla} não está vinculada a nenhuma turma '
                        f'do grupo {self.validade.turma_numero}{self.validade.turma_letra} no ano {ano_validade}.'
                    )

    def save(self, *args, **kwargs):
        from .turma import Turma
        if self.validade_id and self.disciplina_id:
            turma = Turma.objects.filter(
                ano_letivo=self.validade.ano_letivo.ano,
                numero=self.validade.turma_numero,
                letra=self.validade.turma_letra,
                disciplinas_vinculadas__disciplina=self.disciplina
            ).select_related('curso').first()
            
            if turma:
                self.curso = turma.curso

        self.clean()
        super().save(*args, **kwargs)
        self._rebuild_afetados()

    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)
        self._rebuild_afetados()

    def _rebuild_afetados(self):
        from .turma import Turma, ProfessorDisciplinaTurma
        if not self.validade:
            return
            
        turmas = Turma.objects.filter(
            ano_letivo=self.validade.ano_letivo.ano,
            numero=self.validade.turma_numero,
            letra=self.validade.turma_letra
        )
        for t in turmas:
            t.build_grade_horaria(save=True)
            
        pdts = ProfessorDisciplinaTurma.objects.filter(
            disciplina_turma__turma__in=turmas,
            disciplina_turma__disciplina=self.disciplina
        ).select_related('professor')
        
        professores = set(pdt.professor for pdt in pdts)
        for p in professores:
            p.build_grade_horaria(save=True)

    def __str__(self):
        return f"{self.validade} - {self.horario_aula} - {self.disciplina.sigla}"
