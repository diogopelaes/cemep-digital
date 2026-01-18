from django.db import models
from django.core.exceptions import ValidationError
from apps.core.models import Curso, Turma, UUIDModel
from apps.academic.validators import validate_matricula_digits
import re
from django.db.models.functions import Collate
from .estudante import Estudante

class MatriculaCEMEP(UUIDModel):
    """Matrícula central do estudante no CEMEP."""
    
    class Status(models.TextChoices):
        MATRICULADO = 'MATRICULADO', 'Matriculado'
        CONCLUIDO = 'CONCLUIDO', 'Concluído'
        ABANDONO = 'ABANDONO', 'Abandono'
        TRANSFERIDO = 'TRANSFERIDO', 'Transferido'
        OUTRO = 'OUTRO', 'Outro'
    
    numero_matricula = models.CharField(
        max_length=20,
        unique=True,
        verbose_name='Número da Matrícula',
        validators=[validate_matricula_digits],
        help_text='Números, podendo terminar com X. Só pode ser inserido por Gestão ou Secretaria.'
    )
    estudante = models.ForeignKey(
        Estudante,
        on_delete=models.CASCADE,
        related_name='matriculas_cemep'
    )
    curso = models.ForeignKey(
        Curso,
        on_delete=models.PROTECT,
        related_name='matriculas'
    )
    data_entrada = models.DateField(verbose_name='Data de Entrada no Curso')
    data_saida = models.DateField(null=True, blank=True, verbose_name='Data de Saída do Curso')
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.MATRICULADO,
        verbose_name='Status'
    )
    
    class Meta:
        verbose_name = 'Matrícula CEMEP'
        verbose_name_plural = 'Matrículas CEMEP'
        ordering = ['-data_entrada']
        unique_together = ['estudante', 'curso']
    
    def __str__(self):
        return f"{self.numero_matricula} - {self.estudante} ({self.curso.sigla})"

    def save(self, *args, **kwargs):
        if self.numero_matricula:
            # Remove formatação mas mantém X/x (converte para maiúsculo)
            self.numero_matricula = re.sub(r'[^0-9Xx]', '', str(self.numero_matricula)).upper()
        
        super().save(*args, **kwargs)

        # Propagação automática de status para turmas
        # Se o aluno sair da escola, encerra turmas ativas
        STATUS_SAIDA = [self.Status.ABANDONO, self.Status.TRANSFERIDO, self.Status.OUTRO]
        
        if self.status in STATUS_SAIDA:
            from datetime import date
            # Define data de saída (usa a data da matrícula ou hoje)
            data_fim = self.data_saida or date.today()
            
            # Atualiza matrículas em turma com status CURSANDO para o novo status
            self.matriculas_turma.filter(status='CURSANDO').update(
                status=self.status,
                data_saida=data_fim
            )

    @property
    def numero_matricula_formatado(self):
        """Retorna a matrícula formatada: XXX.XXX.XXX-X"""
        if not self.numero_matricula or len(self.numero_matricula) != 10:
            return self.numero_matricula
        return f"{self.numero_matricula[:3]}.{self.numero_matricula[3:6]}.{self.numero_matricula[6:9]}-{self.numero_matricula[9:]}"


