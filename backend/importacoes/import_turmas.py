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

from apps.core.models import Turma, Curso

def import_turmas(json_path):
    """
    Importa as turmas a partir de um arquivo JSON.
    """
    if not os.path.exists(json_path):
        print(f"Erro: Arquivo não encontrado em {json_path}")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Mapeamento de nomenclatura para o choice do Model
    nomenclatura_map = {
        'Série': Turma.Nomenclatura.SERIE,
        'Ano': Turma.Nomenclatura.ANO,
        'Módulo': Turma.Nomenclatura.MODULO
    }

    print(f"Iniciando importação de turmas a partir de {json_path}...")
    
    contador_criados = 0
    contador_atualizados = 0

    for item in data:
        numero = item.get('numero')
        letra = item.get('letra')
        ano_letivo = item.get('ano_letivo')
        nomen_str = item.get('nomenclatura')
        sigla_curso = item.get('sigla_curso')

        try:
            curso = Curso.objects.get(sigla=sigla_curso)
        except Curso.DoesNotExist:
            print(f"Erro: Curso com sigla '{sigla_curso}' não encontrado. Pulando turma {numero}{letra}.")
            continue

        nomenclatura = nomenclatura_map.get(nomen_str, Turma.Nomenclatura.ANO)

        obj, created = Turma.objects.update_or_create(
            numero=numero,
            letra=letra,
            ano_letivo=ano_letivo,
            curso=curso,
            defaults={
                'nomenclatura': nomenclatura,
                'is_active': True
            }
        )
        
        if created:
            contador_criados += 1
            print(f"Turma inserida: {obj}")
        else:
            contador_atualizados += 1
            print(f"Turma atualizada: {obj}")

    print(f"\nImportação finalizada!")
    print(f"- Turmas criadas: {contador_criados}")
    print(f"- Turmas atualizados: {contador_atualizados}")

if __name__ == "__main__":
    JSON_FILE = IMPORT_DIR / 'dados_base' / 'turmas.json'
    import_turmas(str(JSON_FILE.resolve()))
