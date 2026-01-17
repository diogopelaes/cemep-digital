import re
from datetime import date
import json
import os
from paths import DATA_DIR, setup_django

# Configuração do Django
setup_django()

from apps.core.models import (
    Funcionario, DisciplinaTurma, ProfessorDisciplinaTurma, 
    Turma, Curso, Disciplina
)

def import_professor_disciplina_turma(json_path):
    """
    Importa as atribuições de professores a partir de um arquivo JSON
    utilizando identificadores naturais.
    """
    if not os.path.exists(json_path):
        print(f"Erro: Arquivo não encontrado em {json_path}")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Iniciando importação de ProfessorDisciplinaTurma a partir de {json_path}...")
    
    contador_criados = 0
    contador_atualizados = 0
    contador_erros = 0
    
    # Ano letivo padrão conforme outros scripts de importação
    ANO_LETIVO_PADRAO = 2026

    for item in data:
        username = item.get('professor_username')
        sigla_disc = item.get('disciplina_sigla')
        t_numero = item.get('turma_numero')
        t_letra = item.get('turma_letra')
        t_curso_sigla = item.get('turma_curso_sigla')
        
        tipo = item.get('tipo', 'TITULAR')
        data_inicio_str = item.get('data_inicio')
        data_fim_str = item.get('data_fim')

        try:
            # 1. Localizar Professor
            try:
                professor = Funcionario.objects.get(usuario__username=username)
            except Funcionario.DoesNotExist:
                print(f"Erro: Professor '{username}' não encontrado.")
                contador_erros += 1
                continue

            # 2. Localizar DisciplinaTurma
            try:
                curso = Curso.objects.get(sigla=t_curso_sigla)
                turma = Turma.objects.get(
                    numero=t_numero,
                    letra=t_letra,
                    curso=curso,
                    ano_letivo=ANO_LETIVO_PADRAO
                )
                disciplina = Disciplina.objects.get(sigla=sigla_disc)
                dt = DisciplinaTurma.objects.get(disciplina=disciplina, turma=turma)
            except (Curso.DoesNotExist, Turma.DoesNotExist, Disciplina.DoesNotExist, DisciplinaTurma.DoesNotExist):
                print(f"Erro: DisciplinaTurma ({sigla_disc} - {t_numero}{t_letra} {t_curso_sigla}) não encontrada.")
                contador_erros += 1
                continue

            # 3. Converter datas
            data_inicio = date.fromisoformat(data_inicio_str) if data_inicio_str else None
            data_fim = date.fromisoformat(data_fim_str) if data_fim_str else None

            # 4. Criar ou Atualizar ProfessorDisciplinaTurma
            obj, created = ProfessorDisciplinaTurma.objects.update_or_create(
                professor=professor,
                disciplina_turma=dt,
                defaults={
                    'tipo': tipo,
                    'data_inicio': data_inicio,
                    'data_fim': data_fim
                }
            )

            if created:
                contador_criados += 1
            else:
                contador_atualizados += 1
            
            total = contador_criados + contador_atualizados
            if total % 50 == 0:
                print(f"[{total}] Atribuições processadas...")

        except Exception as e:
            print(f"Erro inesperado ao processar professor {username}: {str(e)}")
            contador_erros += 1

    print(f"\nImportação finalizada!")
    print(f"- Atribuições criadas: {contador_criados}")
    print(f"- Atribuições atualizadas: {contador_atualizados}")
    print(f"- Erros ocorridos: {contador_erros}")

if __name__ == "__main__":
    JSON_FILE = DATA_DIR / 'professor_disciplina_turma.json'
    import_professor_disciplina_turma(str(JSON_FILE.resolve()))





