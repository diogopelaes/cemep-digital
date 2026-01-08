import os
import sys
import csv
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

from django.contrib.auth import get_user_model
from apps.core.models import Funcionario

User = get_user_model()

def import_professores(csv_path):
    """
    Importa professores a partir de um arquivo CSV.
    Cria o Usuário e o registro de Funcionário vinculado.
    """
    if not os.path.exists(csv_path):
        print(f"Erro: Arquivo não encontrado em {csv_path}")
        return

    print(f"Iniciando importação de professores a partir de {csv_path}...")

    # Usamos utf-8-sig para lidar com o BOM do Excel se presente e caracteres acentuados
    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        criados = 0
        atualizados = 0

        for row in reader:
            nome_completo = row['NOME_COMPLETO'].strip()
            email = row['EMAIL'].strip()
            matricula = row['MATRICULA'].strip()
            # tipo_usuario ignoramos do CSV e usamos fixo PROFESSOR conforme pedido
            cpf = row['CPF'].strip() if row['CPF'] else None
            apelido = row['APELIDO'].strip() if row['APELIDO'] else None
            area_atuacao = row['AREA_ATUACAO'].strip() if row['AREA_ATUACAO'] else None

            # 1. Gerenciar Usuário
            # Usamos a matrícula como username conforme solicitado
            user = User.objects.filter(username=matricula).first()
            u_created = False

            if not user:
                # Cria usuário com senha aleatória segura
                temp_password = User.objects.make_random_password()
                user = User.objects.create_user(
                    username=matricula,
                    email=email,
                    password=temp_password,
                    first_name=nome_completo,
                    tipo_usuario=User.TipoUsuario.PROFESSOR
                )
                u_created = True
                print(f"Inserido: {nome_completo} (Matrícula: {matricula})")
            else:
                # Atualiza dados existentes (exceto senha)
                user.email = email
                user.first_name = nome_completo
                user.tipo_usuario = User.TipoUsuario.PROFESSOR
                user.save()

            # 2. Gerenciar Funcionario
            # Vinculado ao usuário e com a matrícula
            func, f_created = Funcionario.objects.update_or_create(
                usuario=user,
                defaults={
                    'matricula': int(matricula) if matricula.isdigit() else 0,
                    'area_atuacao': area_atuacao,
                    'apelido': apelido,
                    'cpf': cpf
                }
            )

            if u_created or f_created:
                criados += 1
                print(f"Inserido: {nome_completo} (Matrícula: {matricula})")
            else:
                atualizados += 1

    print(f"\nImportação finalizada!")
    print(f"- Registros novos: {criados}")
    print(f"- Registros atualizados: {atualizados}")

if __name__ == "__main__":
    CSV_FILE = IMPORT_DIR / 'dados_base' / 'professores.csv'
    import_professores(str(CSV_FILE.resolve()))
