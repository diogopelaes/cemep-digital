from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError
from .base import UUIDModel
from ..validators import validate_cpf

class Funcionario(UUIDModel):
    """Funcionário vinculado a um usuário do sistema."""
    
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='funcionario'
    )
    matricula = models.PositiveIntegerField(
        unique=False,
        verbose_name='Nº Matrícula',
        help_text='Número de matrícula do funcionário'
    )
    area_atuacao = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        default=None,
        verbose_name='Área de Atuação'
    )
    apelido = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        default=None,
        unique=True,
        verbose_name='Apelido'
    )
    cpf = models.CharField(
        max_length=14, 
        unique=True,
        null=True,
        blank=True,
        verbose_name='CPF',
        validators=[validate_cpf]
    )
    cin = models.CharField(max_length=20, verbose_name='CIN', blank=True)
    nome_social = models.CharField(max_length=255, blank=True, verbose_name='Nome Social')
    data_nascimento = models.DateField(verbose_name='Data de Nascimento', null=True, blank=True)
    
    # Endereço
    logradouro = models.CharField(max_length=255, verbose_name='Logradouro', default='')
    numero = models.CharField(max_length=10, verbose_name='Número', default='')
    bairro = models.CharField(max_length=100, verbose_name='Bairro', default='')
    cidade = models.CharField(max_length=100, default='Paulínia', verbose_name='Cidade')
    estado = models.CharField(max_length=2, default='SP', verbose_name='Estado')
    cep = models.CharField(max_length=8, verbose_name='CEP', default='')
    complemento = models.CharField(max_length=100, blank=True, verbose_name='Complemento')
    telefone = models.CharField(max_length=15, blank=True, verbose_name='Telefone')
    data_admissao = models.DateField(verbose_name='Data de Admissão', null=True, blank=True)
    
    # Cache da grade horária do professor
    grade_horaria = models.JSONField(
        null=True,
        blank=True,
        default=None,
        verbose_name='Grade Horária (Cache)',
        help_text='Grade horária do professor gerada automaticamente'
    )
    
    class Meta:
        verbose_name = 'Funcionário'
        verbose_name_plural = 'Funcionários'
        ordering = ['usuario__first_name']
        unique_together = ['usuario', 'matricula']

    def get_apelido(self):
        if self.apelido:
            return f"{self.apelido}"
        return self.usuario.get_full_name().split(' ')[0]
    
    def __str__(self):
        if self.area_atuacao:
            return f"{self.usuario.get_full_name()} - {self.area_atuacao}"
        return self.usuario.get_full_name()

    def build_grade_horaria(self, save=True):
        """
        Constrói e atualiza o cache da grade horária do professor.
        """
        from .turma import ProfessorDisciplinaTurma
        from .grade_horaria import HorarioAula, GradeHoraria, GradeHorariaValidade
        
        hoje = timezone.now().date()
        
        # Busca o ano letivo selecionado do usuário vinculado
        ano_letivo_obj = self.usuario.get_ano_letivo_selecionado()
        
        if not ano_letivo_obj:
            self.grade_horaria = None
            if save:
                self.save(update_fields=['grade_horaria'])
            return None
        
        ano_referencia = ano_letivo_obj.ano
        
        # Busca atribuições ativas do professor para verificar disciplinas e turmas
        atribuicoes = ProfessorDisciplinaTurma.objects.filter(
            professor=self,
            disciplina_turma__turma__ano_letivo=ano_referencia
        ).filter(
            models.Q(data_fim__isnull=True) | models.Q(data_fim__gte=hoje)
        ).select_related('disciplina_turma', 'disciplina_turma__turma', 'disciplina_turma__disciplina')

        if not atribuicoes.exists():
            # Estrutura vazia
            self.grade_horaria = {
                'ano_letivo': ano_referencia,
                'matriz': {},
                'horarios': {},
                'aulas': [],
                'gerado_em': timezone.now().isoformat()
            }
            if save:
                 self.save(update_fields=['grade_horaria'])
            return self.grade_horaria

        matriz = {}
        horarios = {}
        aulas_list = []
        
        # Precisamos dos horários de aula para montar a legenda
        todos_horarios = HorarioAula.objects.filter(ano_letivo=ano_letivo_obj)
        horarios_map = {h.id: h for h in todos_horarios}

        for h in todos_horarios:
            if str(h.numero) not in horarios:
                horarios[str(h.numero)] = {
                    'hora_inicio': h.hora_inicio.strftime('%H:%M'),
                    'hora_fim': h.hora_fim.strftime('%H:%M')
                }

        for atribuicao in atribuicoes:
            turma = atribuicao.disciplina_turma.turma
            disciplina = atribuicao.disciplina_turma.disciplina
            
            # Busca validade vigente para esta turma (agora por numero/letra)
            validade = GradeHorariaValidade.objects.filter(
                ano_letivo__ano=turma.ano_letivo,
                turma_numero=turma.numero,
                turma_letra=turma.letra,
                data_inicio__lte=hoje,
                data_fim__gte=hoje
            ).first()

            if not validade:
                continue

            # Busca itens da grade para esta DISCIPLINA nesta VALIDADE
            itens_grade = GradeHoraria.objects.filter(
                validade=validade,
                disciplina=disciplina
            )

            for item in itens_grade:
                # Recupera horário do map (evita query extra)
                horario_aula = horarios_map.get(item.horario_aula_id)
                if not horario_aula:
                    continue

                num_key = str(horario_aula.numero)
                dia_key = str(horario_aula.dia_semana)

                if num_key not in matriz:
                    matriz[num_key] = {}
                
                celula_existente = matriz[num_key].get(dia_key)
                
                texto_turma = turma.sigla
                
                if celula_existente:
                     if texto_turma not in celula_existente['turma_sigla']:
                        celula_existente['turma_sigla'] += f", {texto_turma}"
                        celula_existente['turma_id'] = None
                else:
                    matriz[num_key][dia_key] = {
                        'disciplina_nome': disciplina.nome,
                        'disciplina_sigla': disciplina.sigla,
                        'turma_sigla': texto_turma,
                        'turma_label': f"{turma.numero}{turma.letra}",
                        'curso_sigla': turma.curso.sigla,
                        'turma_id': str(turma.id),
                        'sala': ''
                    }
                
                aulas_list.append({
                    'dia_semana': horario_aula.dia_semana,
                    'numero_aula': horario_aula.numero,
                    'hora_inicio': horario_aula.hora_inicio.strftime('%H:%M'),
                    'hora_fim': horario_aula.hora_fim.strftime('%H:%M'),
                    'disciplina': disciplina.nome,
                    'turma': turma.nome_completo
                })

        self.grade_horaria = {
            'ano_letivo': ano_referencia,
            'matriz': matriz,
            'horarios': horarios,
            'aulas': aulas_list,
            'gerado_em': timezone.now().isoformat()
        }
        
        if save:
            self.save(update_fields=['grade_horaria'])
        
        return self.grade_horaria


