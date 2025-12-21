"""
App Pedagogical - Diário de Classe, Notas, Faltas, Ocorrências, Recuperação
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from apps.core.models import Funcionario, Disciplina, DisciplinaTurma, Turma, Habilidade, ProfessorDisciplinaTurma, Bimestre
from apps.academic.models import Estudante, MatriculaTurma, Responsavel
from ckeditor.fields import RichTextField


class PlanoAula(models.Model):
    """Plano de aula do professor para uma ou mais turmas."""
    
    professor = models.ForeignKey(
        Funcionario,
        on_delete=models.CASCADE,
        related_name='planos_aula'
    )
    disciplina = models.ForeignKey(
        Disciplina,
        on_delete=models.PROTECT,
        related_name='planos_aula'
    )
    turmas = models.ManyToManyField(
        Turma,
        related_name='planos_aula'
    )
    data_inicio = models.DateField(verbose_name='Data Início')
    data_fim = models.DateField(verbose_name='Data Fim')
    conteudo = RichTextField(verbose_name='Conteúdo')
    habilidades = models.ManyToManyField(
        Habilidade,
        related_name='planos_aula',
        blank=True
    )
    bimestre = models.ForeignKey(
        Bimestre,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        verbose_name='Bimestre'
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Plano de Aula'
        verbose_name_plural = 'Planos de Aula'
        ordering = ['-data_inicio']
    
    def save(self, *args, **kwargs):
        if not self.bimestre and self.data_inicio:
            self.bimestre = Bimestre.objects.filter(
                ano_letivo=self.data_inicio.year,
                data_inicio__lte=self.data_inicio,
                data_fim__gte=self.data_inicio
            ).first()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.professor} - {self.disciplina} ({self.data_inicio} a {self.data_fim})"

    def pode_alterar(self, usuario):
        """Verifica se o usuário tem permissão para alterar este registro."""
        if not usuario.is_authenticated:
            return False
        # Professor pode alterar seus próprios planos
        return self.professor.usuario == usuario


class Aula(models.Model):
    """Registro de aula (diário de classe)."""
    
    professor_disciplina_turma = models.ForeignKey(
        ProfessorDisciplinaTurma,
        on_delete=models.CASCADE,
        related_name='aulas'
    )
    data = models.DateField(verbose_name='Data')
    conteudo = RichTextField(verbose_name='Conteúdo Ministrado')
    numero_aulas = models.PositiveSmallIntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(4)],
        verbose_name='Número de Aulas (Geminadas)'
    )
    bimestre = models.ForeignKey(
        Bimestre,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        verbose_name='Bimestre'
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Aula'
        verbose_name_plural = 'Aulas'
        ordering = ['-data']
        unique_together = ['professor_disciplina_turma', 'data']
    
    def save(self, *args, **kwargs):
        if not self.bimestre and self.data:
            self.bimestre = Bimestre.objects.filter(
                ano_letivo=self.data.year,
                data_inicio__lte=self.data,
                data_fim__gte=self.data
            ).first()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.professor_disciplina_turma} - {self.data.strftime('%d/%m/%Y')}"

    def pode_alterar(self, usuario):
        """Verifica se o usuário tem permissão para alterar este registro."""
        if not usuario.is_authenticated:
            return False
        # Professor pode alterar suas próprias aulas
        return self.professor_disciplina_turma.professor.usuario == usuario


class Faltas(models.Model):
    """Registro de falta individual de um estudante em uma aula."""
    
    aula = models.ForeignKey(
        Aula,
        on_delete=models.CASCADE,
        related_name='faltas'
    )
    estudante = models.ForeignKey(
        Estudante,
        on_delete=models.CASCADE,
        related_name='faltas'
    )
    aula_numero = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(4)],
        help_text='Número da aula no dia (1, 2, 3 ou 4)',
        verbose_name='Aula Nº'
    )
    
    class Meta:
        verbose_name = 'Falta'
        verbose_name_plural = 'Faltas'
        unique_together = ['aula', 'estudante', 'aula_numero']
    
    def __str__(self):
        return f"{self.estudante} - Falta na aula {self.aula_numero} ({self.aula.data})"
    
    def get_bimestre(self):
        return self.aula.bimestre

    def pode_alterar(self, usuario):
        """Verifica se o usuário tem permissão para alterar este registro."""
        if not usuario.is_authenticated:
            return False
        # Professor dono da aula pode alterar as faltas
        return self.aula.professor_disciplina_turma.professor.usuario == usuario


class DescritorOcorrenciaPedagogica(models.Model):
    """Tipos de ocorrências pedagógicas cadastradas pelo gestor."""
    
    gestor = models.ForeignKey(
        Funcionario,
        on_delete=models.CASCADE,
        related_name='tipos_ocorrencia_criados'
    )
    texto = models.CharField(max_length=100, verbose_name='Descrição do Tipo')
    ativo = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = 'Tipo de Ocorrência'
        verbose_name_plural = 'Tipos de Ocorrências'
        ordering = ['texto']
    
    def __str__(self):
        return self.texto

    def pode_alterar(self, usuario):
        """Verifica se o usuário tem permissão para alterar este registro."""
        if not usuario.is_authenticated:
            return False
        return usuario.is_gestao


class OcorrenciaPedagogica(models.Model):
    """Ocorrência pedagógica de um estudante (não permanente)."""
    
    estudante = models.ForeignKey(
        Estudante,
        on_delete=models.CASCADE,
        related_name='ocorrencias_pedagogicas'
    )
    autor = models.ForeignKey(
        Funcionario,
        on_delete=models.CASCADE,
        related_name='ocorrencias_criadas'
    )
    tipo = models.ForeignKey(
        DescritorOcorrenciaPedagogica,
        on_delete=models.PROTECT,
        related_name='ocorrencias'
    )
    bimestre = models.ForeignKey(
        Bimestre,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        verbose_name='Bimestre'
    )
    data = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Ocorrência Pedagógica'
        verbose_name_plural = 'Ocorrências Pedagógicas'
        ordering = ['-data', 'estudante']
    
    def save(self, *args, **kwargs):
        # Para auto_now_add, a data pode não estar disponível em um novo objeto até salvar
        # Mas podemos tentar inferir hoje se for novo, ou usar a data se já existir
        from django.utils import timezone
        data_ref = self.data if self.data else timezone.now()
        
        if not self.bimestre:
             self.bimestre = Bimestre.objects.filter(
                ano_letivo=data_ref.year,
                data_inicio__lte=data_ref.date(),
                data_fim__gte=data_ref.date()
            ).first()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.estudante} - {self.tipo} ({self.data.strftime('%d/%m/%Y')})"

    def pode_alterar(self, usuario):
        """Verifica se o usuário tem permissão para alterar este registro."""
        if not usuario.is_authenticated:
            return False
        # Autor pode editar sua ocorrência
        return self.autor.usuario == usuario


class OcorrenciaResponsavelCiente(models.Model):
    """Registro de ciência do responsável sobre uma ocorrência."""
    
    responsavel = models.ForeignKey(
        Responsavel,
        on_delete=models.CASCADE,
        related_name='ciencias_ocorrencias'
    )
    ocorrencia = models.ForeignKey(
        OcorrenciaPedagogica,
        on_delete=models.CASCADE,
        related_name='ciencias'
    )
    ciente = models.BooleanField(default=False)
    data_ciencia = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = 'Ciência de Ocorrência'
        verbose_name_plural = 'Ciências de Ocorrências'
        unique_together = ['responsavel', 'ocorrencia']
    
    def __str__(self):
        status = 'Ciente' if self.ciente else 'Pendente'
        return f"{self.responsavel} - {self.ocorrencia} ({status})"


class Avaliacao(models.Model):
    """Avaliação de um estudante em uma disciplina."""
    
    matricula_turma = models.ForeignKey(
        MatriculaTurma,
        on_delete=models.CASCADE,
        related_name='avaliacoes'
    )
    professor_disciplina_turma = models.ForeignKey(
        ProfessorDisciplinaTurma,
        on_delete=models.CASCADE,
        related_name='avaliacoes'
    )

    bimestre = models.ForeignKey(
        Bimestre,
        on_delete=models.PROTECT,
        verbose_name='Bimestre'
    )

    valor = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('10.00'))],
        verbose_name='Valor da Avaliação'
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

    tipo_calculo_instrumentos = models.CharField(
        max_length=20,
        choices=[
            ('MEDIA_PONDERADA', 'Média Ponderada'),
            ('SOMA', 'Soma'),
        ],
        default='SOMA',
        verbose_name='Tipo de Cálculo de Instrumentos'
    )   
    
    class Meta:
        verbose_name = 'Avaliação'
        verbose_name_plural = 'Avaliações'
        unique_together = ['matricula_turma', 'professor_disciplina_turma']
    
    def __str__(self):
        return f"{self.matricula_turma.matricula_cemep.estudante} - {self.professor_disciplina_turma.disciplina_turma.disciplina}"

    def pode_alterar(self, usuario):
        """Verifica se o usuário tem permissão para alterar este registro."""
        if not usuario.is_authenticated:
            return False
        # Professor dono da avaliação pode alterar
        return self.professor_disciplina_turma.professor.usuario == usuario 


class NotaBimestral(models.Model):
    """Nota bimestral de um estudante em uma disciplina."""
    
    matricula_turma = models.ForeignKey(
        MatriculaTurma,
        on_delete=models.CASCADE,
        related_name='notas'
    )
    professor_disciplina_turma = models.ForeignKey(
        ProfessorDisciplinaTurma,
        on_delete=models.CASCADE,
        related_name='notas'
    )

    bimestre = models.ForeignKey(
        Bimestre,
        on_delete=models.PROTECT,
        verbose_name='Bimestre'
    )
    
    nota = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('10.00'))],
        verbose_name='Nota'
    )
    
    class Meta:
        verbose_name = 'Nota Bimestral'
        verbose_name_plural = 'Notas Bimestrais'
        unique_together = ['matricula_turma', 'professor_disciplina_turma', 'bimestre']
        ordering = ['matricula_turma', 'bimestre']
    
    def __str__(self):
        return f"{self.matricula_turma.estudante} - {self.professor_disciplina_turma.disciplina_turma.disciplina} ({self.bimestre})"

    def pode_alterar(self, usuario):
        """Verifica se o usuário tem permissão para alterar este registro."""
        if not usuario.is_authenticated:
            return False
        # Professor dono da nota pode alterar
        return self.professor_disciplina_turma.professor.usuario == usuario
        

class NotificacaoRecuperacao(models.Model):
    """Notificação de recuperação para estudante/responsável."""
    estudante = models.ForeignKey(
        Estudante,
        on_delete=models.CASCADE,
        related_name='notificacoes_recuperacao'
    )
    professor_disciplina_turma = models.ForeignKey(
        ProfessorDisciplinaTurma,
        on_delete=models.CASCADE,
        related_name='notificacoes_recuperacao'
    )
    visualizado = models.BooleanField(default=False)
    data_visualizacao = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = 'Notificação de Recuperação'
        verbose_name_plural = 'Notificações de Recuperação'
    
    def __str__(self):
        return f"{self.estudante} - {self.professor_disciplina_turma}"

    def pode_alterar(self, usuario):
        """Verifica se o usuário tem permissão para alterar este registro."""
        if not usuario.is_authenticated:
            return False
        if usuario.is_gestao:
            return True
        if usuario.is_professor:
            return self.professor_disciplina_turma.professor.usuario == usuario
        return False

