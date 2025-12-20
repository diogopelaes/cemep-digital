"""
Migration para renomear carga_horaria para aulas_semanais em DisciplinaTurma.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_disciplina_area_conhecimento'),
    ]

    operations = [
        migrations.RenameField(
            model_name='disciplinaturma',
            old_name='carga_horaria',
            new_name='aulas_semanais',
        ),
    ]

