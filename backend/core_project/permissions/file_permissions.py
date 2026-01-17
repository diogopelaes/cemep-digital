"""
Classes de Permissão Baseadas em Role.

Classes BasePermission reutilizáveis para verificar tipo de usuário.
Usadas principalmente pelo ProtectedMediaView para controle de acesso a arquivos.
"""
from rest_framework.permissions import BasePermission
from core_project.permissions.constants import FUNCIONARIO_TIPOS, GESTAO, SECRETARIA


class IsFuncionario(BasePermission):
    """
    Permite acesso apenas a funcionários.
    Funcionários: GESTAO, SECRETARIA, PROFESSOR, MONITOR
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return getattr(request.user, 'tipo_usuario', None) in FUNCIONARIO_TIPOS


class IsGestaoOrSecretaria(BasePermission):
    """
    Permite acesso apenas a Gestão ou Secretaria.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return getattr(request.user, 'tipo_usuario', None) in {GESTAO, SECRETARIA}


class IsGestao(BasePermission):
    """
    Permite acesso apenas a Gestão.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return getattr(request.user, 'tipo_usuario', None) == GESTAO
