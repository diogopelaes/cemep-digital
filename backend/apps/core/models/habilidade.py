from django.db import models
from ckeditor.fields import RichTextField
from .base import UUIDModel

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
