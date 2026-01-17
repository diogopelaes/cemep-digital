import re
import json
import os
from paths import DATA_DIR, setup_django

# Configuração do Django
setup_django()

from apps.core.models import Habilidade

def import_habilidades(json_path):
    """
    Importa as habilidades BNCC a partir de um arquivo JSON.
    """
    if not os.path.exists(json_path):
        print(f"Erro: Arquivo não encontrado em {json_path}")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Iniciando importação de habilidades a partir de {json_path}...")
    
    contador_criados = 0
    contador_atualizados = 0

    for item in data:
        codigo = item.get('SIGLA_HABILIDADE')
        descricao = item.get('DESCRICAO_HABILIDADE')

        if not codigo or not descricao:
            continue

        obj, created = Habilidade.objects.update_or_create(
            codigo=codigo,
            defaults={
                'descricao': descricao,
                'is_active': True
            }
        )
        
        if created:
            contador_criados += 1
            # print(f"Habilidade inserida: {codigo}")
        else:
            contador_atualizados += 1
            # print(f"Habilidade atualizada: {codigo}")

    print(f"\nImportação finalizada!")
    print(f"- Habilidades criadas: {contador_criados}")
    print(f"- Habilidades atualizadas: {contador_atualizados}")

if __name__ == "__main__":
    JSON_FILE = DATA_DIR / 'habilidades.json'
    import_habilidades(str(JSON_FILE.resolve()))





