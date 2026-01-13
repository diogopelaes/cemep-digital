
import os
import sys
import django

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 0. Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core_project.settings')
django.setup()

from apps.pedagogical.models import Aula, Faltas
from apps.pedagogical.serializers.aula_faltas import AulaFaltasSerializer
from apps.core.models import ProfessorDisciplinaTurma, DisciplinaTurma, Turma
from apps.academic.models import Estudante
from django.contrib.auth import get_user_model
import uuid
from datetime import date

User = get_user_model()

print("--- INICIANDO VERIFICACAO ---")

try:
    # 1. Setup mock data
    pdt = ProfessorDisciplinaTurma.objects.first()
    if not pdt:
        print("SEM DADOS: Nenhuma atribuicao encontrada para teste.")
        exit()

    # Create dummy aula
    print("Criando aula de teste...")
    aula = Aula.objects.create(
        professor_disciplina_turma=pdt,
        data=date.today(),
        numero_aulas=3,
        conteudo="Teste Verificacao"
    )

    # Find 2 students
    estudantes = Estudante.objects.all()[:2]
    if len(estudantes) < 2:
        print("SEM DADOS: Precisa de pelo menos 2 estudantes.")
        aula.delete()
        exit()
        
    e1 = estudantes[0]
    e2 = estudantes[1]
    
    print(f"Estudante 1: {e1.id}")
    print(f"Estudante 2: {e2.id}")

    # 2. Create Faltas
    # Student 1: Missed 2 periods (indices 1 and 2) -> Should count as 1 student
    print("Criando faltas...")
    Faltas.objects.create(
        aula=aula,
        estudante=e1,
        aulas_faltas=[1, 2] # 2 periods missed
    )
    
    # Student 2: Missed 1 period (index 1) -> Should count as 1 student
    Faltas.objects.create(
        aula=aula,
        estudante=e2,
        aulas_faltas=[1] # 1 period missed
    )
    
    # 3. Test Serializer
    print("Serializando...")
    serializer = AulaFaltasSerializer(instance=aula)
    data = serializer.data
    
    total_faltas = data['total_faltas']
    
    print(f"Total Faltas (via Serializer): {total_faltas}")
    print(f"Esperado: 2 (Estudantes), Antigo seria: 3 (Periodos)")
    
    if total_faltas == 2:
        print("SUCESSO: Contagem correta!")
    else:
        print(f"FALHA: Contagem incorreta. Valor: {total_faltas}")

    # Cleanup
    print("Limpando dados...")
    aula.delete()
    
except Exception as e:
    print(f"ERRO: {e}")
    try:
        if 'aula' in locals():
            aula.delete()
    except:
        pass
print("--- FIM ---")
