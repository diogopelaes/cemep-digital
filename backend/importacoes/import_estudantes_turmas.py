import os
import sys
import json
import django
import re
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

from apps.academic.models import MatriculaCEMEP, MatriculaTurma
from apps.core.models import Turma, Curso

def clean_alphanumeric(val):
    """Remove tudo que não for alfanumérico e converte para maiúsculo"""
    if not val:
        return ''
    return re.sub(r'[^a-zA-Z0-9]', '', str(val)).upper()

def import_estudantes_turmas(json_path):
    """
    Importa as enturmações (MatriculaTurma) a partir de um arquivo JSON.
    """
    if not os.path.exists(json_path):
        print(f"Erro: Arquivo não encontrado em {json_path}")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Iniciando importação de MatriculaTurma a partir de {json_path}...")
    
    contador_criados = 0
    contador_atualizados = 0
    contador_erros = 0
    
    # Ano letivo padrão conforme outros scripts de importação
    ANO_LETIVO_PADRAO = 2026

    for item in data:
        matricula_val = clean_alphanumeric(item.get('matricula_cemep'))
        turma_num = item.get('turma_numero')
        turma_letra = item.get('turma_letra')
        curso_sigla = item.get('curso_sigla')
        data_entrada_str = item.get('data_entrada')
        status = item.get('status', MatriculaTurma.Status.CURSANDO)

        try:
            # 1. Localizar MatriculaCEMEP (Nunca cria nova)
            try:
                matricula_cemep = MatriculaCEMEP.objects.get(numero_matricula=matricula_val)
            except MatriculaCEMEP.DoesNotExist:
                print(f"Erro: MatriculaCEMEP '{matricula_val}' não encontrada. Pulando registro.")
                contador_erros += 1
                continue

            # 2. Localizar Turma (Nunca cria nova)
            try:
                curso = Curso.objects.get(sigla=curso_sigla)
                turma = Turma.objects.get(
                    numero=turma_num,
                    letra=turma_letra,
                    curso=curso,
                    ano_letivo=ANO_LETIVO_PADRAO
                )
            except (Curso.DoesNotExist, Turma.DoesNotExist):
                print(f"Erro: Turma {turma_num}{turma_letra} do curso '{curso_sigla}' ({ANO_LETIVO_PADRAO}) não encontrada. Pulando registro.")
                contador_erros += 1
                continue

            # 3. Converter data
            try:
                data_entrada = date.fromisoformat(data_entrada_str) if data_entrada_str else date(2026, 2, 1)
            except ValueError:
                data_entrada = date(2026, 2, 1)

            # 4. Criar ou Atualizar MatriculaTurma
            obj, created = MatriculaTurma.objects.update_or_create(
                matricula_cemep=matricula_cemep,
                turma=turma,
                defaults={
                    'data_entrada': data_entrada,
                    'status': status
                }
            )

            if created:
                contador_criados += 1
            else:
                contador_atualizados += 1
            
            total = contador_criados + contador_atualizados
            if total % 50 == 0:
                print(f"[{total}] Matrículas em turma processadas...")

        except Exception as e:
            print(f"Erro inesperado ao processar matrícula {matricula_val}: {str(e)}")
            contador_erros += 1

    print(f"\nImportação finalizada!")
    print(f"- Matrículas em Turma criadas: {contador_criados}")
    print(f"- Matrículas em Turma atualizadas: {contador_atualizados}")
    print(f"- Erros ocorridos: {contador_erros}")

if __name__ == "__main__":
    JSON_FILE = IMPORT_DIR / 'dados_base' / 'estudantes_turmas.json'
    import_estudantes_turmas(str(JSON_FILE.resolve()))
