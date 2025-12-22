"""
App Core - Cadastros Base (Funcionários, Cursos, Turmas, Disciplinas, Calendário)
"""
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from ckeditor.fields import RichTextField


class Parentesco(models.TextChoices):
    """Opções de parentesco - compartilhado entre apps."""
    PAI = 'PAI', 'Pai'
    MAE = 'MAE', 'Mãe'
    AVO_M = 'AVO_M', 'Avô(a) Materno'
    AVO_P = 'AVO_P', 'Avô(a) Paterno'
    TIO = 'TIO', 'Tio(a)'
    IRMAO = 'IRMAO', 'Irmão(ã)'
    OUTRO = 'OUTRO', 'Outro'


class Funcionario(models.Model):
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
    
    class Meta:
        verbose_name = 'Funcionário'
        verbose_name_plural = 'Funcionários'
        ordering = ['usuario__first_name']

    def get_apelido(self):
        if self.apelido:
            return f"({self.apelido})"
        return self.usuario.get_full_name().split(' ')[0]
    
    def __str__(self):
        if self.area_atuacao:
            return f"{self.usuario.get_full_name()} - {self.area_atuacao}"
        return self.usuario.get_full_name()



class PeriodoTrabalho(models.Model):
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



class Disciplina(models.Model):
    """Disciplina do currículo escolar."""
    
    nome = models.CharField(max_length=100, verbose_name='Nome')
    sigla = models.CharField(max_length=10, verbose_name='Sigla')
    
    class Meta:
        verbose_name = 'Disciplina'
        verbose_name_plural = 'Disciplinas'
        ordering = ['nome']
    
    def __str__(self):
        return f"{self.nome} ({self.sigla})"



class Curso(models.Model):
    """Curso oferecido pela escola."""
    
    nome = models.CharField(max_length=100, verbose_name='Nome')
    sigla = models.CharField(max_length=10, verbose_name='Sigla')
    
    class Meta:
        verbose_name = 'Curso'
        verbose_name_plural = 'Cursos'
        ordering = ['nome']
    
    def __str__(self):
        return f"{self.nome} ({self.sigla})"

class Turma(models.Model):
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
    
    class Meta:
        verbose_name = 'Turma'
        verbose_name_plural = 'Turmas'
        ordering = ['-ano_letivo', 'numero', 'letra']
        unique_together = ['numero', 'letra', 'ano_letivo', 'curso']
    
    def __str__(self):
        return f"{self.numero}º {self.get_nomenclatura_display()} {self.letra} - {self.ano_letivo}"
    
    @property
    def nome_completo(self):
        return f"{self.numero}º {self.get_nomenclatura_display()} {self.letra} - {self.curso.sigla} ({self.ano_letivo})"



class DisciplinaTurma(models.Model):
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
    aulas_semanais = models.PositiveSmallIntegerField(verbose_name='Aulas Semanais')
    
    class Meta:
        verbose_name = 'Disciplina da Turma'
        verbose_name_plural = 'Disciplinas das Turmas'
        unique_together = ['disciplina', 'turma']
    
    def __str__(self):
        return f"{self.disciplina.sigla} - {self.turma} ({self.aulas_semanais} aulas/sem)"



class ProfessorDisciplinaTurma(models.Model):
    """Vínculo entre Professor e Disciplina/Turma (atribuição de aulas)."""
    
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
    
    class Meta:
        verbose_name = 'Atribuição de Aulas'
        verbose_name_plural = 'Atribuições de Aulas'
        unique_together = ['professor', 'disciplina_turma']
    
    def __str__(self):
        return f"{self.professor.usuario.get_full_name()} - {self.disciplina_turma}"


class Bimestre(models.Model):
    """Bimestre escolar."""
    numero = models.PositiveSmallIntegerField(verbose_name='Número')
    data_inicio = models.DateField(verbose_name='Data de Início')
    data_fim = models.DateField(verbose_name='Data de Fim')
    ano_letivo = models.PositiveSmallIntegerField(verbose_name='Ano Letivo')
    
    class Meta:
        verbose_name = 'Bimestre'
        verbose_name_plural = 'Bimestres'
        ordering = ['numero']
    
    def __str__(self):
        return f"{self.numero}º Bimestre"

    def clean(self):
        """Valida consistência das datas e ano letivo."""
        if self.data_inicio and self.data_fim:
            if self.data_inicio > self.data_fim:
                raise ValidationError('A data de início não pode ser posterior à data de fim.')
            
            if self.data_inicio.year != self.ano_letivo or self.data_fim.year != self.ano_letivo:
                raise ValidationError('As datas de início e fim devem pertencer ao ano letivo informado.')



class CalendarioEscolar(models.Model):
    """Calendário escolar com dias letivos e não letivos."""
    
    class TipoNaoLetivo(models.TextChoices):
        FERIADO = 'FERIADO', 'Feriado'
        PONTO_FACULTATIVO = 'PONTO_FACULTATIVO', 'Ponto Facultativo'
        RECESSO = 'RECESSO', 'Recesso'
        FERIAS = 'FERIAS', 'Férias'
    
    data = models.DateField(unique=True, verbose_name='Data')
    ano_letivo = models.PositiveSmallIntegerField(db_index=True, verbose_name='Ano Letivo')
    letivo = models.BooleanField(default=True, verbose_name='Dia Letivo')
    tipo = models.CharField(
        max_length=20,
        choices=TipoNaoLetivo.choices,
        null=True,
        blank=True,
        verbose_name='Tipo (se não letivo)'
    )
    descricao = models.CharField(max_length=255, verbose_name='Descrição')
    
    class Meta:
        verbose_name = 'Calendário Escolar'
        verbose_name_plural = 'Calendário Escolar'
        ordering = ['data']
    
    def clean(self):
        if not self.letivo and not self.tipo:
            raise ValidationError('Dias não letivos devem ter um tipo definido.')

    def save(self, *args, **kwargs):
        if self.data:
            self.ano_letivo = self.data.year
        super().save(*args, **kwargs)
    
    def __str__(self):
        status = 'Letivo' if self.letivo else self.get_tipo_display()
        return f"{self.data.strftime('%d/%m/%Y')} - {status}: {self.descricao}"

    def get_bimestre(self):
        """Retorna o bimestre correspondente à data."""
        return Bimestre.objects.filter(
            ano_letivo=self.ano_letivo,
            data_inicio__lte=self.data,
            data_fim__gte=self.data
        ).first()



class Habilidade(models.Model):
    """Habilidades BNCC ou internas por disciplina."""
    
    codigo = models.CharField(max_length=20, unique=True, verbose_name='Código')
    descricao = RichTextField(verbose_name='Descrição')
    disciplina = models.ForeignKey(
        Disciplina,
        on_delete=models.CASCADE,
        related_name='habilidades',
        null=True,
        blank=True
    )
    
    class Meta:
        verbose_name = 'Habilidade'
        verbose_name_plural = 'Habilidades'
        ordering = ['disciplina', 'codigo']
    
    def __str__(self):
        return f"{self.codigo} - {self.descricao[:50]}..."


