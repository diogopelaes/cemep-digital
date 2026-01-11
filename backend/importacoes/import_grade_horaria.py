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

from apps.core.models import AnoLetivo, Disciplina, HorarioAula, GradeHorariaValidade, GradeHoraria

def import_grade_horaria(json_path):
    """
    Importa GradeHorariaValidade e seus itens de GradeHoraria a partir de um JSON.
    Usa instâncias dos models para garantir a execução de clean() e save().
    """
    if not os.path.exists(json_path):
        print(f"Erro: Arquivo não encontrado em {json_path}")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Iniciando importação de Grade Horária a partir de {json_path}...")
    
    contador_validades_criadas = 0
    contador_validades_atualizadas = 0
    contador_itens_criados = 0
    contador_erros = 0

    for item in data:
        fields = item.get('fields', {})
        itens_data = item.get('itens', [])
        
        ano = fields.get('ano_letivo')
        turma_numero = fields.get('turma_numero')
        turma_letra = fields.get('turma_letra')
        data_inicio = fields.get('data_inicio')
        data_fim = fields.get('data_fim')

        try:
            # Localiza o AnoLetivo
            ano_letivo = AnoLetivo.objects.get(ano=ano)
            
            # Buscar ou criar a Validade (Vigência)
            validade, created = GradeHorariaValidade.objects.get_or_create(
                ano_letivo=ano_letivo,
                turma_numero=turma_numero,
                turma_letra=turma_letra,
                data_inicio=data_inicio,
                data_fim=data_fim
            )
            
            if created:
                contador_validades_criadas += 1
            else:
                contador_validades_atualizadas += 1
                # Se já existia, vamos limpar os itens antigos para garantir que a nova grade seja a única
                # Isso evita que aulas que mudaram de horário permaneçam no banco.
                validade.itens_grade.all().delete()

            # Processar itens da grade
            for item_grade in itens_data:
                dia = item_grade.get('dia_semana')
                num_aula = item_grade.get('horario_numero')
                sigla_disc = item_grade.get('disciplina_sigla')

                try:
                    # Localiza a Disciplina
                    disciplina = Disciplina.objects.get(sigla=sigla_disc)
                    
                    # Localiza o HorarioAula base
                    horario = HorarioAula.objects.get(
                        ano_letivo=ano_letivo,
                        dia_semana=dia,
                        numero=num_aula
                    )

                    # Cria ou Atualiza o item de GradeHoraria
                    # Nota: unique_together = ['validade', 'horario_aula']
                    item_obj, item_created = GradeHoraria.objects.update_or_create(
                        validade=validade,
                        horario_aula=horario,
                        defaults={
                            'disciplina': disciplina
                        }
                    )
                    
                    if item_created:
                        contador_itens_criados += 1
                        
                except Disciplina.DoesNotExist:
                    print(f"Erro: Disciplina '{sigla_disc}' não encontrada. Pulando item.")
                    contador_erros += 1
                except HorarioAula.DoesNotExist:
                    print(f"Erro: Horário de Aula (Dia {dia}, Aula {num_aula}) no ano {ano} não encontrado. Pulando item.")
                    contador_erros += 1
                except Exception as e:
                    print(f"Erro ao importar item de grade ({sigla_disc}): {str(e)}")
                    contador_erros += 1

        except AnoLetivo.DoesNotExist:
            print(f"Erro: Ano Letivo {ano} não encontrado. Pulando validade {turma_numero}{turma_letra}.")
            contador_erros += 1
        except Exception as e:
            print(f"Erro ao processar validade para {turma_numero}{turma_letra}: {str(e)}")
            contador_erros += 1

    print(f"\nImportação finalizada!")
    print(f"- Vigências criadas: {contador_validades_criadas}")
    print(f"- Vigências atualizadas: {contador_validades_atualizadas}")
    print(f"- Itens de grade criados/atualizados: {contador_itens_criados}")
    print(f"- Erros ocorridos: {contador_erros}")

if __name__ == "__main__":
    JSON_FILE = IMPORT_DIR / 'dados_base' / 'grade_horaria_2026.json'
    import_grade_horaria(str(JSON_FILE.resolve()))
