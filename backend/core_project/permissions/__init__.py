# Core Project Permissions
# Sistema declarativo de permissões para Django Rest Framework

from core_project.permissions.constants import (
    GESTAO,
    SECRETARIA,
    PROFESSOR,
    MONITOR,
    ESTUDANTE,
    RESPONSAVEL,
    AUTHENTICATED,
    OWNER,
    NONE,
    FUNCIONARIO,
    FUNCIONARIO_TIPOS,
)

from core_project.permissions.utils import (
    READ_ACTIONS,
    UPDATE_ACTIONS,
    DELETE_ACTIONS,
)

from core_project.permissions.policy import Policy

from core_project.permissions.file_permissions import (
    IsFuncionario,
    IsGestaoOrSecretaria,
    IsGestao,
)

__all__ = [
    # Tipos de usuário
    'GESTAO',
    'SECRETARIA',
    'PROFESSOR',
    'MONITOR',
    'ESTUDANTE',
    'RESPONSAVEL',
    # Constantes especiais
    'AUTHENTICATED',
    'OWNER',
    'NONE',
    'FUNCIONARIO',
    'FUNCIONARIO_TIPOS',
    # Actions sets
    'READ_ACTIONS',
    'UPDATE_ACTIONS',
    'DELETE_ACTIONS',
    # Policy class
    'Policy',
    # Role-based permission classes
    'IsFuncionario',
    'IsGestaoOrSecretaria',
    'IsGestao',
]

