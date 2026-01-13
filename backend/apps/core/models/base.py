import uuid
from django.db import models

class UUIDModel(models.Model):
    """Classe base para usar UUID como chave primária."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True
