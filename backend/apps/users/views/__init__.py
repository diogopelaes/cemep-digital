"""
Views para o App Users

Re-exporta todos os ViewSets e views para manter compatibilidade.
"""
from apps.users.views.user import UserViewSet

__all__ = ['UserViewSet']

