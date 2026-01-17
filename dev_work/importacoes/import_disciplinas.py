import re
import csv
import json
import os
from paths import DATA_DIR, setup_django

# Configuração do Django
setup_django()

from apps.core.models import Disciplina

def import_disciplinas(csv_path):
    """
    Importa disciplinas a partir de um arquivo CSV.
    """
    if not os.path.exists(csv_path):
        print(f"Erro: Arquivo não encontrado em {csv_path}")
        return

    print(f"Iniciando importação de disciplinas a partir de {csv_path}...")

    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        criados = 0
        atualizados = 0

        for row in reader:
            nome = row['NOME'].strip()
            sigla = row['SIGLA'].strip()
            area_raw = row['AREA CONHECIMENTO'].strip()
            
            # Mapeamento básico de Area Conhecimento (substituir espaços por underscore)
            area_conhecimento = area_raw.replace(' ', '_')

            # Verifica se o valor mapeado existe nas choices do model
            valid_choices = [choice[0] for choice in Disciplina.AreaConhecimento.choices]
            if area_conhecimento not in valid_choices:
                print(f"Aviso: Área de conhecimento '{area_conhecimento}' não reconhecida para a disciplina '{nome}'.")
                # Se não for válido, podemos deixar nulo ou tentar um mapeamento mais robusto se necessário

            obj, created = Disciplina.objects.update_or_create(
                nome=nome,
                sigla=sigla,
                defaults={
                    'area_conhecimento': area_conhecimento if area_conhecimento in valid_choices else None,
                    'is_active': True
                }
            )

            if created:
                criados += 1
                print(f"Disciplina inserida: {nome} ({sigla})")
            else:
                atualizados += 1

    print(f"\nImportação finalizada!")
    print(f"- Disciplinas novas: {criados}")
    print(f"- Disciplinas atualizadas: {atualizados}")

if __name__ == "__main__":
    CSV_FILE = DATA_DIR / 'disciplinas.csv'
    import_disciplinas(str(CSV_FILE.resolve()))





