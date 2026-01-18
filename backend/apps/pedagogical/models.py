"""
App Pedagogical - Diário de Classe, Planos de Aula, Faltas, Ocorrências
"""
from django.db import models
from django.contrib.auth import get_user_model
from apps.core.models import Funcionario, Disciplina, Turma, Habilidade, ProfessorDisciplinaTurma, UUIDModel, Arquivo, AnoLetivo
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
    
    def is_owner(self, user) -> bool:
        if not user or user.is_anonymous or not user.is_active:
            return False

        return self.professor.usuario == user

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
    
    def is_owner(self, user) -> bool:
        if not user or user.is_anonymous or not user.is_active:
            return False

        return ProfessorDisciplinaTurma.objects.filter(
            disciplina_turma=self.professor_disciplina_turma.disciplina_turma,
            professor__usuario=user
        ).exists()
    
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
    texto = models.CharField(max_length=100, verbose_name='Descrição do Tipo', unique=True)
    
    class Meta:
        verbose_name = 'Tipo de Ocorrência'
        verbose_name_plural = 'Tipos de Ocorrências'
        ordering = ['texto']
    
    def __str__(self):
        return self.texto

class DescritorOcorrenciaPedagogicaAnoLetivo(UUIDModel):
    """ Descritor de ocorrência pedagógica por ano letivo. """
    
    ano_letivo = models.ForeignKey(
        AnoLetivo,
        on_delete=models.CASCADE,
        related_name='descritores_ocorrencias_pedagogicas'
    )
    descritor = models.ForeignKey(
        DescritorOcorrenciaPedagogica,
        on_delete=models.CASCADE,
        related_name='descritores_ocorrencias_pedagogicas'
    )
    posicao = models.PositiveSmallIntegerField(default=0, verbose_name='Posição')
    is_active = models.BooleanField(default=True, verbose_name='Ativo')
    
    class Meta:
        verbose_name = 'Descritor de Ocorrência Pedagógica por Ano Letivo'
        verbose_name_plural = 'Descritores de Ocorrências Pedagógicas por Ano Letivo'
        unique_together = ('ano_letivo', 'descritor')
        ordering = ['posicao']
    
    def __str__(self):
        return f"{self.descritor} - {self.ano_letivo}"

    def save(self, *args, **kwargs):
        """Override save para reordenar quando o status ativo mudar ou se for novo."""
        is_new = self._state.adding
        mudou_status = False
        
        if not is_new:
            try:
                old = type(self).objects.get(pk=self.pk)
                mudou_status = old.is_active != self.is_active
            except type(self).DoesNotExist:
                pass
        
        # Se for novo e não tiver posição definida (0), coloca no fim dos ativos
        if is_new and self.posicao == 0:
            last = type(self).objects.filter(ano_letivo=self.ano_letivo, is_active=True).order_by('-posicao').first()
            self.posicao = (last.posicao + 1) if last else 1

        super().save(*args, **kwargs)
        
        if mudou_status:
            self.reordenar_por_ano_letivo(self.ano_letivo)

    @classmethod
    def reordenar_por_ano_letivo(cls, ano_letivo):
        """
        Reordena descritores usando bulk_update para performance.
        Ativos: 1, 2, 3...
        Inativos: 9001, 9002...
        """
        from django.db import transaction
        
        with transaction.atomic():
            # Busca todos ordenados por status e posição atual
            descritores = list(cls.objects.filter(ano_letivo=ano_letivo).order_by('-is_active', 'posicao'))
            
            to_update = []
            pos_ativa = 1
            pos_inativa = 9001
            
            for d in descritores:
                nova_pos = 0
                if d.is_active:
                    nova_pos = pos_ativa
                    pos_ativa += 1
                else:
                    nova_pos = pos_inativa
                    pos_inativa += 1
                
                if d.posicao != nova_pos:
                    d.posicao = nova_pos
                    to_update.append(d)
            
            if to_update:
                cls.objects.bulk_update(to_update, ['posicao'])


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

    def is_owner(self, user) -> bool:
        if not user or user.is_anonymous or not user.is_active:
            return False

        return self.criado_por == user
    
    class Meta:
        verbose_name = 'Atividade'
        verbose_name_plural = 'Atividades'
        ordering = ['-data_inicio', 'titulo']

    def __str__(self):
        return self.titulo

