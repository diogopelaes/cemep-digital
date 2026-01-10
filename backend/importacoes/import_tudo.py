import subprocess
import sys
import os
from pathlib import Path

# Configuração de caminhos
IMPORT_DIR = Path(__file__).resolve().parent
PYTHON_EXE = sys.executable

def clear_terminal():
    os.system('cls' if os.name == 'nt' else 'clear')

def run_script(script_name):
    script_path = IMPORT_DIR / script_name
    print(f"\n" + "="*60)
    print(f" EXECUTANDO: {script_name}")
    print("="*60)
    
    if not script_path.exists():
        print(f"Erro: Script {script_name} não encontrado em {IMPORT_DIR}")
        return False

    try:
        # Executa o script e redireciona a saída para o console em tempo real
        result = subprocess.run([PYTHON_EXE, str(script_path)], check=True)
        return result.returncode == 0
    except subprocess.CalledProcessError as e:
        print(f"\n[ERRO] Falha ao executar {script_name}: {e}")
        return False
    except Exception as e:
        print(f"\n[ERRO] Erro inesperado ao executar {script_name}: {e}")
        return False

def import_tudo():
    """
    Executa todos os scripts de importação na ordem correta de dependência.
    """
    clear_terminal()
    scripts_na_ordem = [
        # 1. Base do Calendário e Configurações Globais
        "import_ano_letivo.py",
        "import_controles.py",
        "import_horario_aula.py",
        
        # 2. Cadastros de Infraestrutura Acadêmica
        "import_cursos.py",
        "import_disciplinas.py",
        "import_habilidades.py",
        
        # 3. Recursos Humanos (Cria Usuários e Funcionários)
        "import_professores.py",
        
        # 4. Estrutura de Turmas (Depende de Cursos, Professores e Ano Letivo)
        "import_turmas.py",
        
        # 5. Estudantes (Depende de Cursos)
        "import_estudantes.py",
        
        # 6. Relacionamentos e Enturmação (Depende de tudo acima)
        "import_disciplinas_turmas.py",
        "import_estudantes_turmas.py",
        "import_professor_disciplina_turma.py",
        "import_habilidades_disciplinas.py",
    ]

    print("Iniciando Importação Global do Sistema CEMEP-Digital...")
    print(f"Diretório de importação: {IMPORT_DIR}")
    
    sucessos = []
    falhas = []

    for script in scripts_na_ordem:
        if run_script(script):
            sucessos.append(script)
        else:
            falhas.append(script)
            print(f"\nInterrompendo importação devido a erro no script: {script}")
            break

    print("\n" + "="*60)
    print(" RESUMO DA IMPORTAÇÃO")
    print("="*60)
    print(f"Total de scripts planejados: {len(scripts_na_ordem)}")
    print(f"Scripts executados com sucesso: {len(sucessos)}")
    for s in sucessos:
        print(f"  [OK] {s}")
    
    if falhas:
        print(f"Scripts com falha: {len(falhas)}")
        for f in falhas:
            print(f"  [ERRO] {f}")
        sys.exit(1)
    else:
        print("\n[SUCESSO] Todos os dados foram importados corretamente!")

if __name__ == "__main__":
    import_tudo()
