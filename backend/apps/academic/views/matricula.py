"""
View para Matrículas
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction

from apps.academic.models import MatriculaCEMEP, MatriculaTurma
from apps.academic.serializers import MatriculaCEMEPSerializer, MatriculaTurmaSerializer
from apps.core.models import Turma
from apps.users.permissions import GestaoSecretariaWriteFuncionarioReadMixin


class MatriculaCEMEPViewSet(GestaoSecretariaWriteFuncionarioReadMixin, viewsets.ModelViewSet):
    """ViewSet de Matrículas CEMEP. Leitura: Funcionários | Escrita: Gestão/Secretaria"""
    queryset = MatriculaCEMEP.objects.select_related('estudante__usuario', 'curso').all()
    serializer_class = MatriculaCEMEPSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'curso', 'estudante']
    search_fields = ['numero_matricula', 'estudante__usuario__first_name']

    def destroy(self, request, *args, **kwargs):
        return Response({'detail': 'A exclusão de registros não é permitida.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


class MatriculaTurmaViewSet(GestaoSecretariaWriteFuncionarioReadMixin, viewsets.ModelViewSet):
    """ViewSet de Matrículas Turma. Leitura: Funcionários | Escrita: Gestão/Secretaria"""
    queryset = MatriculaTurma.objects.select_related(
        'matricula_cemep__estudante__usuario', 'turma__curso'
    ).all()
    serializer_class = MatriculaTurmaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'turma', 'matricula_cemep', 'turma__ano_letivo']
    search_fields = ['matricula_cemep__estudante__usuario__first_name', 'matricula_cemep__numero_matricula']

    @action(detail=False, methods=['get'], url_path='estudantes-elegiveis')
    def estudantes_elegiveis(self, request):
        """
        Retorna estudantes elegíveis para uma turma específica.
        Filtro: MatriculaCEMEP com status=MATRICULADO e curso=turma.curso,
        excluindo estudantes já enturmados nesta turma.
        """
        turma_id = request.query_params.get('turma_id')
        if not turma_id:
            return Response({'detail': 'turma_id é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            turma = Turma.objects.get(pk=turma_id)
        except Turma.DoesNotExist:
            return Response({'detail': 'Turma não encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Estudantes já enturmados nesta turma
        matriculas_existentes = MatriculaTurma.objects.filter(turma=turma).values_list('matricula_cemep_id', flat=True)
        
        # Estudantes elegíveis: MATRICULADO no mesmo curso e não enturmados
        matriculas_elegiveis = MatriculaCEMEP.objects.filter(
            status=MatriculaCEMEP.Status.MATRICULADO,
            curso=turma.curso
        ).exclude(
            numero_matricula__in=matriculas_existentes
        ).select_related('estudante__usuario').order_by('estudante__usuario__first_name')
        
        serializer = MatriculaCEMEPSerializer(matriculas_elegiveis, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='enturmar-lote')
    @transaction.atomic
    def enturmar_lote(self, request):
        """
        Cria matrículas em lote para uma turma.
        Espera: { turma_id, matriculas_cemep_ids: [], data_entrada }
        """
        turma_id = request.data.get('turma_id')
        matriculas_ids = request.data.get('matriculas_cemep_ids', [])
        data_entrada = request.data.get('data_entrada')
        
        if not turma_id or not matriculas_ids or not data_entrada:
            return Response(
                {'detail': 'turma_id, matriculas_cemep_ids e data_entrada são obrigatórios.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            turma = Turma.objects.get(pk=turma_id)
        except Turma.DoesNotExist:
            return Response({'detail': 'Turma não encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        
        created = []
        errors = []
        
        for matricula_id in matriculas_ids:
            try:
                matricula_cemep = MatriculaCEMEP.objects.get(numero_matricula=matricula_id)
                
                # Verifica se já está enturmado
                if MatriculaTurma.objects.filter(turma=turma, matricula_cemep=matricula_cemep).exists():
                    errors.append(f'{matricula_cemep.estudante} já está enturmado.')
                    continue
                
                mt = MatriculaTurma.objects.create(
                    turma=turma,
                    matricula_cemep=matricula_cemep,
                    data_entrada=data_entrada
                )
                created.append(MatriculaTurmaSerializer(mt).data)
            except MatriculaCEMEP.DoesNotExist:
                errors.append(f'Matrícula {matricula_id} não encontrada.')
            except Exception as e:
                errors.append(f'Erro ao enturmar {matricula_id}: {str(e)}')
        
        return Response({
            'created': created,
            'created_count': len(created),
            'errors': errors
        }, status=status.HTTP_201_CREATED if created else status.HTTP_400_BAD_REQUEST)

