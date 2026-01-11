import os
import sys
import django
from datetime import date, time

# Add current directory to path
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cemep_digital.settings')
django.setup()

from apps.core.models import (
    Turma, GradeHorariaValidade, AnoLetivo, Curso, 
    HorarioAula, GradeHoraria, Disciplina, DisciplinaTurma,
    ProfessorDisciplinaTurma, Funcionario
)
from apps.core.views.grade_horaria import GradeHorariaViewSet
from rest_framework.test import APIRequestFactory

def verify():
    print("### Verifying Grade Horaria Logic ###")
    
    # Setup Data
    ano = 2026
    ano_obj, _ = AnoLetivo.objects.get_or_create(ano=ano)
    
    curso, _ = Curso.objects.get_or_create(nome="Curso Teste", sigla="TESTE")
    
    # Turma 1A
    turma, _ = Turma.objects.get_or_create(
        numero=1, letra='A', ano_letivo=ano, curso=curso,
        defaults={'nomenclatura': 'ANO'}
    )
    
    # Horarios
    h1, _ = HorarioAula.objects.get_or_create(
        ano_letivo=ano_obj, dia_semana=0, numero=1,
        defaults={'hora_inicio': time(7,0), 'hora_fim': time(7,50)}
    )
    
    # Disciplina
    disc, _ = Disciplina.objects.get_or_create(nome="Matemática", sigla="MAT")
    DisciplinaTurma.objects.get_or_create(disciplina=disc, turma=turma)

    # 1. Testar Constraint de Validade (Inicio == Fim deve ser permitido agora)
    print("\n[1] Testing Date Constraint (Start == End)...")
    dt = date(2026, 2, 1)
    try:
        v = GradeHorariaValidade(
            ano_letivo=ano_obj, turma_numero=1, turma_letra='A',
            data_inicio=dt, data_fim=dt
        )
        v.clean() 
        v.save()
        print("PASS: Allowed single day validity.")
        v.delete()
    except Exception as e:
        print(f"FAIL: {e}")

    # 2. Testar Overlap
    print("\n[2] Testing Overlap Constraint...")
    v1 = GradeHorariaValidade.objects.create(
        ano_letivo=ano_obj, turma_numero=1, turma_letra='A',
        data_inicio=date(2026, 3, 1), data_fim=date(2026, 3, 31)
    )
    
    try:
        v2 = GradeHorariaValidade(
            ano_letivo=ano_obj, turma_numero=1, turma_letra='A',
            data_inicio=date(2026, 3, 15), data_fim=date(2026, 4, 15)
        )
        v2.clean()
        v2.save() # Should fail
        print("FAIL: Allowed overlap.")
        v2.delete()
    except Exception as e:
        print(f"PASS: Caught overlap: {e}")
        
    v1.delete()

    # 3. Testar ViewSet salvar_lote e JSON Cache
    print("\n[3] Testing salvar_lote & JSON Rebuild...")
    
    # Create fake request data
    payload = {
        'turma_id': str(turma.id),
        'data_inicio': '2026-04-01',
        'data_fim': '2026-04-30',
        'grades': [
            {'horario_aula': str(h1.id), 'disciplina': str(disc.id)}
        ]
    }
    
    factory = APIRequestFactory()
    request = factory.post('/core/grades-horarias/salvar_lote/', payload, format='json')
    
    class MockUser:
        is_authenticated = True
    request.user = MockUser()

    try:
        # Manual simulation of salvar_lote logic
        print("   -> Simulating Logic via Models (to trust cache structure)...")
        # Creating via Model directly to verify CACHE primarily
        validade = GradeHorariaValidade.objects.create(
            ano_letivo=ano_obj, turma_numero=1, turma_letra='A',
            data_inicio=date(2026, 4, 1), data_fim=date(2026, 4, 30)
        )
        
        GradeHoraria.objects.create(
            validade=validade, horario_aula=h1, disciplina=disc, curso=curso
        )
        
        # Trigger rebuild manually (as view would)
        validade._rebuild_turmas()
        
        # Check Turma Cache
        turma.refresh_from_db()
        cache = turma.grade_horaria
        
        print(f"   -> Cache Content: {cache}")
        
        if cache and 'matriz' in cache:
            # Check for curso_sigla
            # Note: num_key and dia_key usually Str. h1.numero is int.
            cell = cache['matriz'].get(str(h1.numero), {}).get(str(h1.dia_semana))
            
            if cell:
                print(f"   -> Cell found: {cell}")
                if 'curso_sigla' in cell:
                    print(f"PASS: Cache contains curso_sigla: {cell['curso_sigla']}")
                else:
                    print("FAIL: Cache missing curso_sigla")
            else:
                 print(f"FAIL: Cell not found in matrix. Keys: {cache['matriz'].keys()}")
        else:
             print("FAIL: Cache invalid")
             
        validade.delete()
        
    except Exception as e:
        print(f"FAIL: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    verify()
