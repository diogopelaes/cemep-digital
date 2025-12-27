"""
View para Notas Bimestrais
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.pedagogical.models import NotaBimestral
from apps.pedagogical.serializers import NotaBimestralSerializer
from apps.users.permissions import ProfessorWriteFuncionarioReadMixin


class NotaBimestralViewSet(ProfessorWriteFuncionarioReadMixin, viewsets.ModelViewSet):
    """ViewSet de Notas. Leitura: Funcionários | Escrita: Professores/Gestão"""
    queryset = NotaBimestral.objects.select_related(
        'matricula_turma__estudante__usuario',
        'professor_disciplina_turma__disciplina_turma__disciplina',
        'professor_disciplina_turma__disciplina_turma__turma'
    )
    serializer_class = NotaBimestralSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = [
        'matricula_turma', 'professor_disciplina_turma', 'bimestre',
        'matricula_turma__turma', 'professor_disciplina_turma__disciplina_turma__turma__ano_letivo'
    ]
    
    @action(detail=False, methods=['get'])
    def boletim(self, request):
        """Retorna o boletim de um estudante."""
        estudante_id = request.query_params.get('estudante_id')
        ano_letivo = request.query_params.get('ano_letivo')
        
        if not estudante_id:
            return Response(
                {'error': 'estudante_id é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from apps.academic.models import MatriculaTurma
        
        queryset = MatriculaTurma.objects.filter(estudante_id=estudante_id)
        if ano_letivo:
            queryset = queryset.filter(turma__ano_letivo=ano_letivo)
        
        boletim = []
        for matricula in queryset.select_related('turma'):
            notas = NotaBimestral.objects.filter(
                matricula_turma=matricula
            ).select_related('professor_disciplina_turma__disciplina_turma__disciplina')
            
            disciplinas = {}
            for nota in notas:
                disc_nome = nota.professor_disciplina_turma.disciplina_turma.disciplina.nome
                if disc_nome not in disciplinas:
                    disciplinas[disc_nome] = {
                        'disciplina': disc_nome,
                        'notas': {}
                    }
                disciplinas[disc_nome]['notas'][nota.bimestre] = {
                    'nota': str(nota.nota) if nota.nota else None
                }
            
            boletim.append({
                'turma': str(matricula.turma),
                'ano_letivo': matricula.turma.ano_letivo,
                'disciplinas': list(disciplinas.values())
            })
        
        return Response(boletim)
