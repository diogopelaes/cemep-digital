"""
Signals para auto-rebuild de grade_horaria em Funcionario e Turma.

Triggers:
- DisciplinaTurma: CREATE/UPDATE/DELETE → rebuild turma.grade_horaria
- ProfessorDisciplinaTurma: CREATE/UPDATE/DELETE → rebuild:
    - funcionario.grade_horaria (do professor)
    - turma.grade_horaria (da turma vinculada)
- GradeHoraria: CREATE/UPDATE/DELETE → rebuild:
    - turma.grade_horaria (via validade)
    - funcionarios que lecionam nessa turma/disciplina
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db import transaction


def rebuild_turma_grade(turma):
    """Reconstrói a grade horária de uma turma de forma segura."""
    if turma:
        try:
            turma.build_grade_horaria(save=True)
        except Exception as e:
            # Log do erro mas não interrompe a operação
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Erro ao rebuild grade_horaria da turma {turma.id}: {e}")


def rebuild_funcionario_grade(funcionario):
    """Reconstrói a grade horária de um funcionário de forma segura."""
    if funcionario:
        try:
            funcionario.build_grade_horaria(save=True)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Erro ao rebuild grade_horaria do funcionario {funcionario.id}: {e}")


def get_professores_da_turma_disciplina(turma, disciplina):
    """
    Retorna os funcionários que lecionam uma disciplina em uma turma.
    """
    from apps.core.models import ProfessorDisciplinaTurma, DisciplinaTurma
    
    try:
        disciplina_turma = DisciplinaTurma.objects.get(turma=turma, disciplina=disciplina)
        return [pdt.professor for pdt in disciplina_turma.professores.all()]
    except DisciplinaTurma.DoesNotExist:
        return []


# ============================================================================
# DisciplinaTurma Signals
# Quando uma disciplina é adicionada/removida de uma turma, precisa rebuild:
# - A turma (mostra disciplinas na grade)
# ============================================================================

@receiver(post_save, sender='core.DisciplinaTurma')
def on_disciplina_turma_save(sender, instance, created, **kwargs):
    """
    Após salvar DisciplinaTurma, rebuild a grade da turma.
    Não precisa rebuild funcionários aqui pois eles são vinculados via ProfessorDisciplinaTurma.
    """
    def do_rebuild():
        rebuild_turma_grade(instance.turma)
    
    # Executa após o commit da transação para garantir consistência
    transaction.on_commit(do_rebuild)


@receiver(post_delete, sender='core.DisciplinaTurma')
def on_disciplina_turma_delete(sender, instance, **kwargs):
    """Após deletar DisciplinaTurma, rebuild a grade da turma."""
    def do_rebuild():
        # A turma ainda existe, então podemos rebuild
        try:
            from apps.core.models import Turma
            turma = Turma.objects.get(pk=instance.turma_id)
            rebuild_turma_grade(turma)
        except Exception:
            pass
    
    transaction.on_commit(do_rebuild)


# ============================================================================
# ProfessorDisciplinaTurma Signals
# Quando um professor é atribuído/removido de uma disciplina-turma:
# - Rebuild do funcionário (professor) - sua grade pessoal muda
# - Rebuild da turma - mostra o professor na célula
# ============================================================================

@receiver(post_save, sender='core.ProfessorDisciplinaTurma')
def on_professor_disciplina_turma_save(sender, instance, created, **kwargs):
    """
    Após salvar ProfessorDisciplinaTurma, rebuild:
    - grade do funcionário (professor)
    - grade da turma (mostra professor)
    """
    def do_rebuild():
        # Rebuild do professor
        rebuild_funcionario_grade(instance.professor)
        
        # Rebuild da turma
        if instance.disciplina_turma:
            rebuild_turma_grade(instance.disciplina_turma.turma)
    
    transaction.on_commit(do_rebuild)


@receiver(post_delete, sender='core.ProfessorDisciplinaTurma')
def on_professor_disciplina_turma_delete(sender, instance, **kwargs):
    """Após deletar ProfessorDisciplinaTurma, rebuild ambos."""
    # Guardar referências antes do delete
    professor_id = instance.professor_id
    turma_id = instance.disciplina_turma.turma_id if instance.disciplina_turma else None
    
    def do_rebuild():
        from apps.core.models import Funcionario, Turma
        
        # Rebuild do professor
        try:
            professor = Funcionario.objects.get(pk=professor_id)
            rebuild_funcionario_grade(professor)
        except Funcionario.DoesNotExist:
            pass
        
        # Rebuild da turma
        if turma_id:
            try:
                turma = Turma.objects.get(pk=turma_id)
                rebuild_turma_grade(turma)
            except Turma.DoesNotExist:
                pass
    
    transaction.on_commit(do_rebuild)


# ============================================================================
# GradeHoraria Signals
# Quando um item de grade é criado/atualizado/deletado:
# - Rebuild da turma (via validade)
# - Rebuild dos professores que lecionam essa disciplina na turma
# ============================================================================

@receiver(post_save, sender='core.GradeHoraria')
def on_grade_horaria_save(sender, instance, created, **kwargs):
    """
    Após salvar GradeHoraria, rebuild:
    - grade da turma (via validade)
    - grades dos professores que lecionam essa disciplina na turma
    """
    def do_rebuild():
        if not instance.validade:
            return
            
        turma = instance.validade.turma
        
        # Rebuild da turma
        rebuild_turma_grade(turma)
        
        # Rebuild dos professores dessa disciplina na turma
        professores = get_professores_da_turma_disciplina(turma, instance.disciplina)
        for professor in professores:
            rebuild_funcionario_grade(professor)
    
    transaction.on_commit(do_rebuild)


@receiver(post_delete, sender='core.GradeHoraria')
def on_grade_horaria_delete(sender, instance, **kwargs):
    """Após deletar GradeHoraria, rebuild turma e professores."""
    # Guardar referências antes do delete
    turma_id = instance.validade.turma_id if instance.validade else None
    disciplina_id = instance.disciplina_id
    
    def do_rebuild():
        from apps.core.models import Turma, Disciplina
        
        if not turma_id:
            return
        
        try:
            turma = Turma.objects.get(pk=turma_id)
            rebuild_turma_grade(turma)
            
            # Rebuild dos professores
            try:
                disciplina = Disciplina.objects.get(pk=disciplina_id)
                professores = get_professores_da_turma_disciplina(turma, disciplina)
                for professor in professores:
                    rebuild_funcionario_grade(professor)
            except Disciplina.DoesNotExist:
                pass
                
        except Turma.DoesNotExist:
            pass
    
    transaction.on_commit(do_rebuild)
