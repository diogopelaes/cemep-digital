import os
import sys
import json
import django
from pathlib import Path
from datetime import time

# Configuração de caminhos
IMPORT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = IMPORT_DIR.parent
sys.path.append(str(BACKEND_DIR))

# Carrega variáveis de ambiente
try:
    from dotenv import load_dotenv
    load_dotenv(BACKEND_DIR / '.env')
except ImportError:
    pass

# Configuração do Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core_project.settings')
django.setup()

from apps.core.models import AnoLetivo, HorarioAula

def import_horario_aula(json_path, ano_referencia=2026):
    """
    Importa os horários de aula para um determinado ano letivo.
    """
    if not os.path.exists(json_path):
        print(f"Erro: Arquivo não encontrado em {json_path}")
        return

    try:
        ano_letivo = AnoLetivo.objects.get(ano=ano_referencia)
    except AnoLetivo.DoesNotExist:
        print(f"Erro: Ano Letivo {ano_referencia} não encontrado no banco de dados.")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Iniciando importação de horários para o Ano Letivo {ano_referencia}...")
    
    contador_criados = 0
    contador_atualizados = 0

    for item in data:
        numero = item.get('numero')
        hora_inicio_str = item.get('hora_inicio')
        hora_fim_str = item.get('hora_fim')
        dias_semana = item.get('dias', [])

        # Converte strings para objetos time
        h_inicio = time.fromisoformat(hora_inicio_str)
        h_fim = time.fromisoformat(hora_fim_str)

        for dia in dias_semana:
            obj, created = HorarioAula.objects.update_or_create(
                ano_letivo=ano_letivo,
                dia_semana=dia,
                hora_inicio=h_inicio,
                defaults={
                    'numero': numero,
                    'hora_fim': h_fim
                }
            )
            
            if created:
                contador_criados += 1
            else:
                contador_atualizados += 1

    print(f"Concluído!")
    print(f"- Registros criados: {contador_criados}")
    print(f"- Registros atualizados: {contador_atualizados}")

if __name__ == "__main__":
    JSON_FILE = IMPORT_DIR / 'dados_base' / 'horario_aula_2026.json'
    import_horario_aula(str(JSON_FILE.resolve()))
