from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.users.permissions import IsProfessor
from apps.evaluation.models import NotaAvaliacao, NotaBimestral
from apps.evaluation.serializers import (
    NotaAvaliacaoSerializer,
    NotaBimestralSerializer,
    NotaBimestralBulkUpdateSerializer,
)
from apps.evaluation.services import (
    get_or_create_notas_bimestrais,
    validar_avaliacoes_completas,
)
from apps.core.models import ProfessorDisciplinaTurma
from decimal import Decimal


class NotaAvaliacaoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para NotaAvaliacao (somente leitura).
    
    Para edição, usar a ação 'notas' em AvaliacaoViewSet.
    """
    queryset = NotaAvaliacao.objects.all().select_related(
        'avaliacao',
        'matricula_turma__matricula_cemep__estudante__usuario',
    )
    serializer_class = NotaAvaliacaoSerializer
    permission_classes = [IsAuthenticated, IsProfessor]
    
    def get_queryset(self):
        """Filtra por professor."""
        qs = super().get_queryset()
        user = self.request.user
        
        if user.perfil == 'GESTAO':
            return qs
        
        if hasattr(user, 'funcionario'):
            return qs.filter(
                avaliacao__professor_disciplina_turma__professor=user.funcionario
            )
        
        return qs.none()


class NotaBimestralViewSet(viewsets.ModelViewSet):
    """
    ViewSet para NotaBimestral.
    
    Endpoints principais:
    - /notas-bimestrais/ - Lista todas
    - /notas-bimestrais/por-turma/?pdt={id}&bimestre={1-4} - Lista por turma/bimestre
    """
    queryset = NotaBimestral.objects.all().select_related(
        'matricula_turma__matricula_cemep__estudante__usuario',
        'professor_disciplina_turma__disciplina_turma__disciplina',
        'professor_disciplina_turma__disciplina_turma__turma',
    )
    serializer_class = NotaBimestralSerializer
    permission_classes = [IsAuthenticated, IsProfessor]
    
    def get_queryset(self):
        """Filtra por professor."""
        qs = super().get_queryset()
        user = self.request.user
        
        if user.perfil == 'GESTAO':
            pass
        elif hasattr(user, 'funcionario'):
            qs = qs.filter(professor_disciplina_turma__professor=user.funcionario)
        else:
            return qs.none()
        
        # Filtros opcionais
        pdt_id = self.request.query_params.get('professor_disciplina_turma')
        if pdt_id:
            qs = qs.filter(professor_disciplina_turma_id=pdt_id)
        
        bimestre = self.request.query_params.get('bimestre')
        if bimestre:
            qs = qs.filter(bimestre=bimestre)
        
        return qs.order_by('matricula_turma__mumero_chamada')
    
    @action(detail=False, methods=['get', 'post'])
    def por_turma(self, request):
        """
        GET: Retorna notas bimestrais de uma turma/disciplina (cria se necessário).
        POST: Atualiza notas em lote.
        
        Query params:
        - pdt: ID do ProfessorDisciplinaTurma (obrigatório)
        - bimestre: Número do bimestre 1-4 (obrigatório)
        """
        pdt_id = request.query_params.get('pdt')
        bimestre = request.query_params.get('bimestre')
        
        if not pdt_id or not bimestre:
            return Response(
                {'detail': 'Parâmetros pdt e bimestre são obrigatórios.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            bimestre = int(bimestre)
            if bimestre not in [1, 2, 3, 4]:
                raise ValueError()
        except ValueError:
            return Response(
                {'detail': 'Bimestre deve ser 1, 2, 3 ou 4.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            pdt = ProfessorDisciplinaTurma.objects.select_related(
                'disciplina_turma__disciplina',
                'disciplina_turma__turma',
                'professor__usuario',
            ).get(id=pdt_id)
        except ProfessorDisciplinaTurma.DoesNotExist:
            return Response(
                {'detail': 'ProfessorDisciplinaTurma não encontrado.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verifica permissão
        user = request.user
        if user.perfil != 'GESTAO':
            if not hasattr(user, 'funcionario') or pdt.professor != user.funcionario:
                return Response(
                    {'detail': 'Sem permissão para acessar esta turma.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        if request.method == 'GET':
            # Get or create notas bimestrais (já executa atualizar_notas())
            notas = get_or_create_notas_bimestrais(pdt, bimestre)
            
            # Verificar avisos sobre avaliações
            avisos = validar_avaliacoes_completas(pdt, bimestre)
            
            serializer = NotaBimestralSerializer(notas, many=True)
            
            return Response({
                'professor_disciplina_turma': {
                    'id': str(pdt.id),
                    'disciplina': pdt.disciplina_turma.disciplina.nome,
                    'turma': pdt.disciplina_turma.turma.nome_completo,
                    'professor': pdt.professor.usuario.get_full_name(),
                },
                'bimestre': bimestre,
                'avisos': avisos,
                'notas': serializer.data
            })
        
        elif request.method == 'POST':
            # Atualizar notas em lote
            bulk_serializer = NotaBimestralBulkUpdateSerializer(data=request.data)
            bulk_serializer.is_valid(raise_exception=True)
            
            notas_data = bulk_serializer.validated_data['notas']
            
            for item in notas_data:
                nota_id = item['id']
                nota_final = item.get('nota_final')
                
                try:
                    nota = NotaBimestral.objects.get(
                        id=nota_id,
                        professor_disciplina_turma=pdt,
                        bimestre=bimestre
                    )
                    if nota_final is not None:
                        nota.nota_final = Decimal(str(nota_final))
                    else:
                        nota.nota_final = None
                    nota.full_clean()
                    nota.save()
                except NotaBimestral.DoesNotExist:
                    pass
                except Exception as e:
                    return Response(
                        {'detail': str(e)},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Retornar notas atualizadas
            notas = get_or_create_notas_bimestrais(pdt, bimestre)
            avisos = validar_avaliacoes_completas(pdt, bimestre)
            serializer = NotaBimestralSerializer(notas, many=True)
            
            return Response({
                'professor_disciplina_turma': {
                    'id': str(pdt.id),
                    'disciplina': pdt.disciplina_turma.disciplina.nome,
                    'turma': pdt.disciplina_turma.turma.nome_completo,
                    'professor': pdt.professor.usuario.get_full_name(),
                },
                'bimestre': bimestre,
                'avisos': avisos,
                'notas': serializer.data
            })
