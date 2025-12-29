"""
App Core - Cadastros Base (Funcionários, Cursos, Turmas, Disciplinas, Calendário)
"""
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from ckeditor.fields import RichTextField
from .validators import validate_cpf


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
    
    class Meta:
        verbose_name = 'Funcionário'
        verbose_name_plural = 'Funcionários'
        ordering = ['usuario__first_name']
        unique_together = ['usuario', 'matricula']

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
    
    class AreaConhecimento(models.TextChoices):
        LINGUAGENS = 'LINGUAGENS', 'Linguagens e suas Tecnologias'
        MATEMATICA = 'MATEMATICA', 'Matemática e suas Tecnologias'
        CIENCIAS_NATUREZA = 'CIENCIAS_NATUREZA', 'Ciências da Natureza e suas Tecnologias'
        CIENCIAS_HUMANAS = 'CIENCIAS_HUMANAS', 'Ciências Humanas e Sociais Aplicadas'
        TEC_INFORMATICA = 'TEC_INFORMATICA', 'Técnico em Informática'
        TEC_QUIMICA = 'TEC_QUIMICA', 'Técnico em Química'
        TEC_ENFERMAGEM = 'TEC_ENFERMAGEM', 'Técnico em Enfermagem'
    
    nome = models.CharField(max_length=100, verbose_name='Nome')
    sigla = models.CharField(max_length=10, verbose_name='Sigla')
    area_conhecimento = models.CharField(
        max_length=20,
        choices=AreaConhecimento.choices,
        null=True,
        blank=True,
        verbose_name='Área de Conhecimento'
    )
    is_active = models.BooleanField(default=True, verbose_name='Ativa')
    
    class Meta:
        verbose_name = 'Disciplina'
        verbose_name_plural = 'Disciplinas'
        ordering = ['nome']
        unique_together = ['nome', 'sigla']
    
    def __str__(self):
        return f"{self.nome} ({self.sigla})"


class Curso(models.Model):
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
    is_active = models.BooleanField(default=True, verbose_name='Ativa')
    
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
    aulas_semanais = models.PositiveSmallIntegerField(verbose_name='Aulas Semanais', default=4)
    
    class Meta:
        verbose_name = 'Disciplina da Turma'
        verbose_name_plural = 'Disciplinas das Turmas'
        unique_together = ['disciplina', 'turma']
    
    def __str__(self):
        return f"{self.disciplina.sigla} - {self.turma} ({self.aulas_semanais} aulas/sem)"


class ProfessorDisciplinaTurma(models.Model):
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
    is_active = models.BooleanField(default=True, verbose_name='Ativa')
    
    class Meta:
        verbose_name = 'Habilidade'
        verbose_name_plural = 'Habilidades'
        ordering = ['disciplina', 'codigo']
    
    def __str__(self):
        return f"{self.codigo} - {self.descricao[:50]}..."


class DiaLetivoExtra(models.Model):
    """Dia letivo extra. Sábado, Domingo ou feriado que se torna letivo."""
    data = models.DateField(unique=True, verbose_name='Data do Dia Letivo')
    descricao = models.CharField(max_length=255, blank=True, verbose_name='Motivo/Descrição')
    
    class Meta:
        verbose_name = 'Dia Letivo Extra'
        verbose_name_plural = 'Dias Letivos Extras'
        ordering = ['data']
    
    def __str__(self):
        return f"{self.data.strftime('%d/%m/%Y')}"

class DiaNaoLetivo(models.Model):
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

class AnoLetivo(models.Model):
    """Ano letivo escolar."""
    ano = models.PositiveSmallIntegerField(primary_key=True, verbose_name='Ano')
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

    def total_dias_letivos(self):
        return self.dias_letivos_extras.count()
    
    class Meta:
        verbose_name = 'Ano Letivo'
        verbose_name_plural = 'Anos Letivos'
        ordering = ['-ano']
    
    def __str__(self):
        return f"{self.ano}"