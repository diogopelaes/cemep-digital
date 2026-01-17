import uuid
from django.db import models

class UUIDModel(models.Model):
    """Classe base para usar UUID como chave primária."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    def is_owner(self, user) -> bool:
        """
        Verifica se o usuário é o 'dono' deste registro.
        
        Retorna False por padrão. Sobrescreva este método nos models
        que possuem lógica de ownership (ex: PlanoAula, Avaliacao).
        """
        return False

    class Meta:
        abstract = True

