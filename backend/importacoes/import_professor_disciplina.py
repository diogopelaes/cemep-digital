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

from apps.core.models import Funcionario, DisciplinaTurma, ProfessorDisciplinaTurma

def import_professor_disciplina(json_path):
    """
    Importa as atribuições de professores a disciplinas/turmas a partir de um arquivo JSON.
    """
    if not os.path.exists(json_path):
        print(f"Erro: Arquivo não encontrado em {json_path}")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Iniciando importação de ProfessorDisciplinaTurma a partir de {json_path}...")
    
    contador_atribuicoes = 0
    contador_erros = 0

    for item in data:
        matricula = item.get('matricula_professor')
        disciplina_sigla = item.get('disciplina_sigla')
        
        if not matricula or not disciplina_sigla:
            continue
            
        try:
            # 1. Encontrar o professor
            # O usuário sugeriu Funcionario.objects.get(usuario=matricula_professor)
            # No sistema, o username do usuário é a matrícula.
            try:
                professor = Funcionario.objects.get(usuario__username=str(matricula))
            except Funcionario.DoesNotExist:
                # Fallback pela matrícula direta no model Funcionario
                try:
                    professor = Funcionario.objects.get(matricula=int(matricula))
                except (Funcionario.DoesNotExist, ValueError):
                    print(f"Erro: Professor com matrícula '{matricula}' não encontrado.")
                    contador_erros += 1
                    continue

            # 2. Split disciplinas
            lista_siglas = [s.strip() for s in str(disciplina_sigla).split(',')]

            # 3. DisciplinaTurma objects
            # Como o model DisciplinaTurma não possui o campo is_active diretamente,
            # filtramos pela Turma ativa, que é a regra de negócio para atribuições vigentes.
            disciplina_turma_objects = DisciplinaTurma.objects.filter(
                disciplina__sigla__in=lista_siglas,
                turma__is_active=True
            )

            if not disciplina_turma_objects.exists():
                # print(f"Aviso: Nenhuma DisciplinaTurma ativa encontrada para as siglas {lista_siglas}")
                pass

            # 4. update_or_create
            for dt in disciplina_turma_objects:
                obj, created = ProfessorDisciplinaTurma.objects.update_or_create(
                    professor=professor,
                    disciplina_turma=dt,
                    defaults={
                        'tipo': ProfessorDisciplinaTurma.TipoProfessor.TITULAR,
                        'data_inicio': date(2026, 1, 20)
                    }
                )
                if created:
                    contador_atribuicoes += 1
                
        except Exception as e:
            print(f"Erro ao processar professor {matricula}: {str(e)}")
            contador_erros += 1

    print(f"\nImportação finalizada!")
    print(f"- Atribuições vinculadas: {contador_atribuicoes}")
    # Nota: atribuições já existentes são apenas atualizadas e não contadas no contador_atribuicoes acima se já existiam
    print(f"- Erros ocorridos: {contador_erros}")

if __name__ == "__main__":
    JSON_FILE = IMPORT_DIR / 'dados_base' / 'professor_disciplina.json'
    import_professor_disciplina(str(JSON_FILE.resolve()))
