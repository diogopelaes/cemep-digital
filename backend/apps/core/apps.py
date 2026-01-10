from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.core'
    verbose_name = 'Cadastros Base'

    def ready(self):
        # Registra os signals para auto-rebuild de grade_horaria
        import apps.core.signals  # noqa: F401
