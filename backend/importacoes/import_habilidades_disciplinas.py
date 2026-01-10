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

from apps.core.models import Habilidade, Disciplina

def import_habilidades_disciplinas(json_path):
    """
    Importa a relação entre Habilidades BNCC e Disciplinas a partir de um arquivo JSON.
    """
    if not os.path.exists(json_path):
        print(f"Erro: Arquivo não encontrado em {json_path}")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Iniciando importação de vínculos entre Habilidades e Disciplinas a partir de {json_path}...")
    
    contador_vinculados = 0
    contador_erros = 0
    
    # Cache para evitar consultas repetitivas ao banco
    cache_habilidades = {}
    cache_disciplinas = {}

    for item in data:
        sigla_disciplina = item.get('SIGLA_DISCIPLINA')
        sigla_habilidade = item.get('SIGLA_HABILIDADE')

        if not sigla_disciplina or not sigla_habilidade:
            continue

        # Busca ou usa cache para disciplina
        if sigla_disciplina not in cache_disciplinas:
            disciplina = Disciplina.objects.filter(sigla=sigla_disciplina).first()
            cache_disciplinas[sigla_disciplina] = disciplina
        else:
            disciplina = cache_disciplinas[sigla_disciplina]

        # Busca ou usa cache para habilidade
        if sigla_habilidade not in cache_habilidades:
            habilidade = Habilidade.objects.filter(codigo=sigla_habilidade).first()
            cache_habilidades[sigla_habilidade] = habilidade
        else:
            habilidade = cache_habilidades[sigla_habilidade]

        if not disciplina:
            print(f"Erro: Disciplina com sigla '{sigla_disciplina}' não encontrada.")
            contador_erros += 1
            continue
        
        if not habilidade:
            print(f"Erro: Habilidade com código '{sigla_habilidade}' não encontrada.")
            contador_erros += 1
            continue

        # Verifica se já está vinculado
        if not disciplina.habilidades.filter(id=habilidade.id).exists():
            disciplina.habilidades.add(habilidade)
            contador_vinculados += 1

    print(f"\nImportação finalizada!")
    print(f"- Novos vínculos criados: {contador_vinculados}")
    print(f"- Erros (registros não encontrados): {contador_erros}")

if __name__ == "__main__":
    JSON_FILE = IMPORT_DIR / 'dados_base' / 'habilidades_disciplina.json'
    import_habilidades_disciplinas(str(JSON_FILE.resolve()))