class PeriodoTrabalho(UUIDModel):
    """Período de trabalho de um funcionário (permite múltiplos períodos)."""
    
    funcionario = models.ForeignKey(
        Funcionario,
        on_delete=models.CASCADE,
        related_name='periodos_trabalho'
    )
    data_entrada = models.DateField(verbose_name='Data de Entrada')
    data_saida = models.DateField(null=True, blank=True, verbose_name='Data de Saída')
    
    class Meta:
        verbose_name = 'Período de Trabalho'
        verbose_name_plural = 'Períodos de Trabalho'
        ordering = ['-data_entrada']
    
    def clean(self):
        """Valida que não há sobreposição de datas."""
        if self.data_saida and self.data_entrada > self.data_saida:
            raise ValidationError('A data de entrada não pode ser posterior à data de saída.')
        
        # Verifica sobreposição com outros períodos
        periodos = PeriodoTrabalho.objects.filter(funcionario=self.funcionario)
        if self.pk:
            periodos = periodos.exclude(pk=self.pk)
        
        for periodo in periodos:
            if self._sobrepoe(periodo):
                raise ValidationError('Há sobreposição com outro período de trabalho.')
    
    def _sobrepoe(self, outro):
        """Verifica se há sobreposição com outro período."""
        inicio1, fim1 = self.data_entrada, self.data_saida
        inicio2, fim2 = outro.data_entrada, outro.data_saida
        
        if fim1 is None:
            fim1 = models.DateField.max
        if fim2 is None:
            fim2 = models.DateField.max
        
        return inicio1 <= fim2 and inicio2 <= fim1
    
    def __str__(self):
        saida = self.data_saida.strftime('%d/%m/%Y') if self.data_saida else 'Atual'
        return f"{self.funcionario} ({self.data_entrada.strftime('%d/%m/%Y')} - {saida})"
