from django.db import models
from .base import UUIDModel

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
