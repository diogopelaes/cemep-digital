"""
App Users - Gestão de Acesso e Perfis
"""
import os
import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.text import get_valid_filename


def get_profile_pic_path(instance, filename):
    """
    Gera o caminho da foto de perfil usando um UUID aleatório.
    Não expõe o ID do usuário na URL por segurança.
    """
    ext = os.path.splitext(filename)[1]
    # Gera um UUID aleatório para cada upload - não expõe o ID do usuário
    random_uuid = str(uuid.uuid4())
    return f'profile_pics/{random_uuid}{ext}'


class User(AbstractUser):
    """Modelo customizado de usuário com perfis e preferências."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class TipoUsuario(models.TextChoices):
        GESTAO = 'GESTAO', 'Gestão'
        SECRETARIA = 'SECRETARIA', 'Secretaria'
        PROFESSOR = 'PROFESSOR', 'Professor'
        MONITOR = 'MONITOR', 'Monitor'
        ESTUDANTE = 'ESTUDANTE', 'Estudante'
        RESPONSAVEL = 'RESPONSAVEL', 'Responsável'
    
    tipo_usuario = models.CharField(
        max_length=20, 
        choices=TipoUsuario.choices,
        default=TipoUsuario.ESTUDANTE,
        verbose_name='Tipo de Usuário'
    )
    foto = models.ImageField(upload_to=get_profile_pic_path, null=True, blank=True, verbose_name='Foto')
    dark_mode = models.BooleanField(default=False, verbose_name='Modo Escuro')
    
    class Meta:
        verbose_name = 'Usuário'
        verbose_name_plural = 'Usuários'
        ordering = ['first_name', 'last_name']
    
    def __str__(self):
        return self.get_full_name() or self.username
    
    @property
    def is_gestao(self):
        return self.tipo_usuario == self.TipoUsuario.GESTAO
    
    @property
    def is_secretaria(self):
        return self.tipo_usuario == self.TipoUsuario.SECRETARIA
    
    @property
    def is_professor(self):
        return self.tipo_usuario == self.TipoUsuario.PROFESSOR
    
    @property
    def is_estudante(self):
        return self.tipo_usuario == self.TipoUsuario.ESTUDANTE
    
    @property
    def is_responsavel(self):
        return self.tipo_usuario == self.TipoUsuario.RESPONSAVEL

    def get_ano_letivo_selecionado(self):
        """
        Retorna o objeto AnoLetivo selecionado pelo usuário.
        Se não houver seleção, retorna o ano ativo.
        Se não houver ano ativo, retorna None.
        """
        from apps.core.models import AnoLetivo, AnoLetivoSelecionado
        try:
            return self.ano_letivo_selecionado.ano_letivo
        except AnoLetivoSelecionado.DoesNotExist:
            ano_ativo = AnoLetivo.objects.filter(is_active=True).first()
            return ano_ativo if ano_ativo else None

