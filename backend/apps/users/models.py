"""
App Users - Gestão de Acesso e Perfis
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Modelo customizado de usuário com perfis e preferências."""
    
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
    telefone = models.CharField(max_length=15, blank=True, verbose_name='Telefone')
    foto = models.ImageField(upload_to='profile_pics/', null=True, blank=True, verbose_name='Foto')
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

