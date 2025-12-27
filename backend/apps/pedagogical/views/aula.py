"""
View para Aula
"""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.pedagogical.models import Aula
from apps.pedagogical.serializers import AulaSerializer
from apps.users.permissions import ProfessorWriteFuncionarioReadMixin


class AulaViewSet(ProfessorWriteFuncionarioReadMixin, viewsets.ModelViewSet):
    """ViewSet de Aulas. Leitura: Funcionários | Escrita: Professores/Gestão"""
    queryset = Aula.objects.select_related(
        'professor_disciplina_turma__professor__usuario',
        'professor_disciplina_turma__disciplina_turma__disciplina',
        'professor_disciplina_turma__disciplina_turma__turma'
    )
    serializer_class = AulaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['professor_disciplina_turma', 'professor_disciplina_turma__disciplina_turma__turma', 'data']
    
    @action(detail=True, methods=['get'])
    def lista_chamada(self, request, pk=None):
        """Retorna a lista de estudantes da turma com status de presença."""
        aula = self.get_object()
        turma = aula.professor_disciplina_turma.disciplina_turma.turma
        
        from apps.academic.models import MatriculaTurma
        matriculas = MatriculaTurma.objects.filter(
            turma=turma,
            status='CURSANDO'
        ).select_related('estudante__usuario')
        
        faltas_ids = set(aula.faltas.values_list('estudante_id', 'aula_numero'))
        
        lista = []
        for matricula in matriculas:
            estudante = matricula.estudante
            faltas_estudante = [
                aula_num for est_id, aula_num in faltas_ids 
                if est_id == estudante.cpf
            ]
            lista.append({
                'estudante_id': estudante.cpf,
                'nome': estudante.nome_social or estudante.usuario.get_full_name(),
                'faltas_aulas': faltas_estudante
            })
        
        return Response(lista)
