import re
import json
import os
from paths import DATA_DIR, setup_django

# Configuração do Django
setup_django()

from apps.core.models import Disciplina, Turma, Curso, DisciplinaTurma

def import_disciplinas_turmas(json_path):
    """
    Importa os relacionamentos entre Disciplinas e Turmas a partir de um arquivo JSON.
    """
    if not os.path.exists(json_path):
        print(f"Erro: Arquivo não encontrado em {json_path}")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Iniciando importação de DisciplinaTurma a partir de {json_path}...")
    
    contador_criados = 0
    contador_atualizados = 0
    contador_erros = 0

    # Ano letivo padrão - baseado nos dados base existentes (2026)
    ANO_LETIVO_PADRAO = 2026

    for item in data:
        turma_data = item.get('turma')
        if not turma_data:
            continue
            
        numero = turma_data.get('numero')
        letra = turma_data.get('letra')
        sigla_curso = turma_data.get('curso')
        disciplinas = turma_data.get('disciplinas', [])

        try:
            # Localiza o Curso
            curso = Curso.objects.get(sigla=sigla_curso)
            # Localiza a Turma
            turma = Turma.objects.get(
                numero=numero, 
                letra=letra, 
                curso=curso, 
                ano_letivo=ANO_LETIVO_PADRAO
            )
        except Curso.DoesNotExist:
            print(f"Erro: Curso '{sigla_curso}' não encontrado. Pulando turma {numero}{letra}.")
            contador_erros += 1
            continue
        except Turma.DoesNotExist:
            print(f"Erro: Turma {numero}{letra} do curso '{sigla_curso}' ({ANO_LETIVO_PADRAO}) não encontrada. Pulando disciplinas.")
            contador_erros += 1
            continue
        except Exception as e:
            print(f"Erro inesperado ao buscar turma {numero}{letra}: {str(e)}")
            contador_erros += 1
            continue

        for disc_data in disciplinas:
            sigla_disc = disc_data.get('sigla')
            aulas_semanais = disc_data.get('aulas_semanais', 4)

            try:
                # Localiza a Disciplina
                disciplina = Disciplina.objects.get(sigla=sigla_disc)
                
                # Cria ou Atualiza o relacionamento DisciplinaTurma
                obj, created = DisciplinaTurma.objects.update_or_create(
                    disciplina=disciplina,
                    turma=turma,
                    defaults={
                        'aulas_semanais': aulas_semanais
                    }
                )
                
                if created:
                    contador_criados += 1
                    # print(f"Vínculo criado: {obj}")
                else:
                    contador_atualizados += 1
                    # print(f"Vínculo atualizado: {obj}")
                    
            except Disciplina.DoesNotExist:
                print(f"Erro: Disciplina com sigla '{sigla_disc}' não encontrada. Pulando vínculo com turma {turma}.")
                contador_erros += 1
            except Exception as e:
                print(f"Erro ao vincular disciplina '{sigla_disc}' à turma {turma}: {str(e)}")
                contador_erros += 1

    print(f"\nImportação finalizada!")
    print(f"- Vínculos criados: {contador_criados}")
    print(f"- Vínculos atualizados: {contador_atualizados}")
    print(f"- Erros ocorridos: {contador_erros}")

if __name__ == "__main__":
    JSON_FILE = DATA_DIR / 'disciplina_turma.json'
    import_disciplinas_turmas(str(JSON_FILE.resolve()))