class MatriculaTurma(UUIDModel):
    """Enturmação - vínculo do estudante com uma turma específica."""
    
    class Status(models.TextChoices):
        CURSANDO = 'CURSANDO', 'Cursando'
        TRANSFERIDO = 'TRANSFERIDO', 'Transferido'
        RETIDO = 'RETIDO', 'Retido'
        PROMOVIDO = 'PROMOVIDO', 'Promovido'
        ABANDONO = 'ABANDONO', 'Abandono'
        OUTRO = 'OUTRO', 'Outro'
    
    matricula_cemep = models.ForeignKey(
        MatriculaCEMEP,
        on_delete=models.CASCADE,
        related_name='matriculas_turma',
        verbose_name='Matrícula CEMEP'
    )
    turma = models.ForeignKey(
        Turma,
        on_delete=models.CASCADE,
        related_name='matriculas'
    )
    mumero_chamada = models.PositiveSmallIntegerField(verbose_name='Número de Chamada', default=0)
    data_entrada = models.DateField(verbose_name='Data de Entrada na Turma')
    data_saida = models.DateField(null=True, blank=True, verbose_name='Data de Saída da Turma')
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.CURSANDO,
        verbose_name='Status'
    )
    
    class Meta:
        verbose_name = 'Matrícula na Turma'
        verbose_name_plural = 'Matrículas nas Turmas'
        ordering = ['mumero_chamada','-turma__ano_letivo', 'matricula_cemep__estudante__usuario__first_name']
        unique_together = ['matricula_cemep', 'turma']
    
    def clean(self):
        """Validações de integridade da matrícula na turma."""
        # 1. Valida que o curso da matrícula CEMEP é o mesmo da turma
        if hasattr(self, 'matricula_cemep') and hasattr(self, 'turma'):
            if self.matricula_cemep.curso != self.turma.curso:
                raise ValidationError(
                    f"O curso da matrícula CEMEP ({self.matricula_cemep.curso.sigla}) "
                    f"não coincide com o curso da turma ({self.turma.curso.sigla})."
                )
        
        # 2. Valida que a data de saída não é anterior à data de entrada
        if self.data_entrada and self.data_saida:
            if self.data_saida < self.data_entrada:
                raise ValidationError(
                    'A data de saída não pode ser anterior à data de entrada.'
                )
    
    @classmethod
    def reordenar_chamada(cls, turma):
        """Reordena os números de chamada da turma alfabeticamente (PT-BR) via Banco de Dados."""
        if turma.get_ano_letivo_object.numero_chamadas_turmas_travadas:
            return

        # Busca e ordena usando Collate no banco para garantir ordem correta (pt-BR-x-icu)
        # O Collate força a ordenação correta ignorando acentos/case no PostgreSQL
        qs = cls.objects.filter(turma=turma).select_related(
            'matricula_cemep__estudante__usuario'
        ).order_by(
            Collate('matricula_cemep__estudante__usuario__first_name', 'pt-BR-x-icu'),
            'matricula_cemep__estudante__usuario__last_name'  # Desempate pelo sobrenome
        )
        
        atualizar = []
        for i, matricula in enumerate(qs, start=1):
            if matricula.mumero_chamada != i:
                matricula.mumero_chamada = i
                atualizar.append(matricula)
                
        if atualizar:
            cls.objects.bulk_update(atualizar, ['mumero_chamada'])

    def save(self, *args, **kwargs):
        # Status automático: CURSANDO se data_saida vazia
        if not self.data_saida and self.status != self.Status.CURSANDO:
            self.status = self.Status.CURSANDO
        
        # Se travado e sem número, define o próximo sequencial ao final
        if not self.mumero_chamada and self.turma.get_ano_letivo_object.numero_chamadas_turmas_travadas:
            self.mumero_chamada = self.turma.matriculas.count() + 1
        
        super().save(*args, **kwargs)
        
        # Se não estiver travado, reordena toda a turma (incluindo este registro)
        if not self.turma.get_ano_letivo_object.numero_chamadas_turmas_travadas:
            self.reordenar_chamada(self.turma)

    def delete(self, *args, **kwargs):
        turma = self.turma
        # Verifica se está travado antes de deletar
        travado = turma.get_ano_letivo_object.numero_chamadas_turmas_travadas
        
        super().delete(*args, **kwargs)
        
        # Se não estiver travado, reordena os restantes para fechar o buraco na numeração
        if not travado:
            self.reordenar_chamada(turma)

    def get_status_display(self):
        return self.Status(self.status).label
    
    def __str__(self):
        return f"{self.matricula_cemep.estudante} - {self.turma}"
