from django.db import models
from .base import UUIDModel

from .habilidade import Habilidade

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
        Habilidade,
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
