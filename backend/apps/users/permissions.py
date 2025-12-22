"""
Controle de Acesso Centralizado - CEMEP Digital

Este módulo centraliza TODA a lógica de controle de acesso do sistema.
Organizado em:
1. Classes de Permissão (BasePermission): Verificam o tipo de usuário.
2. Mixins para ViewSets: Aplicam permissões automaticamente baseado na 'action'.

Siglas CRUD:
- C: Create (Criar)
- R: Read (Ler - List/Retrieve)
- U: Update (Atualizar - Update/Partial Update)
- D: Delete (Excluir)
"""
from rest_framework.permissions import BasePermission, IsAuthenticated


# =============================================================================
# CLASSES DE PERMISSÃO BASE (Verificam o Perfil)
# =============================================================================

class IsGestao(BasePermission):
    """
    PERFIL: GESTAO.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.tipo_usuario == 'GESTAO'


class IsGestaoOrSecretaria(BasePermission):
    """
    PERFIS: GESTAO e SECRETARIA.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.tipo_usuario in ['GESTAO', 'SECRETARIA']


class IsFuncionario(BasePermission):
    """
    PERFIS: GESTAO, SECRETARIA, PROFESSOR e MONITOR.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.tipo_usuario in [
            'GESTAO', 'SECRETARIA', 'PROFESSOR', 'MONITOR'
        ]


class IsProfessor(BasePermission):
    """
    PERFIS: GESTAO e PROFESSOR.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.tipo_usuario in ['GESTAO', 'PROFESSOR']


class IsEstudanteOrResponsavel(BasePermission):
    """
    PERFIS: ESTUDANTE e RESPONSAVEL.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.tipo_usuario in ['ESTUDANTE', 'RESPONSAVEL']


class IsOwnerOrGestao(BasePermission):
    """
    REGRA: O próprio usuário dono do dado OU alguém do perfil GESTAO.
    """
    def has_object_permission(self, request, view, obj):
        if request.user.tipo_usuario == 'GESTAO':
            return True
        if hasattr(obj, 'usuario'):
            return obj.usuario == request.user
        return obj == request.user


# =============================================================================
# MIXINS PARA VIEWSETS (Controle CRUD Automático)
# =============================================================================

class GestaoOnlyMixin:
    """
    Permissões:
    - GESTAO: CRUD
    - OUTROS: Sem acesso
    """
    def get_permissions(self):
        return [IsGestao()]


class GestaoSecretariaMixin:
    """
    Permissões:
    - GESTAO: CRUD
    - SECRETARIA: CRUD
    - OUTROS: Sem acesso
    """
    def get_permissions(self):
        return [IsGestaoOrSecretaria()]


class GestaoWriteSecretariaReadMixin:
    """
    Permissões:
    - GESTAO: CRUD
    - SECRETARIA: R (Apenas leitura)
    - OUTROS: Sem acesso
    """
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestao()]
        return [IsGestaoOrSecretaria()]


class GestaoWriteFuncionarioReadMixin:
    """
    Permissões:
    - GESTAO: CRUD
    - SECRETARIA/PROFESSOR/MONITOR: R (Apenas leitura)
    - OUTROS: Sem acesso
    """
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestao()]
        return [IsFuncionario()]


class GestaoSecretariaWriteFuncionarioReadMixin:
    """
    Permissões:
    - GESTAO/SECRETARIA: CRUD
    - PROFESSOR/MONITOR: R (Apenas leitura)
    - OUTROS: Sem acesso
    """
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestaoOrSecretaria()]
        return [IsFuncionario()]


class GestaoWritePublicReadMixin:
    """
    Permissões:
    - GESTAO: CRUD
    - QUALQUER AUTENTICADO: R (Apenas leitura)
    """
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestao()]
        return [IsAuthenticated()]


class GestaoSecretariaWritePublicReadMixin:
    """
    Permissões:
    - GESTAO/SECRETARIA: CRUD
    - QUALQUER AUTENTICADO: R (Apenas leitura)
    """
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestaoOrSecretaria()]
        return [IsAuthenticated()]


class ProfessorWriteFuncionarioReadMixin:
    """
    Permissões:
    - GESTAO/PROFESSOR: CRUD
    - SECRETARIA/MONITOR: R (Apenas leitura)
    """
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsProfessor()]
        return [IsFuncionario()]


class FuncionarioMixin:
    """
    Permissões:
    - GESTAO/SECRETARIA/PROFESSOR/MONITOR: CRUD
    """
    def get_permissions(self):
        return [IsFuncionario()]
