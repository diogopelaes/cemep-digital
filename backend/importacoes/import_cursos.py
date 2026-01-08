import os
import sys
import json
import django
from pathlib import Path

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

from apps.core.models import Curso

def import_cursos(json_path):
    """
    Importa os cursos a partir de um arquivo JSON.
    """
    if not os.path.exists(json_path):
        print(f"Erro: Arquivo não encontrado em {json_path}")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Iniciando importação de cursos a partir de {json_path}...")
    
    contador_criados = 0
    contador_atualizados = 0

    for item in data:
        nome = item.get('nome')
        sigla = item.get('sigla')

        obj, created = Curso.objects.update_or_create(
            sigla=sigla,
            defaults={
                'nome': nome,
                'is_active': True
            }
        )
        
        if created:
            contador_criados += 1
            print(f"Curso inserido: {nome} ({sigla})")
        else:
            contador_atualizados += 1
            print(f"Curso atualizado: {nome} ({sigla})")

    print(f"\nImportação finalizada!")
    print(f"- Cursos criados: {contador_criados}")
    print(f"- Cursos atualizados: {contador_atualizados}")

if __name__ == "__main__":
    JSON_FILE = IMPORT_DIR / 'dados_base' / 'cursos.json'
    import_cursos(str(JSON_FILE.resolve()))
