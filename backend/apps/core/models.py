"""
App Core - Cadastros Base (Funcionários, Cursos, Turmas, Disciplinas, Calendário)
"""
import uuid
from django.db import models
from django.utils import timezone
from django.conf import settings
from django.core.exceptions import ValidationError
from ckeditor.fields import RichTextField
from .validators import validate_cpf


class UUIDModel(models.Model):
    """Classe base para usar UUID como chave primária."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class Parentesco(models.TextChoices):
    """Opções de parentesco - compartilhado entre apps."""
    PAI = 'PAI', 'Pai'
    MAE = 'MAE', 'Mãe'
    AVO_M = 'AVO_M', 'Avô(a) Materno'
    AVO_P = 'AVO_P', 'Avô(a) Paterno'
    TIO = 'TIO', 'Tio(a)'
    IRMAO = 'IRMAO', 'Irmão(ã)'
    OUTRO = 'OUTRO', 'Outro'


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
        
        Busca todas as aulas vigentes (baseado na data atual) a partir de:
        1. ProfessorDisciplinaTurma (atribuições ativas)
        2. GradeHorariaValidade (vigências no período atual)
        3. GradeHoraria (itens de grade vinculados)
        
        O ano letivo é determinado pelo ano letivo selecionado do usuário
        (via get_ano_letivo_selecionado).
        
        Args:
            save: Se True, salva o modelo após atualizar. Default True.
            
        Returns:
            dict: A grade horária gerada, ou None se não houver ano letivo.
            
        Estrutura do JSON retornado:
        {
            "ano_letivo": 2026,
            "matriz": {
                "1": {  # número da aula (linha)
                    "0": {...},  # Segunda (coluna)
                    "1": {...},  # Terça
                    ...
                },
                ...
            },
            "horarios": {
                "1": {"hora_inicio": "07:30", "hora_fim": "08:20"},
                ...
            },
            "aulas": [...],  # lista flat para outros usos
            "gerado_em": "..."
        }
        """
        from django.utils import timezone
        
        hoje = timezone.now().date()
        
        # Busca o ano letivo selecionado do usuário vinculado
        ano_letivo_obj = self.usuario.get_ano_letivo_selecionado()
        
        if not ano_letivo_obj:
            self.grade_horaria = None
            if save:
                self.save(update_fields=['grade_horaria'])
            return None
        
        ano_referencia = ano_letivo_obj.ano
        
        # Busca atribuições ativas do professor
        # (ativas = sem data_fim ou data_fim >= hoje)
        atribuicoes = ProfessorDisciplinaTurma.objects.filter(
            professor=self,
            disciplina_turma__turma__ano_letivo=ano_referencia
        ).filter(
            models.Q(data_fim__isnull=True) | models.Q(data_fim__gte=hoje)
        ).select_related(
            'disciplina_turma__turma__curso',
            'disciplina_turma__disciplina'
        )
        
        if not atribuicoes.exists():
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
        
        # Mapeia turma_id + disciplina_id para buscar nas grades
        turma_disciplina_map = {}
        for attr in atribuicoes:
            key = (attr.disciplina_turma.turma_id, attr.disciplina_turma.disciplina_id)
            turma_disciplina_map[key] = attr.disciplina_turma
        
        turmas_ids = list(set(k[0] for k in turma_disciplina_map.keys()))
        disciplinas_ids = list(set(k[1] for k in turma_disciplina_map.keys()))
        
        # Busca validades vigentes para essas turmas
        validades_vigentes = GradeHorariaValidade.objects.filter(
            turma_id__in=turmas_ids,
            data_inicio__lte=hoje,
            data_fim__gte=hoje
        ).select_related('turma__curso')
        
        if not validades_vigentes.exists():
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
        
        # Busca itens de grade dessas validades que tenham as disciplinas do professor
        grades = GradeHoraria.objects.filter(
            validade__in=validades_vigentes,
            disciplina_id__in=disciplinas_ids
        ).select_related(
            'horario_aula',
            'disciplina',
            'validade__turma__curso'
        ).order_by('horario_aula__dia_semana', 'horario_aula__hora_inicio')
        
        aulas = []
        matriz = {}  # {numero_aula: {dia_semana: dados}}
        horarios = {}  # {numero_aula: {hora_inicio, hora_fim}}
        
        for g in grades:
            # Verifica se essa combinação turma+disciplina pertence ao professor
            key = (g.validade.turma_id, g.disciplina_id)
            if key not in turma_disciplina_map:
                continue
                
            turma = g.validade.turma
            numero = g.horario_aula.numero
            dia = g.horario_aula.dia_semana
            
            aula_data = {
                'horario_aula_id': str(g.horario_aula.id),
                'dia_semana': dia,
                'dia_semana_display': g.horario_aula.get_dia_semana_display(),
                'numero': numero,
                'hora_inicio': g.horario_aula.hora_inicio.strftime('%H:%M'),
                'hora_fim': g.horario_aula.hora_fim.strftime('%H:%M'),
                'turma_id': str(turma.id),
                'turma_nome': f"{turma.numero}{turma.letra}",
                'curso_sigla': turma.curso.sigla,
                'disciplina_id': str(g.disciplina.id),
                'disciplina_sigla': g.disciplina.sigla,
                'validade': g.validade.data_fim.isoformat()
            }
            
            aulas.append(aula_data)
            
            # Monta matriz para renderização de tabela
            num_key = str(numero)
            dia_key = str(dia)
            
            if num_key not in matriz:
                matriz[num_key] = {}
            
            # Dados resumidos para a célula da matriz
            matriz[num_key][dia_key] = {
                'turma_nome': f"{turma.numero}{turma.letra}",
                'curso_sigla': turma.curso.sigla,
                'disciplina_sigla': g.disciplina.sigla,
                'validade': g.validade.data_fim.isoformat()
            }
            
            # Registra horários por número de aula (para legenda das linhas)
            if num_key not in horarios:
                horarios[num_key] = {
                    'hora_inicio': g.horario_aula.hora_inicio.strftime('%H:%M'),
                    'hora_fim': g.horario_aula.hora_fim.strftime('%H:%M')
                }
        
        self.grade_horaria = {
            'ano_letivo': ano_referencia,
            'matriz': matriz,
            'horarios': horarios,
            'aulas': aulas,
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


class Disciplina(UUIDModel):
    """Disciplina do currículo escolar."""
    
    class AreaConhecimento(models.TextChoices):
        LINGUAGENS = 'LINGUAGENS', 'Linguagens e suas Tecnologias'
        MATEMATICA = 'MATEMATICA', 'Matemática e suas Tecnologias'
        CIENCIAS_NATUREZA = 'CIENCIAS_NATUREZA', 'Ciências da Natureza e suas Tecnologias'
        CIENCIAS_HUMANAS = 'CIENCIAS_HUMANAS', 'Ciências Humanas e Sociais Aplicadas'
        TEC_INFORMATICA = 'TEC_INFORMATICA', 'Técnico em Informática'
        TEC_QUIMICA = 'TEC_QUIMICA', 'Técnico em Química'
        TEC_ENFERMAGEM = 'TEC_ENFERMAGEM', 'Técnico em Enfermagem'
    
    nome = models.CharField(max_length=100, verbose_name='Nome', unique=True)
    sigla = models.CharField(max_length=10, verbose_name='Sigla', unique=True)
    area_conhecimento = models.CharField(
        max_length=20,
        choices=AreaConhecimento.choices,
        null=True,
        blank=True,
        verbose_name='Área de Conhecimento'
    )
    habilidades = models.ManyToManyField(
        'Habilidade',
        related_name='disciplinas',
        blank=True,
        verbose_name='Habilidades BNCC'
    )
    is_active = models.BooleanField(default=True, verbose_name='Ativa')
    
    class Meta:
        verbose_name = 'Disciplina'
        verbose_name_plural = 'Disciplinas'
        ordering = ['nome']
    
    def __str__(self):
        return f"{self.nome} ({self.sigla})"


class Curso(UUIDModel):
    """Curso oferecido pela escola."""
    
    nome = models.CharField(max_length=100, unique=True, verbose_name='Nome')
    sigla = models.CharField(max_length=10, unique=True, verbose_name='Sigla')
    is_active = models.BooleanField(default=True, verbose_name='Ativa')
    
    class Meta:
        verbose_name = 'Curso'
        verbose_name_plural = 'Cursos'
        ordering = ['nome']

    def __str__(self):
        return f"{self.nome} ({self.sigla})"


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
    def nome_completo(self):
        return f"{self.nome} - {self.curso.sigla}"

    @property
    def get_ano_letivo_object(self):
        return AnoLetivo.objects.get(ano=self.ano_letivo)

    def build_grade_horaria(self, save=True):
        """
        Constrói e atualiza o cache da grade horária da turma.
        
        Busca a grade vigente (baseada na data atual) e monta uma matriz
        com disciplinas e professores para renderização em tabela.
        
        Args:
            save: Se True, salva o modelo após atualizar. Default True.
            
        Returns:
            dict: A grade horária gerada, ou None se não houver validade vigente.
            
        Estrutura do JSON retornado:
        {
            "ano_letivo": 2026,
            "validade": "2026-06-30",
            "matriz": {
                "1": {  # número da aula (linha)
                    "0": {  # Segunda (coluna)
                        "disciplina_id": "...",
                        "disciplina_nome": "Matemática",
                        "disciplina_sigla": "MAT",
                        "professor_apelido": "João"
                    },
                    ...
                },
                ...
            },
            "horarios": {
                "1": {"hora_inicio": "07:30", "hora_fim": "08:20"},
                ...
            },
            "gerado_em": "..."
        }
        """
        from django.utils import timezone
        
        hoje = timezone.now().date()
        
        # Busca a validade vigente para esta turma
        validade = GradeHorariaValidade.objects.filter(
            turma=self,
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
        
        if not grades.exists():
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
        # Mapeia disciplina_id -> professor ativo
        professores_map = {}
        disciplinas_turma = DisciplinaTurma.objects.filter(
            turma=self
        ).prefetch_related('professores__professor')
        
        for dt in disciplinas_turma:
            # Busca professor ativo (sem data_fim ou data_fim >= hoje)
            professor_ativo = dt.professores.filter(
                models.Q(data_fim__isnull=True) | models.Q(data_fim__gte=hoje)
            ).order_by(
                # Prioriza: Titular > Substituto > Auxiliar
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
        
        for g in grades:
            numero = g.horario_aula.numero
            dia = g.horario_aula.dia_semana
            num_key = str(numero)
            dia_key = str(dia)
            
            if num_key not in matriz:
                matriz[num_key] = {}
            
            # Dados da célula
            matriz[num_key][dia_key] = {
                'disciplina_id': str(g.disciplina.id),
                'disciplina_nome': g.disciplina.nome,
                'disciplina_sigla': g.disciplina.sigla,
                'professor_apelido': professores_map.get(g.disciplina_id)
            }
            
            # Horários para legenda das linhas
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


class ProfessorDisciplinaTurma(UUIDModel):
    """Vínculo entre Professor e Disciplina/Turma (atribuição de aulas).
    
    Permite múltiplos professores por disciplina-turma (ex: professor titular + substituto).
    A constraint unique_together garante que o mesmo professor não seja cadastrado
    duas vezes na mesma disciplina-turma.
    """
    
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


class Habilidade(UUIDModel):
    """Habilidade BNCC."""
    
    codigo = models.CharField(max_length=20, verbose_name='Código', unique=True)
    descricao = RichTextField(verbose_name='Descrição')
    is_active = models.BooleanField(default=True, verbose_name='Ativa')
    
    class Meta:
        verbose_name = 'Habilidade'
        verbose_name_plural = 'Habilidades'
        ordering = ['codigo']
    
    def __str__(self):
        return f"{self.codigo} - {self.descricao[:50]}..."


class DiaLetivoExtra(UUIDModel):
    """Dia letivo extra. Sábado, Domingo ou feriado que se torna letivo."""
    data = models.DateField(unique=True, verbose_name='Data do Dia Letivo')
    descricao = models.CharField(max_length=255, blank=True, verbose_name='Motivo/Descrição')
    
    class Meta:
        verbose_name = 'Dia Letivo Extra'
        verbose_name_plural = 'Dias Letivos Extras'
        ordering = ['data']
    
    def __str__(self):
        return f"{self.data.strftime('%d/%m/%Y')}"


class DiaNaoLetivo(UUIDModel):
    """Dia não letivo. Feriados ou ponto facultativo. Não precisa registrar sábado ou domingo."""
    
    class Tipo(models.TextChoices):
        FERIADO = 'FERIADO', 'Feriado'
        PONTO_FACULTATIVO = 'PONTO_FACULTATIVO', 'Ponto facultativo'
        RECESSO = 'RECESSO', 'Recesso escolar'
        FERIAS = 'FERIAS', 'Férias escolares'
        SUSPENSO = 'SUSPENSO', 'Dia letivo suspenso'
        PLANEJAMENTO = 'PLANEJAMENTO', 'Planejamento'
        OUTROS = 'OUTROS', 'Outros'
        

    data = models.DateField(unique=True, verbose_name='Data da Ocorrência')
    tipo = models.CharField(
        max_length=30,
        choices=Tipo.choices,
        verbose_name='Categoria do Dia'
    )
    descricao = models.CharField(max_length=255, blank=True, verbose_name='Motivo/Descrição')
    
    class Meta:
        verbose_name = 'Dia Não Letivo'
        verbose_name_plural = 'Dias Não Letivos'
        ordering = ['data']
    
    def __str__(self):
        return f"{self.data.strftime('%d/%m/%Y')} - {self.get_tipo_display()}"


class AnoLetivo(UUIDModel):
    """Ano letivo escolar."""
    ano = models.PositiveSmallIntegerField(unique=True, verbose_name='Ano')
    is_active = models.BooleanField(default=True, verbose_name='Ativa')
    data_inicio_1bim = models.DateField(null=True, blank=True, verbose_name='Data de Início do 1º Bimestre')
    data_fim_1bim = models.DateField(null=True, blank=True, verbose_name='Data de Fim do 1º Bimestre')
    data_inicio_2bim = models.DateField(null=True, blank=True, verbose_name='Data de Início do 2º Bimestre')
    data_fim_2bim = models.DateField(null=True, blank=True, verbose_name='Data de Fim do 2º Bimestre')
    data_inicio_3bim = models.DateField(null=True, blank=True, verbose_name='Data de Início do 3º Bimestre')
    data_fim_3bim = models.DateField(null=True, blank=True, verbose_name='Data de Fim do 3º Bimestre')
    data_inicio_4bim = models.DateField(null=True, blank=True, verbose_name='Início do 4º Bimestre')
    data_fim_4bim = models.DateField(null=True, blank=True, verbose_name='Fim do 4º Bimestre')
    dias_letivos_extras = models.ManyToManyField(DiaLetivoExtra, blank=True, verbose_name='Dias Letivos Especiais')
    dias_nao_letivos = models.ManyToManyField(DiaNaoLetivo, blank=True, verbose_name='Feriados e Recessos')
    numero_chamadas_turmas_travadas = models.BooleanField(default=False, verbose_name='Número de chamadas de turmas travadas')
    

    controles = models.JSONField(
        default=dict,
        blank=True,
        null=True,
        verbose_name='Controles'
    )

    # Cache de datas liberadas com validade diária (recalcula no dia seguinte)
    # Estrutura: {"datasLiberadas": ["2026-01-08", ...], "validade": "2026-01-08"}
    datas_liberadas_aulas_faltas = models.JSONField(
        default=dict,
        blank=True,
        null=True,
        verbose_name='Cache de Datas Liberadas (Aulas/Faltas)'
    )

    def bimestre(self, data=None):
        if data is None:
            data = timezone.now().date()
        
        if not self.data_inicio_1bim:
            return None
            
        if data < self.data_inicio_1bim:
            return None
        
        if self.data_fim_1bim and data <= self.data_fim_1bim:
            return 1
        
        if self.data_fim_2bim and data <= self.data_fim_2bim:
            return 2
        
        if self.data_fim_3bim and data <= self.data_fim_3bim:
            return 3
        
        if self.data_fim_4bim and data <= self.data_fim_4bim:
            return 4
        
        return None

    def clean(self):
        """Valida a sequência dos bimestres."""
        bimestres = [
            (self.data_inicio_1bim, self.data_fim_1bim, '1º Bimestre'),
            (self.data_inicio_2bim, self.data_fim_2bim, '2º Bimestre'),
            (self.data_inicio_3bim, self.data_fim_3bim, '3º Bimestre'),
            (self.data_inicio_4bim, self.data_fim_4bim, '4º Bimestre'),
        ]
        
        last_date = None
        for inicio, fim, nome in bimestres:
            if inicio and fim:
                if inicio > fim:
                    raise ValidationError(f'Data de início do {nome} não pode ser posterior à data de fim.')
                if inicio.year != self.ano or fim.year != self.ano:
                    raise ValidationError(f'As datas do {nome} devem pertencer ao ano letivo {self.ano}.')
                if last_date and inicio <= last_date:
                    raise ValidationError(f'O {nome} deve começar após o fim do bimestre anterior.')
                last_date = fim

    def save(self, *args, **kwargs):
        """
        Ao criar um novo AnoLetivo, cria automaticamente os registros de 
        ControleRegistrosVisualizacao para todos os tipos e bimestres.
        """
        # Verifica se é criação (novo registro)
        is_new = self._state.adding
        
        super().save(*args, **kwargs)
        
        # Só cria controles se for um novo registro
        if is_new:
            self._criar_controles_iniciais()
            
        # Atualiza o JSON de controles sempre que salvar o AnoLetivo
        self.atualizar_controles_json()
    
    def _criar_controles_iniciais(self):
        """Cria os registros de controle para todos os tipos e bimestres."""
        # Import local para evitar importação circular
        from apps.core.models import ControleRegistrosVisualizacao
        
        # Bimestres: 1-4 para AULA, 1-5 para NOTA e BOLETIM
        tipos_bimestres = {
            ControleRegistrosVisualizacao.TipoControle.REGISTRO_AULA: [1, 2, 3, 4],
            ControleRegistrosVisualizacao.TipoControle.REGISTRO_NOTA: [1, 2, 3, 4, 5],
            ControleRegistrosVisualizacao.TipoControle.VISUALIZACAO_BOLETIM: [1, 2, 3, 4, 5],
        }
        
        controles_a_criar = []
        for tipo, bimestres in tipos_bimestres.items():
            for bimestre in bimestres:
                controles_a_criar.append(
                    ControleRegistrosVisualizacao(
                        ano_letivo=self,
                        bimestre=bimestre,
                        tipo=tipo,
                        data_inicio=None,
                        data_fim=None
                    )
                )
        
        # Cria em lote para melhor performance
        ControleRegistrosVisualizacao.objects.bulk_create(
            controles_a_criar,
            ignore_conflicts=True  # Ignora se já existir (segurança extra)
        )
    
    
    def atualizar_controles_json(self):
        """
        Atualiza o campo JSON 'controles' com base nas configurações de 
        ControleRegistrosVisualizacao e datas dos bimestres.
        """
        from datetime import timedelta
        from apps.core.models import ControleRegistrosVisualizacao
        
        # Recupera todos os controles deste ano letivo
        controles_db = ControleRegistrosVisualizacao.objects.filter(ano_letivo=self)
        
        # Estrutura base
        novo_controles = {}
        
        # Datas dos bimestres (hardcoded campos do model)
        datas_bimestres = {
            1: (self.data_inicio_1bim, self.data_fim_1bim),
            2: (self.data_inicio_2bim, self.data_fim_2bim),
            3: (self.data_inicio_3bim, self.data_fim_3bim),
            4: (self.data_inicio_4bim, self.data_fim_4bim),
        }
        
        # Carrega feriados e extras em memória para performance
        feriados = set(d.data for d in self.dias_nao_letivos.all())
        extras = set(d.data for d in self.dias_letivos_extras.all())
        
        # Processa cada controle
        for controle in controles_db:
            bim_key = str(controle.bimestre)
            if bim_key not in novo_controles:
                novo_controles[bim_key] = {}
                
            c_data = {
                'data_liberada_inicio': controle.data_inicio.isoformat() if controle.data_inicio else None,
                'data_liberada_fim': controle.data_fim.isoformat() if controle.data_fim else None,
                'digitacao_futura': controle.digitacao_futura
            }
            
            # Se for tipo AULA e bimestre 1-4, calcula dias letivos
            if controle.tipo == ControleRegistrosVisualizacao.TipoControle.REGISTRO_AULA and controle.bimestre in range(1, 5):
                dias_letivos = []
                inicio_bim, fim_bim = datas_bimestres.get(controle.bimestre, (None, None))
                
                if inicio_bim and fim_bim:
                    curr = inicio_bim
                    while curr <= fim_bim:
                        # Lógica:
                        # 1. Base: Segunda a Sexta
                        # 2. Remove: Feriados/Nao letivos
                        # 3. Adiciona: Extras (se estiver no range)
                        
                        is_weekday = curr.weekday() < 5 # 0-4 é Seg-Sex
                        is_feriado = curr in feriados
                        is_extra = curr in extras
                        
                        # Dia é letivo se:
                        # (É dia de semana E NÃO é feriado) OU (É extra)
                        # Nota: Se for feriado E extra, entra como letivo (extra vence)
                        if (is_weekday and not is_feriado) or is_extra:
                            dias_letivos.append(curr.isoformat())
                            
                        curr += timedelta(days=1)
                
                c_data['dias_letivos'] = dias_letivos
                
            novo_controles[bim_key][controle.tipo] = c_data
            
        # Atualiza o campo no banco sem disparar signals recursivos
        AnoLetivo.objects.filter(pk=self.pk).update(controles=novo_controles)
        self.controles = novo_controles
        
        # Invalida o cache de datas liberadas quando os controles mudam
        self.invalidar_cache_datas_liberadas()

    def invalidar_cache_datas_liberadas(self):
        """
        Força recálculo do cache de datas liberadas na próxima requisição.
        Deve ser chamado quando os controles forem alterados.
        """
        AnoLetivo.objects.filter(pk=self.pk).update(datas_liberadas_aulas_faltas=None)
        self.datas_liberadas_aulas_faltas = None

    class Meta:
        verbose_name = 'Ano Letivo'
        verbose_name_plural = 'Anos Letivos'
        ordering = ['-ano']
    
    def __str__(self):
        return f"{self.ano}"


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
        # Define um número temporário se for novo, para evitar erros de validação
        if not self.pk and not self.numero:
            self.numero = 999 
            
        super().save(*args, **kwargs)
        
        # Reordena todos os horários do mesmo dia/ano
        horarios = HorarioAula.objects.filter(
            ano_letivo=self.ano_letivo,
            dia_semana=self.dia_semana
        ).order_by('hora_inicio')
        
        for index, horario in enumerate(horarios, start=1):
            if horario.numero != index:
                # Usa update para evitar recursão infinita ao chamar save()
                HorarioAula.objects.filter(pk=horario.pk).update(numero=index)

    def __str__(self):
        return f"{self.get_dia_semana_display()} - {self.numero}ª Aula ({self.hora_inicio.strftime('%H:%M')} - {self.hora_fim.strftime('%H:%M')})"


class GradeHorariaValidade(UUIDModel):
    """
    Grade horária com validade (Agrupador de grades por período).
    Define um período de vigência para uma grade de aulas de uma turma.
    """
    turma = models.ForeignKey(
        Turma, 
        on_delete=models.CASCADE, 
        related_name='validades_grade', 
        verbose_name='Turma'
    )
    data_inicio = models.DateField(verbose_name='Data de início')
    data_fim = models.DateField(verbose_name='Data de fim')

    class Meta:
        verbose_name = 'Vigência de Grade Horária'
        verbose_name_plural = 'Vigências de Grade Horária'
        ordering = ['turma', '-data_inicio']

    def clean(self):
        """Validações de datas e sobreposição."""
        if self.data_inicio and self.data_fim:
            if self.data_inicio >= self.data_fim:
                raise ValidationError('A data de início deve ser estritamente menor que a data de fim.')
            
            if self.turma_id:
                # Valida ano letivo
                if self.data_inicio.year != self.turma.ano_letivo or self.data_fim.year != self.turma.ano_letivo:
                    raise ValidationError(f'As datas devem pertencer ao ano letivo da turma ({self.turma.ano_letivo}).')

                # Verifica sobreposição com outras vigências da mesma turma
                sobreposicoes = GradeHorariaValidade.objects.filter(
                    turma=self.turma,
                    data_inicio__lte=self.data_fim,
                    data_fim__gte=self.data_inicio
                )
                if self.pk:
                    sobreposicoes = sobreposicoes.exclude(pk=self.pk)
                
                if sobreposicoes.exists():
                    raise ValidationError('Já existe uma vigência de grade horária para este período.')

    def __str__(self):
        return f"{self.turma} ({self.data_inicio.strftime('%d/%m')} a {self.data_fim.strftime('%d/%m')})"


class GradeHoraria(UUIDModel):
    """
    Item da grade horária (Aula específica em um dia/hora).
    Vincula-se a uma vigência (GradeHorariaValidade).
    """
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

    class Meta:
        verbose_name = 'Item de Grade Horária'
        verbose_name_plural = 'Itens de Grade Horária'
        unique_together = ['validade', 'horario_aula']
        ordering = ['horario_aula__dia_semana', 'horario_aula__hora_inicio']

    def clean(self):
        """
        Validações:
        1. Horário pertence ao mesmo ano da turma
        2. Não há conflito de horário entre turmas relacionadas (mesmo numero/letra/ano)
        """
        if self.validade_id and self.horario_aula_id:
            turma = self.validade.turma
            
            # Validação 1: Ano letivo
            ano_turma = turma.ano_letivo
            ano_horario = self.horario_aula.ano_letivo.ano
            
            if ano_turma != ano_horario:
                raise ValidationError(f'O horário de aula ({ano_horario}) deve ser do mesmo ano letivo da turma ({ano_turma}).')
            
            # Validação 2: Conflito entre turmas relacionadas
            # Turmas relacionadas = mesmo numero + letra + ano_letivo (cursos diferentes)
            turmas_relacionadas = Turma.objects.filter(
                numero=turma.numero,
                letra=turma.letra,
                ano_letivo=turma.ano_letivo
            ).exclude(id=turma.id)
            
            if turmas_relacionadas.exists():
                # Busca validades irmãs (mesmas datas, turmas relacionadas)
                validades_irmas = GradeHorariaValidade.objects.filter(
                    turma__in=turmas_relacionadas,
                    data_inicio=self.validade.data_inicio,
                    data_fim=self.validade.data_fim
                )
                
                # Verifica se já existe grade para esse horário em turmas irmãs
                conflito = GradeHoraria.objects.filter(
                    validade__in=validades_irmas,
                    horario_aula=self.horario_aula
                )
                
                if self.pk:
                    conflito = conflito.exclude(pk=self.pk)
                
                if conflito.exists():
                    grade_conflito = conflito.first()
                    raise ValidationError(
                        f'Conflito de horário: {self.horario_aula} já está ocupado por '
                        f'{grade_conflito.disciplina.sigla} na turma {grade_conflito.validade.turma}.'
                    )

    def __str__(self):
        return f"{self.validade.turma} - {self.horario_aula} - {self.disciplina.sigla}"


class AnoLetivoSelecionado(UUIDModel):
    """Ano letivo selecionado pelo usuário para visualização de dados."""
    
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ano_letivo_selecionado'
    )
    ano_letivo = models.ForeignKey(
        AnoLetivo,
        on_delete=models.CASCADE,
        related_name='usuarios_selecionados',
        verbose_name='Ano Letivo'
    )

    class Meta:
        verbose_name = 'Ano Letivo Selecionado'
        verbose_name_plural = 'Anos Letivos Selecionados'

    def __str__(self):
        return f"{self.usuario} - {self.ano_letivo.ano}"


class ControleRegistrosVisualizacao(UUIDModel):
    """
    Controle de períodos para registros e visualizações.
    Define quando professores podem registrar aulas/notas e quando boletins ficam disponíveis.
    
    Regras de liberação (baseadas apenas nas datas):
    - Com data_inicio e data_fim: Liberado no período (data_inicio até data_fim)
    - Só data_inicio: Liberado dessa data em diante
    - Só data_fim: Liberado até essa data
    - Sem datas: Não liberado
    """
    
    class TipoControle(models.TextChoices):
        REGISTRO_AULA = 'AULA', 'Registro de Aula (falta e conteúdo)'
        REGISTRO_NOTA = 'NOTA', 'Registro de Nota final do bimestre'
        VISUALIZACAO_BOLETIM = 'BOLETIM', 'Visualização do boletim'

    BIMESTRE_CHOICES = [
        (1, '1º Bimestre'),
        (2, '2º Bimestre'),
        (3, '3º Bimestre'),
        (4, '4º Bimestre'),
        (5, 'Resultado Final'),
    ]

    ano_letivo = models.ForeignKey(
        AnoLetivo,
        on_delete=models.CASCADE,
        related_name='controle_registros_visualizacao',
        verbose_name='Ano Letivo'
    )
    bimestre = models.IntegerField(
        verbose_name='Bimestre',
        choices=BIMESTRE_CHOICES,
        default=1
    )
    tipo = models.CharField(
        max_length=10,
        choices=TipoControle.choices,
        default=TipoControle.REGISTRO_AULA,
        verbose_name='Tipo'
    )
    data_inicio = models.DateField(verbose_name='Data de Início', null=True, blank=True)
    data_fim = models.DateField(verbose_name='Data de Fim', null=True, blank=True)

    # Permite digitação futura serve apenas para tipo = REGISTRO_AULA
    digitacao_futura = models.BooleanField(
        verbose_name='Permite digitação futura',
        default=True
    )

    def clean(self):
        """Valida que a data de fim é posterior à data de início."""
        if self.data_fim and self.data_inicio and self.data_fim < self.data_inicio:
            raise ValidationError('A data de fim deve ser posterior à data de início.')
            
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        
        # Atualiza o JSON centralizado no AnoLetivo
        self.ano_letivo.atualizar_controles_json()
        


    def esta_liberado(self, data_referencia=None):
        """
        Verifica se está liberado para uma data específica.
        
        Args:
            data_referencia: Data para verificar (default: hoje)
        
        Returns:
            bool: True se liberado, False caso contrário
        """
        hoje = timezone.localdate()
        if data_referencia is None:
            data_referencia = hoje
        
        # Se for para o futuro e não permitir digitação futura, bloqueia
        # Isso se aplica apenas ao registro de aulas
        if self.tipo == self.TipoControle.REGISTRO_AULA and not self.digitacao_futura and data_referencia > hoje:
            return False
        
        # Sem datas = não liberado
        if not self.data_inicio and not self.data_fim:
            return False
        
        # Só data_inicio = liberado dessa data em diante
        if self.data_inicio and not self.data_fim:
            return data_referencia >= self.data_inicio
        
        # Só data_fim = liberado até essa data
        if not self.data_inicio and self.data_fim:
            return data_referencia <= self.data_fim
        
        # Ambas as datas = liberado no período
        return self.data_inicio <= data_referencia <= self.data_fim

    @property
    def status_liberacao(self):
        """Retorna o status atual de liberação."""
        if not self.data_inicio and not self.data_fim:
            return 'Bloqueado'
        
        if self.esta_liberado():
            return 'Liberado'
        
        hoje = timezone.localdate()
        if self.data_inicio and hoje < self.data_inicio:
            return 'Aguardando início'
        
        return 'Encerrado'
        
    class Meta:
        verbose_name = 'Controle de Registro/Visualização'
        verbose_name_plural = 'Controles de Registros/Visualizações'
        unique_together = ['ano_letivo', 'bimestre', 'tipo']
        ordering = ['ano_letivo', 'bimestre', 'tipo']

    def __str__(self):
        bimestre_display = dict(self.BIMESTRE_CHOICES).get(self.bimestre, str(self.bimestre))
        return f"{self.ano_letivo.ano} - {bimestre_display} - {self.get_tipo_display()} ({self.status_liberacao})"


