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
)
from core_project.permissions.utils import (
    READ_ACTIONS,
    UPDATE_ACTIONS,
    DELETE_ACTIONS,
)


class Policy(BasePermission):
    """
    Policy declarativa baseada em CRUD.
    """

    def __init__(self, *, create=None, read=None, update=None, delete=None):
        self.rules = {
            "create": self._normalize(create),
            "read": self._normalize(read),
            "update": self._normalize(update),
            "delete": self._normalize(delete),
        }

    def _normalize(self, value):
        if value is None:
            return set()
        if isinstance(value, (list, tuple, set)):
            return set(value)
        return {value}

    def _current_rule(self, view):
        if view.action == "create":
            return self.rules["create"]
        if view.action in READ_ACTIONS:
            return self.rules["read"]
        if view.action in UPDATE_ACTIONS:
            return self.rules["update"]
        if view.action in DELETE_ACTIONS:
            return self.rules["delete"]
        return set()

    def has_permission(self, request, view):
        rule = self._current_rule(view)

        if not rule:
            return False

        # Qualquer usuário autenticado
        if AUTHENTICATED in rule:
            return request.user.is_authenticated

        # Verificação por tipo de usuário
        if (
            request.user.is_authenticated
            and request.user.tipo_usuario in rule
        ):
            return True

        # OWNER só é validado no nível do objeto
        if OWNER in rule:
            return request.user.is_authenticated

        return False

    def has_object_permission(self, request, view, obj):
        rule = self._current_rule(view)

        if OWNER not in rule:
            return True

        # Padrão principal: criado_por
        if hasattr(obj, "criado_por"):
            return obj.criado_por == request.user

        # Alternativa comum: usuario
        if hasattr(obj, "usuario"):
            return obj.usuario == request.user

        return False
