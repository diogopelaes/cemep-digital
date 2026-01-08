import os
import sys
import json
import django
from pathlib import Path
from datetime import date

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

from apps.core.models import AnoLetivo, ControleRegistrosVisualizacao

def to_date(date_str):
    return date.fromisoformat(date_str) if date_str else None

def import_controles(json_path, ano_referencia=2026):
    """
    Importa os períodos de controle para registros e visualizações.
    """
    if not os.path.exists(json_path):
        print(f"Erro: Arquivo não encontrado em {json_path}")
        return

    try:
        ano_letivo = AnoLetivo.objects.get(ano=ano_referencia)
    except AnoLetivo.DoesNotExist:
        print(f"Erro: Ano Letivo {ano_referencia} não encontrado.")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Iniciando importação de controles para o Ano Letivo {ano_referencia}...")
    
    contador = 0

    for bim_data in data:
        bimestre = bim_data.get('bimestre')
        for ctrl in bim_data.get('controles', []):
            tipo = ctrl.get('tipo')
            data_inicio = to_date(ctrl.get('data_inicio'))
            data_fim = to_date(ctrl.get('data_fim'))
            digitacao_futura = ctrl.get('digitacao_futura', False)

            # O AnoLetivo cria registros iniciais no save(), então usamos update_or_create
            obj, created = ControleRegistrosVisualizacao.objects.update_or_create(
                ano_letivo=ano_letivo,
                bimestre=bimestre,
                tipo=tipo,
                defaults={
                    'data_inicio': data_inicio,
                    'data_fim': data_fim,
                    'digitacao_futura': digitacao_futura
                }
            )
            contador += 1

    # Crucial: Atualizar o cache JSON no AnoLetivo
    print("Sincronizando cache de controles no objeto AnoLetivo...")
    ano_letivo.atualizar_controles_json()

    print(f"Sucesso! {contador} controles processados para o ano {ano_referencia}.")

if __name__ == "__main__":
    JSON_FILE = IMPORT_DIR / 'dados_base' / 'controle.json'
    import_controles(str(JSON_FILE.resolve()))
