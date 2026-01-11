import os
import sys
import django
from datetime import date

# Add current directory to path
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cemep_digital.settings')
django.setup()

from apps.core.models import (
    Turma, GradeHorariaValidade, AnoLetivo, 
    GradeHoraria, HorarioAula, Disciplina
)

def verify():
    print("### Debug Models ###")
    
    # Check GradeHorariaValidade fields
    print("GradeHorariaValidade fields:", [f.name for f in GradeHorariaValidade._meta.get_fields()])
    
    # Try the filter that I suspect is clean
    print("Testing GradeHorariaValidade filter...")
    try:
        GradeHorariaValidade.objects.filter(turma_numero=1)
        print(" -> Filter turma_numero OK")
    except Exception as e:
        print(f" -> Filter turma_numero FAIL: {e}")

    try:
        GradeHorariaValidade.objects.filter(turma=1) # This should fail with FieldError
        print(" -> Filter turma OK (Unexpected)")
    except Exception as e:
        print(f" -> Filter turma FAIL (Expected): {e}")

    # Simulate salvar_lote logic
    print("Simulating salvar_lote...")
    try:
        ano_obj = AnoLetivo.objects.first()
        if not ano_obj:
            print("No AnoLetivo found, skipping simulation.")
            return

        validade = GradeHorariaValidade(
            ano_letivo=ano_obj,
            turma_numero=1,
            turma_letra='A',
            data_inicio=date(2026, 6, 1),
            data_fim=date(2026, 6, 30)
        )
        print(" -> Created instances.")
        validade.clean()
        print(" -> Cleaned.")
        validade.save()
        print(" -> Saved.")
        validade.delete()
        print(" -> Deleted.")
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    verify()
