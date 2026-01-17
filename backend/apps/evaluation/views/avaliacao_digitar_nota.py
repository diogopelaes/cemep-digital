"""
ViewSet para digitação de notas de avaliação.

Este módulo contém um ViewSet separado para gerenciar a digitação de notas
em avaliações específicas.
"""
from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.evaluation.models import Avaliacao
from apps.evaluation.serializers import (
    AvaliacaoDigitarNotaSerializer,
    EstudantesNotasSerializer,
    SalvarNotasSerializer
)
from core_project.permissions import Policy, PROFESSOR, OWNER, NONE


class DigitarNotaViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    ViewSet para digitação de notas de uma avaliação.
    
    Endpoints:
    - GET /digitar-notas/{avaliacao_id}/: Retorna avaliação + turmas
    - GET /digitar-notas/{avaliacao_id}/estudantes/?pdt=UUID: Retorna estudantes com notas
    - POST /digitar-notas/{avaliacao_id}/salvar/: Salva notas
    """
    queryset = Avaliacao.objects.select_related(
        'ano_letivo',
        'criado_por'
    ).prefetch_related(
        'professores_disciplinas_turmas__disciplina_turma__turma__curso',
        'professores_disciplinas_turmas__disciplina_turma__disciplina',
    )
    permission_classes = [Policy(
        create=NONE,
        read=OWNER,
        update=NONE,
        delete=NONE,
        custom={
            'estudantes': [PROFESSOR],
            'salvar': OWNER,
        }
    )]
    lookup_field = 'pk'


    def retrieve(self, request, pk=None):
        """
        GET /digitar-notas/{avaliacao_id}/
        Retorna metadados da avaliação para digitação de notas.
        """
        avaliacao = self.get_object()
        avaliacao_data = AvaliacaoDigitarNotaSerializer(avaliacao).data
        return Response(avaliacao_data)

    @action(detail=True, methods=['get'])
    def estudantes(self, request, pk=None):
        """
        GET /digitar-notas/{avaliacao_id}/estudantes/?pdt=UUID
        Retorna lista de estudantes com suas notas para uma turma/disciplina.
        """
        avaliacao = self.get_object()
        pdt_id = request.query_params.get('pdt')
        
        if not pdt_id:
            return Response(
                {'error': 'Parâmetro pdt (Professor/Disciplina/Turma) é obrigatório.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            pdt = avaliacao.professores_disciplinas_turmas.get(id=pdt_id)
            turma_id = pdt.disciplina_turma.turma_id
            
            estudantes_serializer = EstudantesNotasSerializer(
                avaliacao, 
                turma_id, 
                instance={}
            )
            
            return Response({
                'avaliacao_id': str(avaliacao.id),
                'pdt_id': str(pdt_id),
                'estudantes': estudantes_serializer.data['estudantes']
            })
        except Exception as e:
            return Response(
                {'error': f'PDT inválido ou não vinculado à avaliação: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def salvar(self, request, pk=None):
        """
        POST /digitar-notas/{avaliacao_id}/salvar/
        Salva notas dos estudantes.
        
        Body: { pdt_id: UUID, notas: [{matricula_turma_id, nota}, ...] }
        """
        avaliacao = self.get_object()
        
        serializer = SalvarNotasSerializer(
            data=request.data,
            avaliacao=avaliacao,
            user=request.user
        )
        
        if serializer.is_valid():
            result = serializer.save()
            return Response({
                'success': True,
                'message': f'{result["total"]} nota(s) salva(s).',
                **result
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
