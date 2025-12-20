from django.apps import AppConfig


class PermanentConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.permanent'
    verbose_name = 'Arquivo Permanente'

