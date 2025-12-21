"""
Permissões customizadas do sistema CEMEP Digital
controle_de_permissao - Este módulo define todas as classes de permissão do sistema.
"""
from rest_framework.permissions import BasePermission


# controle_de_permissao
class IsGestao(BasePermission):
    """Permite acesso apenas para usuários do tipo Gestão."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.tipo_usuario == 'GESTAO'


# controle_de_permissao
class IsSecretaria(BasePermission):
    """Permite acesso para Gestão ou Secretaria."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.tipo_usuario in ['GESTAO', 'SECRETARIA']


# controle_de_permissao
class IsProfessor(BasePermission):
    """Permite acesso para Gestão ou Professor."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.tipo_usuario in ['GESTAO', 'PROFESSOR']


# controle_de_permissao
class IsGestaoOrSecretaria(BasePermission):
    """Permite acesso para Gestão ou Secretaria."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.tipo_usuario in ['GESTAO', 'SECRETARIA']


# controle_de_permissao
class IsFuncionario(BasePermission):
    """Permite acesso para funcionários (Gestão, Secretaria, Professor, Monitor)."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.tipo_usuario in [
            'GESTAO', 'SECRETARIA', 'PROFESSOR', 'MONITOR'
        ]


# controle_de_permissao
class IsEstudanteOrResponsavel(BasePermission):
    """Permite acesso para Estudante ou Responsável."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.tipo_usuario in ['ESTUDANTE', 'RESPONSAVEL']


# controle_de_permissao
class IsOwnerOrGestao(BasePermission):
    """Permite acesso ao próprio objeto ou Gestão."""
    
    def has_object_permission(self, request, view, obj):
        if request.user.tipo_usuario == 'GESTAO':
            return True
        # Para objetos com campo 'usuario'
        if hasattr(obj, 'usuario'):
            return obj.usuario == request.user
        # Para objetos que são o próprio User
        return obj == request.user


