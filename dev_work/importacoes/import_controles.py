import re
from datetime import date
import json
import os
from paths import DATA_DIR, setup_django

# Configuração do Django
setup_django()

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
    JSON_FILE = DATA_DIR / 'controle.json'
    import_controles(str(JSON_FILE.resolve()))





