"""
Migration para renomear carga_horaria para aulas_semanais em HistoricoEscolarNotas.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('permanent', '0001_initial'),
    ]

    operations = [
        migrations.RenameField(
            model_name='historicoescolarnotas',
            old_name='carga_horaria',
            new_name='aulas_semanais',
        ),
    ]

