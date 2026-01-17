from django.db import models
from django.conf import settings
from .base import UUIDModel
from .calendario import AnoLetivo

class AnoLetivoSelecionado(UUIDModel):
    """Ano letivo selecionado pelo usuário para visualização de dados."""
    
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ano_letivo_selecionado'
    )
    ano_letivo = models.ForeignKey(
        AnoLetivo,
        on_delete=models.CASCADE,
        related_name='usuarios_selecionados',
        verbose_name='Ano Letivo'
    )

    def is_owner(self, user) -> bool:
        """Verifica se o usuário é o dono desta seleção."""
        return self.usuario == user

    class Meta:
        verbose_name = 'Ano Letivo Selecionado'
        verbose_name_plural = 'Anos Letivos Selecionados'

    def __str__(self):
        return f"{self.usuario} - {self.ano_letivo.ano}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if hasattr(self.usuario, 'funcionario'):
            self.usuario.funcionario.build_grade_horaria(save=True)

    def delete(self, *args, **kwargs):
        usuario = self.usuario
        super().delete(*args, **kwargs)
        if hasattr(usuario, 'funcionario'):
            usuario.funcionario.build_grade_horaria(save=True)
