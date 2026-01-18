from django.db import models
from django.conf import settings
from apps.core.models import UUIDModel

class Atestado(UUIDModel):
    """Atestado médico de um usuário."""
    
    usuario_alvo = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='atestados'
    )
    data_inicio = models.DateTimeField(verbose_name='Data/Hora Início')
    data_fim = models.DateTimeField(verbose_name='Data/Hora Fim')
    protocolo_prefeitura = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='Protocolo da Prefeitura'
    )
    arquivo = models.FileField(upload_to='atestados/', verbose_name='Arquivo')
    criado_em = models.DateTimeField(auto_now_add=True)
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='atestados_criados'
    )

    def is_owner(self, user) -> bool:
        if not user or user.is_anonymous or not user.is_active:
            return False

        return self.criado_por == user
    
    class Meta:
        verbose_name = 'Atestado'
        verbose_name_plural = 'Atestados'
        ordering = ['-data_inicio']
    
    def __str__(self):
        return f"Atestado - {self.usuario_alvo} ({self.data_inicio.strftime('%d/%m/%Y')})"
