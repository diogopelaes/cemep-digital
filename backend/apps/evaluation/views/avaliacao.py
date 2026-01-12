from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from apps.users.permissions import IsProfessor
from apps.evaluation.models import Avaliacao, BIMESTRE_CHOICES
from apps.evaluation.serializers import AvaliacaoSerializer, AvaliacaoListSerializer
from apps.evaluation.services import get_or_create_notas_avaliacao


class AvaliacaoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Avaliacao.
    
    Permissões:
    - GET: Professor (próprias) ou GESTAO (todas)
    - POST/PUT/DELETE: Professor (próprias)
    """
    queryset = Avaliacao.objects.all().select_related(
        'professor_disciplina_turma__disciplina_turma__disciplina',
        'professor_disciplina_turma__disciplina_turma__turma',
        'professor_disciplina_turma__professor__usuario',
    )
    serializer_class = AvaliacaoSerializer
    permission_classes = [IsAuthenticated, IsProfessor]
    
    def get_queryset(self):
        """Filtra avaliações do professor logado."""
        qs = super().get_queryset()
        user = self.request.user
        
        # Gestão vê tudo
        if user.perfil == 'GESTAO':
            pass
        elif hasattr(user, 'funcionario'):
            qs = qs.filter(professor_disciplina_turma__professor=user.funcionario)
        else:
            return qs.none()
        
        # Filtro por turma/disciplina (professor_disciplina_turma)
        pdt_id = self.request.query_params.get('professor_disciplina_turma')
        if pdt_id:
            qs = qs.filter(professor_disciplina_turma_id=pdt_id)
        
        # Filtro por bimestre
        bimestre = self.request.query_params.get('bimestre')
        if bimestre:
            qs = qs.filter(bimestre=bimestre)
        
        # Filtro por tipo
        tipo = self.request.query_params.get('tipo')
        if tipo:
            qs = qs.filter(tipo=tipo)
        
        # Filtro por ano letivo
        ano_letivo = self.request.user.get_ano_letivo_selecionado()
        if ano_letivo:
            qs = qs.filter(
                professor_disciplina_turma__disciplina_turma__turma__ano_letivo=ano_letivo.ano
            )
        
        return qs.order_by('bimestre', 'data_inicio')
    
    def get_serializer_class(self):
        """Usa serializer simplificado para listagem."""
        if self.action == 'list':
            return AvaliacaoListSerializer
        return AvaliacaoSerializer
    
    def perform_create(self, serializer):
        """Valida que o professor é dono da atribuição."""
        pdt = serializer.validated_data.get('professor_disciplina_turma')
        user = self.request.user
        
        # Gestão pode criar para qualquer professor
        if user.perfil == 'GESTAO':
            serializer.save()
            return
        
        # Professor só pode criar para suas próprias atribuições
        if hasattr(user, 'funcionario') and pdt.professor == user.funcionario:
            serializer.save()
        else:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Você não pode criar avaliações para outros professores.')
    
    @action(detail=False, methods=['get'])
    def choices(self, request):
        """Retorna as opções de tipo e bimestre."""
        return Response({
            'tipo': [
                {'value': 'AVALIACAO_REGULAR', 'label': 'Avaliação Regular'},
                {'value': 'AVALIACAO_RECUPERACAO', 'label': 'Avaliação de Recuperação'},
                {'value': 'AVALIACAO_EXTRA', 'label': 'Avaliação Extra'},
            ],
            'bimestre': [
                {'value': choice[0], 'label': choice[1]}
                for choice in BIMESTRE_CHOICES
            ]
        })
    
    @action(detail=True, methods=['get', 'post'])
    def notas(self, request, pk=None):
        """
        GET: Retorna notas da avaliação (cria se necessário).
        POST: Atualiza notas em lote.
        """
        avaliacao = self.get_object()
        
        if request.method == 'GET':
            # Get or create notas para todos os estudantes
            notas = get_or_create_notas_avaliacao(avaliacao)
            
            from apps.evaluation.serializers import NotaAvaliacaoSerializer
            serializer = NotaAvaliacaoSerializer(notas, many=True)
            
            return Response({
                'avaliacao': AvaliacaoSerializer(avaliacao).data,
                'notas': serializer.data
            })
        
        elif request.method == 'POST':
            # Atualizar notas em lote
            from apps.evaluation.serializers import NotaAvaliacaoBulkUpdateSerializer
            from apps.evaluation.models import NotaAvaliacao
            from decimal import Decimal
            
            bulk_serializer = NotaAvaliacaoBulkUpdateSerializer(data=request.data)
            bulk_serializer.is_valid(raise_exception=True)
            
            notas_data = bulk_serializer.validated_data['notas']
            
            for item in notas_data:
                nota_id = item['id']
                nota_valor = item.get('nota')
                
                try:
                    nota = NotaAvaliacao.objects.get(id=nota_id, avaliacao=avaliacao)
                    if nota_valor is not None:
                        nota.nota = Decimal(str(nota_valor))
                    else:
                        nota.nota = None
                    nota.full_clean()
                    nota.save()
                except NotaAvaliacao.DoesNotExist:
                    pass
                except Exception as e:
                    return Response(
                        {'detail': str(e)},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            notas = get_or_create_notas_avaliacao(avaliacao)
            from apps.evaluation.serializers import NotaAvaliacaoSerializer
            serializer = NotaAvaliacaoSerializer(notas, many=True)
            
            return Response({
                'avaliacao': AvaliacaoSerializer(avaliacao).data,
                'notas': serializer.data
            })
