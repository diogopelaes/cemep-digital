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

from apps.core.models import ProfessorDisciplinaTurma

def export_professor_disciplina_turma(output_path):
    """
    Exporta os registros de ProfessorDisciplinaTurma para um arquivo JSON
    utilizando identificadores naturais (sem IDs).
    """
    print("Iniciando exportação de ProfessorDisciplinaTurma...")
    
    atribuicoes = ProfessorDisciplinaTurma.objects.select_related(
        'professor__usuario',
        'disciplina_turma__disciplina',
        'disciplina_turma__turma__curso'
    ).all()

    data_to_export = []

    for at in atribuicoes:
        item = {
            # Identificação do Professor (pelo username do Usuário)
            "professor_username": at.professor.usuario.username,
            
            # Identificação da DisciplinaTurma
            "disciplina_sigla": at.disciplina_turma.disciplina.sigla,
            "turma_numero": at.disciplina_turma.turma.numero,
            "turma_letra": at.disciplina_turma.turma.letra,
            "turma_curso_sigla": at.disciplina_turma.turma.curso.sigla,
            
            # Dados da Atribuição
            "tipo": at.tipo,
            "data_inicio": at.data_inicio.isoformat() if at.data_inicio else None,
            "data_fim": at.data_fim.isoformat() if at.data_fim else None,
        }
        data_to_export.append(item)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data_to_export, f, indent=4, ensure_ascii=False)

    print(f"Exportação finalizada! {len(data_to_export)} registros exportados para {output_path}")

if __name__ == "__main__":
    # Salva na pasta de dados_base para manter o padrão
    OUTPUT_FILE = IMPORT_DIR / 'dados_base' / 'professor_disciplina_turma.json'
    
    # Garante que a pasta existe
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    
    export_professor_disciplina_turma(str(OUTPUT_FILE.resolve()))
