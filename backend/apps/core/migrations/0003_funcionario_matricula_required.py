# Generated manually
from django.db import migrations, models


def set_matricula_for_existing(apps, schema_editor):
    """Define matrícula para funcionários existentes que não têm."""
    Funcionario = apps.get_model('core', 'Funcionario')
    for i, func in enumerate(Funcionario.objects.filter(matricula__isnull=True), start=1):
        func.matricula = i  # Atribui um número sequencial temporário
        func.save()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_funcionario_matricula'),
    ]

    operations = [
        # Primeiro, preenche matrículas nulas com valores temporários
        migrations.RunPython(set_matricula_for_existing, migrations.RunPython.noop),
        
        # Depois, altera o campo para não aceitar nulo
        migrations.AlterField(
            model_name='funcionario',
            name='matricula',
            field=models.PositiveSmallIntegerField(
                help_text='Número de matrícula do funcionário (máximo 32767)',
                unique=True,
                verbose_name='Nº Matrícula'
            ),
        ),
    ]

