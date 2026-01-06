"""
App Pedagogical - Diário de Classe, Notas, Faltas, Ocorrências, Recuperação
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from apps.core.models import Funcionario, Disciplina, DisciplinaTurma, UUIDModel, Turma, Habilidade, ProfessorDisciplinaTurma
from apps.academic.models import Estudante, MatriculaTurma, Responsavel
from ckeditor.fields import RichTextField


class PlanoAula(UUIDModel):
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
        related_name='planos_aula',
        blank=True
    )
    titulo = models.CharField(max_length=100, verbose_name='Título')
    data_inicio = models.DateField(verbose_name='Data Início')
    data_fim = models.DateField(verbose_name='Data Fim')
    conteudo = RichTextField(verbose_name='Conteúdo', blank=True)
    habilidades = models.ManyToManyField(
        Habilidade,
        related_name='planos_aula',
        blank=True
    )
    ano_letivo = models.ForeignKey(
        'core.AnoLetivo',
        on_delete=models.CASCADE,
        related_name='planos_aula',
        verbose_name='Ano Letivo',
        null=True,
        blank=True
    )

    bimestre = models.PositiveSmallIntegerField(
        choices=[(0, 'Anual'), (1, '1º Bimestre'), (2, '2º Bimestre'), (3, '3º Bimestre'), (4, '4º Bimestre')],
        default=0,
        verbose_name='Bimestre'
    )
    
    class Meta:
        verbose_name = 'Plano de Aula'
        verbose_name_plural = 'Planos de Aula'
        ordering = ['-data_inicio']

    def save(self, *args, **kwargs):
        if self.ano_letivo and self.data_inicio:
            # Tenta calcular o bimestre automaticamente
            try:
                b = self.ano_letivo.bimestre(self.data_inicio)
                self.bimestre = b if b else 0
            except Exception:
                pass # Mantém o padrão se der erro
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.professor} - {self.disciplina} ({self.data_inicio} a {self.data_fim})"

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.data_inicio and self.data_fim:
            if self.data_inicio > self.data_fim:
                raise ValidationError('A data de início não pode ser posterior à data de fim.')


class Aula(UUIDModel):
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
    criado_em = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Aula'
        verbose_name_plural = 'Aulas'
        ordering = ['-data']
        unique_together = ['professor_disciplina_turma', 'data']
    
    def __str__(self):
        return f"{self.professor_disciplina_turma} - {self.data.strftime('%d/%m/%Y')}"


class Faltas(UUIDModel):
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


class DescritorOcorrenciaPedagogica(UUIDModel):
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


class OcorrenciaPedagogica(UUIDModel):
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
    data = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Ocorrência Pedagógica'
        verbose_name_plural = 'Ocorrências Pedagógicas'
        ordering = ['-data', 'estudante']
    
    def __str__(self):
        return f"{self.estudante} - {self.tipo} ({self.data.strftime('%d/%m/%Y')})"


class OcorrenciaResponsavelCiente(UUIDModel):
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


class Avaliacao(UUIDModel):
    """Avaliação de uma disciplina em uma turma para um bimestre."""

    professor_disciplina_turma = models.ForeignKey(
        ProfessorDisciplinaTurma,
        on_delete=models.CASCADE,
        related_name='avaliacoes'
    )

    valor = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('10.00'))],
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
        unique_together = ['professor_disciplina_turma', 'tipo']
    
    def __str__(self):
        return f"{self.professor_disciplina_turma.disciplina_turma.disciplina} ({self.get_tipo_display()})"

    def clean(self):
        """Validações de regras de negócio."""
        from django.core.exceptions import ValidationError
        
        disciplina_turma = self.professor_disciplina_turma.disciplina_turma
        
        # Validação: soma dos valores das avaliações regulares por disciplina/turma deve ser <= 10
        if self.tipo == 'AVALIACAO_REGULAR':
            qs = Avaliacao.objects.filter(
                professor_disciplina_turma__disciplina_turma=disciplina_turma,
                tipo='AVALIACAO_REGULAR'
            )
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            soma_avaliacoes = qs.aggregate(total=models.Sum('valor'))['total'] or Decimal('0.00')
            
            if soma_avaliacoes + self.valor > Decimal('10.00'):
                raise ValidationError(
                    f'A soma das avaliações regulares ({soma_avaliacoes} + {self.valor}) '
                    f'ultrapassa 10 pontos para esta disciplina/turma.'
                )
        
        # Validação: só pode existir UMA avaliação de recuperação por disciplina/turma
        if self.tipo == 'AVALIACAO_RECUPERACAO':
            qs = Avaliacao.objects.filter(
                professor_disciplina_turma__disciplina_turma=disciplina_turma,
                tipo='AVALIACAO_RECUPERACAO'
            )
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if qs.exists():
                raise ValidationError(
                    'Já existe uma avaliação de recuperação para esta disciplina/turma.'
                )
            
            # Validação: valor da avaliação de recuperação deve ser sempre 10
            if self.valor != Decimal('10.00'):
                raise ValidationError(
                    'O valor da avaliação de recuperação deve ser sempre 10.'
                )


class InstrumentoAvaliativo(UUIDModel):
    """Instrumento avaliativo pertencente a uma avaliação."""

    avaliacao = models.ForeignKey(
        Avaliacao,
        on_delete=models.CASCADE,
        related_name='instrumentos'
    )
    
    titulo = models.CharField(
        max_length=100, 
        verbose_name='Título do Instrumento',
        help_text='Ex: Prova 1, Trabalho, Participação'
    )

    data_inicio = models.DateField(
        verbose_name='Data de Início'
    )
    
    data_fim = models.DateField(
        verbose_name='Data de Fim'
    )
    
    usa_vistos = models.BooleanField(
        default=False,
        verbose_name='Usa Vistos',
        help_text='Se marcado, a nota é calculada automaticamente pela porcentagem de vistos'
    )

    peso = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01')), MaxValueValidator(Decimal('10.00'))],
        verbose_name='Peso',
        default=Decimal('1.00')
    )  

    valor = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('10.00'))],
        verbose_name='Valor Máximo'
    )   
    
    class Meta:
        verbose_name = 'Instrumento Avaliativo'
        verbose_name_plural = 'Instrumentos Avaliativos'
        ordering = ['data_inicio']
    
    def __str__(self):
        return f"{self.titulo} - {self.avaliacao}"

    def clean(self):
        """Validações de regras de negócio."""
        from django.core.exceptions import ValidationError
        
        if self.avaliacao_id:
            # Se MEDIA_PONDERADA, valor deve ser 10
            if self.avaliacao.tipo_calculo_instrumentos == 'MEDIA_PONDERADA' and self.valor != Decimal('10.00'):
                raise ValidationError('Para média ponderada, o valor de cada instrumento deve ser 10.')
            
            # Se SOMA, verificar que soma dos instrumentos não ultrapassa valor da avaliação
            if self.avaliacao.tipo_calculo_instrumentos == 'SOMA':
                soma_instrumentos = InstrumentoAvaliativo.objects.filter(
                    avaliacao=self.avaliacao
                ).exclude(pk=self.pk).aggregate(total=models.Sum('valor'))['total'] or Decimal('0.00')
                
                if soma_instrumentos + self.valor > self.avaliacao.valor:
                    raise ValidationError(
                        f'A soma dos instrumentos ({soma_instrumentos} + {self.valor}) '
                        f'ultrapassa o valor da avaliação ({self.avaliacao.valor}).'
                    )
    

class ControleVisto(UUIDModel):
    """Registro de visto de um estudante, opcionalmente vinculado a um instrumento."""
    
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
    instrumento_avaliativo = models.ForeignKey(
        InstrumentoAvaliativo,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='vistos',
        verbose_name='Instrumento Avaliativo',
        help_text='Deixe vazio se o visto não está vinculado a nenhum instrumento'
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
    
    class Meta:
        verbose_name = 'Visto'
        verbose_name_plural = 'Vistos'
        unique_together = ['matricula_turma', 'professor_disciplina_turma', 'titulo']
    
    def __str__(self):
        status = 'Sim' if self.visto is True else ('Não' if self.visto is False else 'N/A')
        return f"{self.titulo} - {status}"


class NotaInstrumentoAvaliativo(UUIDModel):
    """Nota de um estudante em um instrumento avaliativo."""
    
    instrumento_avaliativo = models.ForeignKey(
        InstrumentoAvaliativo,
        on_delete=models.CASCADE,
        related_name='notas'
    )
    matricula_turma = models.ForeignKey(
        MatriculaTurma,
        on_delete=models.CASCADE,
        related_name='notas_instrumentos'
    )
    
    valor = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('10.00'))],
        verbose_name='Nota'
    )
    
    class Meta:
        verbose_name = 'Nota de Instrumento Avaliativo'
        verbose_name_plural = 'Notas de Instrumentos Avaliativos'
        unique_together = ['instrumento_avaliativo', 'matricula_turma']
    
    def __str__(self):
        return f"{self.instrumento_avaliativo.titulo} - {self.matricula_turma}"

    def clean(self):
        """Validações de regras de negócio."""
        from django.core.exceptions import ValidationError
        
        # Nota não pode ultrapassar o valor máximo do instrumento
        if self.valor and self.instrumento_avaliativo_id:
            if self.valor > self.instrumento_avaliativo.valor:
                raise ValidationError(
                    f'A nota ({self.valor}) não pode ser maior que o valor máximo '
                    f'do instrumento ({self.instrumento_avaliativo.valor}).'
                )

    def calcular_nota_por_vistos(self):
        """Calcula a nota com base nos vistos, se o instrumento usa vistos."""
        if not self.instrumento_avaliativo.usa_vistos:
            return None
            
        vistos = ControleVisto.objects.filter(
            instrumento_avaliativo=self.instrumento_avaliativo,
            matricula_turma=self.matricula_turma,
            visto__isnull=False  # Ignora None
        )
        
        total = vistos.count()
        if total == 0:
            return Decimal('0.00')
        
        feitos = vistos.filter(visto=True).count()
        porcentagem = Decimal(feitos) / Decimal(total)
        
        return (porcentagem * self.instrumento_avaliativo.valor).quantize(Decimal('0.01'))


class NotaAvaliacao(UUIDModel):
    """Nota de um estudante em uma avaliação (calculada a partir dos instrumentos)."""
    
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
    
    valor = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('10.00'))],
        verbose_name='Nota'
    )
    
    class Meta:
        verbose_name = 'Nota de Avaliação'
        verbose_name_plural = 'Notas de Avaliações'
        unique_together = ['avaliacao', 'matricula_turma']
    
    def __str__(self):
        return f"{self.avaliacao} - {self.matricula_turma}"

    def calcular_nota(self):
        """
        Calcula a nota da avaliação com base nas notas dos instrumentos.
        
        SOMA: nota = soma das notas dos instrumentos
        MEDIA_PONDERADA: nota = valor_avaliacao * 0.1 * Σ(peso×nota) / Σ(peso)
        """
        notas_instrumentos = NotaInstrumentoAvaliativo.objects.filter(
            instrumento_avaliativo__avaliacao=self.avaliacao,
            matricula_turma=self.matricula_turma,
            valor__isnull=False
        ).select_related('instrumento_avaliativo')
        
        if not notas_instrumentos.exists():
            return None
        
        if self.avaliacao.tipo_calculo_instrumentos == 'SOMA':
            total = sum(n.valor for n in notas_instrumentos)
            return min(total, self.avaliacao.valor)  # Limita ao valor máximo da avaliação
        
        elif self.avaliacao.tipo_calculo_instrumentos == 'MEDIA_PONDERADA':
            soma_ponderada = sum(n.instrumento_avaliativo.peso * n.valor for n in notas_instrumentos)
            soma_pesos = sum(n.instrumento_avaliativo.peso for n in notas_instrumentos)
            
            if soma_pesos == 0:
                return Decimal('0.00')
            
            # Fórmula: x * 0.1 * Σ(peso*nota) / Σ(peso)
            nota = self.avaliacao.valor * Decimal('0.1') * soma_ponderada / soma_pesos
            return nota.quantize(Decimal('0.01'))
        
        return None


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

    nota = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('10.00'))],
        verbose_name='Nota'
    )
    
    class Meta:
        verbose_name = 'Nota Bimestral'
        verbose_name_plural = 'Notas Bimestrais'
        unique_together = ['matricula_turma', 'professor_disciplina_turma']
        ordering = ['matricula_turma']
    
    def __str__(self):
        return f"{self.matricula_turma} - {self.professor_disciplina_turma.disciplina_turma.disciplina}"


class NotificacaoRecuperacao(UUIDModel):
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
