"""
App Pedagogical - Diário de Classe, Planos de Aula, Faltas, Ocorrências
"""
from django.db import models
from django.contrib.auth import get_user_model
from apps.core.models import Funcionario, Disciplina, Turma, Habilidade, ProfessorDisciplinaTurma, UUIDModel, Arquivo
from apps.academic.models import Estudante, Responsavel
from ckeditor.fields import RichTextField


# =============================================================================
# PLANOS DE AULA E DIÁRIO DE CLASSE
# =============================================================================

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
    conteudo = RichTextField(verbose_name='Conteúdo Ministrado', blank=True, null=True)
    numero_aulas = models.PositiveSmallIntegerField(
        default=2,
        verbose_name='Número de Aulas (Geminadas)'
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    bimestre = models.PositiveSmallIntegerField(
        choices=[(0, 'Anual'), (1, '1º Bimestre'), (2, '2º Bimestre'), (3, '3º Bimestre'), (4, '4º Bimestre')],
        default=0,
        verbose_name='Bimestre'
    )
    
    
    class Meta:
        verbose_name = 'Aula'
        verbose_name_plural = 'Aulas'
        ordering = ['-data']
        unique_together = ['professor_disciplina_turma', 'data']
    
    def __str__(self):
        return f"{self.professor_disciplina_turma} - {self.data.strftime('%d/%m/%Y')}"

    def save(self, *args, **kwargs):
        # Tenta calcular/atualizar o bimestre sempre antes de salvar
        # Isso garante correção se a data for alterada na edição
        if self.data and self.professor_disciplina_turma_id:
            try:
                # Importação local para evitar ciclo
                from apps.pedagogical.validators import _identificar_bimestre
                from apps.core.models import AnoLetivo
                
                # Acessa diretamente (se falhar, cai no except)
                turma = self.professor_disciplina_turma.disciplina_turma.turma
                
                # Busca AnoLetivo (cacheado se possível ou query leve)
                ano_letivo = AnoLetivo.objects.filter(ano=turma.ano_letivo).first()
                
                if ano_letivo and ano_letivo.controles:
                    # Usa validador para identificar bimestre
                    bim_encontrado = _identificar_bimestre(ano_letivo.controles, self.data.isoformat())
                    if bim_encontrado:
                        self.bimestre = bim_encontrado
            except Exception:
                # Em caso de erro (ex: dados incompletos), mantém o valor atual ou default
                pass
                
        super().save(*args, **kwargs)


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
    aulas_faltas = models.JSONField(
        verbose_name='Índice das Aulas com Falta',
        default=list,
        null=True,
        blank=True
    )

    @property
    def qtd_faltas(self):
        """Retorna a quantidade de faltas para compatibilidade."""
        return len(self.aulas_faltas) if self.aulas_faltas else 0

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.aulas_faltas:
            # Valida se os índices das faltas são válidos para o número de aulas
            # Vamos assumir lista de inteiros.
            for falta_idx in self.aulas_faltas:
                if not isinstance(falta_idx, int):
                    raise ValidationError('A lista de faltas deve conter apenas números inteiros.')
                if falta_idx > self.aula.numero_aulas or falta_idx < 1:
                     raise ValidationError(f'O índice de falta {falta_idx} é inválido para uma aula com {self.aula.numero_aulas} aulas.')

            if len(self.aulas_faltas) > self.aula.numero_aulas:
                raise ValidationError('A quantidade de faltas não pode ser maior que o número de aulas.')
    
    class Meta:
        verbose_name = 'Falta'
        verbose_name_plural = 'Faltas'
        unique_together = ['aula', 'estudante']
    
    def __str__(self):
        return f"{self.estudante} - Falta na aula {self.qtd_faltas} ({self.aula.data})"


# =============================================================================
# OCORRÊNCIAS PEDAGÓGICAS
# =============================================================================

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
    bimestre = models.PositiveSmallIntegerField(
        choices=[(0, 'Anual'), (1, '1º Bimestre'), (2, '2º Bimestre'), (3, '3º Bimestre'), (4, '4º Bimestre')],
        default=0,
        verbose_name='Bimestre'
    )
    
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


# =============================================================================
# ATIVIDADES PEDAGÓGICAS
# =============================================================================

class Atividade(UUIDModel):
    """
    Atividade pedagógica cadastrada pelo professor para uma ou mais turmas.
    """
    
    titulo = models.CharField(max_length=255, verbose_name='Título')
    descricao = models.TextField(verbose_name='Descrição', null=True, blank=True)
    
    turmas_professores = models.ManyToManyField(
        ProfessorDisciplinaTurma,
        related_name='atividades',
        verbose_name='Professores/Disciplinas/Turmas'
    )
    
    arquivos = models.ManyToManyField(
        Arquivo,
        blank=True,
        related_name='avaliacoes',
        verbose_name='Arquivos'
    )
    habilidades = models.ManyToManyField(
        Habilidade,
        related_name='atividades',
        blank=True
    )
    
    data_inicio = models.DateField(verbose_name='Data de início da avaliação')
    data_fim = models.DateField(verbose_name='Data de fim da avaliação')
    com_visto = models.BooleanField(default=False, verbose_name='Com Visto')
    
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    
    criado_por = models.ForeignKey(
        get_user_model(),
        on_delete=models.CASCADE,
        related_name='atividades_criadas',
        verbose_name='Criado por'
    )
    
    class Meta:
        verbose_name = 'Atividade'
        verbose_name_plural = 'Atividades'
        ordering = ['-data_inicio', 'titulo']

    def __str__(self):
        return self.titulo

