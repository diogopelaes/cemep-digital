import os
import sys
from pathlib import Path

# ==============================================================================
# Gerenciamento de caminhos e configuração do Django (Centralizado)
# ==============================================================================

# Localização deste script e raízes
IMPORT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = IMPORT_DIR.parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"

# Fontes de dados para importação
DATA_DIR = IMPORT_DIR / "dados_base"

# Localização do arquivo de ambiente (.env)
ENV_PATH = BACKEND_DIR / ".env"

def setup_django():
    """Configura o ambiente Django para os scripts de importação."""
    # Adiciona o backend ao path do sistema
    if str(BACKEND_DIR) not in sys.path:
        sys.path.insert(0, str(BACKEND_DIR))

    # Carrega o .env
    try:
        from dotenv import load_dotenv
        if ENV_PATH.exists():
            load_dotenv(ENV_PATH)
    except ImportError:
        # Se não tiver dotenv instalado, assume que o ambiente já está configurado
        pass

    # Inicializa o Django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core_project.settings')
    import django
    django.setup()
    
    print(f"--- Ambiente Django configurado (Root: {BACKEND_DIR}) ---")



