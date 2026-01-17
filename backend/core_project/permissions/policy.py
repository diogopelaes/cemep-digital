"""
Sistema de Permissões Declarativo para Django Rest Framework.
Permite definir políticas de CRUD de forma declarativa nas views.
"""
from rest_framework.permissions import BasePermission
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


def Policy(*, create=None, read=None, update=None, delete=None, custom=None):
    """
    Factory que cria uma classe de permissão configurada.
    
    Uso:
        permission_classes = [Policy(
            create=[GESTAO, SECRETARIA],
            read=AUTHENTICATED,
            update=[GESTAO],
            delete=NONE,
            custom={'minha_action': [GESTAO]}
        )]
    
    Suporta:
    - Tipos de usuário (GESTAO, SECRETARIA, PROFESSOR, MONITOR, ESTUDANTE, RESPONSAVEL)
    - AUTHENTICATED (qualquer usuário autenticado)
    - OWNER (dono do objeto via model.is_owner())
    - FUNCIONARIO (grupo expandido para GESTAO, SECRETARIA, PROFESSOR, MONITOR)
    - NONE (bloqueia a operação)
    - Custom actions
    
    Nota: Para OWNER, todos os models herdam de UUIDModel que possui o método is_owner().
    O método retorna False por padrão e pode ser sobrescrito em cada model conforme necessário.
    """
    
    def _normalize(value):
        """Normaliza o valor da regra para um set, expandindo FUNCIONARIO se necessário."""
        if value is None:
            return set()
        if isinstance(value, (list, tuple, set)):
            result = set(value)
        else:
            result = {value}
        
        # Expande FUNCIONARIO para os tipos correspondentes
        if FUNCIONARIO in result:
            result.discard(FUNCIONARIO)
            result.update(FUNCIONARIO_TIPOS)
        
        return result
    
    # Pré-processa as regras
    rules = {
        "create": _normalize(create),
        "read": _normalize(read),
        "update": _normalize(update),
        "delete": _normalize(delete),
    }
    custom_rules = custom or {}
    
    class ConfiguredPolicy(BasePermission):
        """Classe de permissão configurada dinamicamente."""
        
        def _get_rule(self, view):
            """Retorna a regra de permissão para a action atual."""
            action = view.action
            
            # Verifica se é uma custom action
            if action in custom_rules:
                return _normalize(custom_rules[action])
            
            # Actions CRUD padrão
            if action == "create":
                return rules["create"]
            if action in READ_ACTIONS:
                return rules["read"]
            if action in UPDATE_ACTIONS:
                return rules["update"]
            if action in DELETE_ACTIONS:
                return rules["delete"]
            
            # Action não mapeada - bloqueia por padrão
            return set()

        def has_permission(self, request, view):
            """Verifica permissão no nível de request/view."""
            rule = self._get_rule(view)

            # Sem regra ou regra NONE = bloqueado
            if not rule or NONE in rule:
                return False

            # Qualquer usuário autenticado
            if AUTHENTICATED in rule:
                return request.user.is_authenticated

            # Verificação por tipo de usuário
            if (
                request.user.is_authenticated
                and hasattr(request.user, 'tipo_usuario')
                and request.user.tipo_usuario in rule
            ):
                return True

            # OWNER só é validado no nível do objeto
            # Aqui permitimos para checar depois em has_object_permission
            if OWNER in rule:
                return request.user.is_authenticated

            return False

        def has_object_permission(self, request, view, obj):
            """Verifica permissão no nível de objeto (OWNER check)."""
            rule = self._get_rule(view)

            # Se OWNER não está na regra, permite (já passou no has_permission)
            if OWNER not in rule:
                return True

            # Verificar se o tipo de usuário também está na regra (OWNER + tipo)
            # Se sim, permitir sem verificar ownership
            if (
                hasattr(request.user, 'tipo_usuario')
                and request.user.tipo_usuario in rule
            ):
                return True

            # Todos os models herdam de UUIDModel e possuem is_owner
            # O método retorna False por padrão e é sobrescrito quando necessário
            return obj.is_owner(request.user)
    
    return ConfiguredPolicy
