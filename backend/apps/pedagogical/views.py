"""
Views para o App Pedagogical
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Sum, Count

from .models import (
    PlanoAula, Aula, Faltas, TipoOcorrencia, OcorrenciaPedagogica,
    OcorrenciaResponsavelCiente, NotaBimestral, Recuperacao, NotificacaoRecuperacao
)
from .serializers import (
    PlanoAulaSerializer, AulaSerializer, FaltasSerializer, FaltasRegistroSerializer,
    TipoOcorrenciaSerializer, OcorrenciaPedagogicaSerializer,
    OcorrenciaResponsavelCienteSerializer, NotaBimestralSerializer,
    RecuperacaoSerializer, NotificacaoRecuperacaoSerializer
)
from apps.users.permissions import IsGestao, IsProfessor, IsFuncionario, IsEstudanteOrResponsavel


class PlanoAulaViewSet(viewsets.ModelViewSet):
    queryset = PlanoAula.objects.select_related('professor__usuario', 'disciplina').prefetch_related('turmas', 'habilidades')
    serializer_class = PlanoAulaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['professor', 'disciplina', 'turmas']
    
    # controle_de_permissao
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsProfessor()]
        return [IsFuncionario()]


class AulaViewSet(viewsets.ModelViewSet):
    queryset = Aula.objects.select_related(
        'professor__usuario', 'disciplina_turma__disciplina', 'disciplina_turma__turma'
    )
    serializer_class = AulaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['professor', 'disciplina_turma', 'disciplina_turma__turma', 'data']
    
    # controle_de_permissao
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsProfessor()]
        return [IsFuncionario()]
    
    @action(detail=True, methods=['get'])
    def lista_chamada(self, request, pk=None):
        """Retorna a lista de estudantes da turma com status de presença."""
        aula = self.get_object()
        turma = aula.disciplina_turma.turma
        
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
                if est_id == estudante.id
            ]
            lista.append({
                'estudante_id': estudante.id,
                'nome': estudante.nome_social or estudante.usuario.get_full_name(),
                'faltas_aulas': faltas_estudante
            })
        
        return Response(lista)


class FaltasViewSet(viewsets.ModelViewSet):
    queryset = Faltas.objects.select_related('aula', 'estudante__usuario')
    serializer_class = FaltasSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['aula', 'estudante', 'aula__disciplina_turma__turma']
    
    # controle_de_permissao
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'registrar_lote']:
            return [IsProfessor()]
        return [IsFuncionario()]
    
    @action(detail=False, methods=['post'])
    def registrar_lote(self, request):
        """Registra faltas em lote para uma aula."""
        serializer = FaltasRegistroSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        aula_id = serializer.validated_data['aula_id']
        estudantes_ids = serializer.validated_data['estudantes_ids']
        aula_numero = serializer.validated_data['aula_numero']
        
        aula = Aula.objects.get(id=aula_id)
        
        # Remove faltas existentes para essa aula_numero
        Faltas.objects.filter(aula=aula, aula_numero=aula_numero).delete()
        
        # Cria novas faltas
        faltas = [
            Faltas(aula=aula, estudante_id=est_id, aula_numero=aula_numero)
            for est_id in estudantes_ids
        ]
        Faltas.objects.bulk_create(faltas)
        
        return Response({'message': f'{len(faltas)} faltas registradas.'})


class TipoOcorrenciaViewSet(viewsets.ModelViewSet):
    queryset = TipoOcorrencia.objects.select_related('gestor__usuario')
    serializer_class = TipoOcorrenciaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['ativo']
    
    # controle_de_permissao
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestao()]
        return [IsFuncionario()]
    
    def perform_create(self, serializer):
        serializer.save(gestor=self.request.user.funcionario)


class OcorrenciaPedagogicaViewSet(viewsets.ModelViewSet):
    queryset = OcorrenciaPedagogica.objects.select_related(
        'estudante__usuario', 'autor__usuario', 'tipo'
    )
    serializer_class = OcorrenciaPedagogicaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['estudante', 'tipo', 'autor']
    
    # controle_de_permissao
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsFuncionario()]
        return [IsAuthenticated()]
    
    def perform_create(self, serializer):
        ocorrencia = serializer.save(autor=self.request.user.funcionario)
        
        # Cria notificações para os responsáveis
        from apps.academic.models import ResponsavelEstudante
        vinculos = ResponsavelEstudante.objects.filter(estudante=ocorrencia.estudante)
        
        for vinculo in vinculos:
            OcorrenciaResponsavelCiente.objects.create(
                responsavel=vinculo.responsavel,
                ocorrencia=ocorrencia
            )


class OcorrenciaResponsavelCienteViewSet(viewsets.ModelViewSet):
    queryset = OcorrenciaResponsavelCiente.objects.select_related(
        'responsavel__usuario', 'ocorrencia'
    )
    serializer_class = OcorrenciaResponsavelCienteSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['responsavel', 'ciente']
    
    # controle_de_permissao
    def get_permissions(self):
        return [IsAuthenticated()]
    
    @action(detail=True, methods=['post'])
    def marcar_ciente(self, request, pk=None):
        """Marca a ocorrência como ciente."""
        obj = self.get_object()
        
        # Verifica se é o responsável
        if request.user.tipo_usuario == 'RESPONSAVEL':
            if obj.responsavel.usuario != request.user:
                return Response(
                    {'error': 'Acesso não autorizado'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        obj.ciente = True
        obj.data_ciencia = timezone.now()
        obj.save()
        
        return Response(OcorrenciaResponsavelCienteSerializer(obj).data)


class NotaBimestralViewSet(viewsets.ModelViewSet):
    queryset = NotaBimestral.objects.select_related(
        'matricula_turma__estudante__usuario',
        'disciplina_turma__disciplina',
        'disciplina_turma__turma'
    )
    serializer_class = NotaBimestralSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = [
        'matricula_turma', 'disciplina_turma', 'bimestre',
        'matricula_turma__turma', 'disciplina_turma__turma__ano_letivo'
    ]
    
    # controle_de_permissao
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsProfessor()]
        return [IsAuthenticated()]
    
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
            ).select_related('disciplina_turma__disciplina')
            
            disciplinas = {}
            for nota in notas:
                disc_nome = nota.disciplina_turma.disciplina.nome
                if disc_nome not in disciplinas:
                    disciplinas[disc_nome] = {
                        'disciplina': disc_nome,
                        'notas': {}
                    }
                disciplinas[disc_nome]['notas'][nota.bimestre] = {
                    'nota': str(nota.nota) if nota.nota else None,
                    'recuperacao': str(nota.nota_recuperacao) if nota.nota_recuperacao else None,
                    'final': str(nota.nota_final) if nota.nota_final else None
                }
            
            boletim.append({
                'turma': str(matricula.turma),
                'ano_letivo': matricula.turma.ano_letivo,
                'disciplinas': list(disciplinas.values())
            })
        
        return Response(boletim)


class RecuperacaoViewSet(viewsets.ModelViewSet):
    queryset = Recuperacao.objects.select_related(
        'disciplina', 'professor__usuario'
    ).prefetch_related('matriculas_turma')
    serializer_class = RecuperacaoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['disciplina', 'professor', 'bimestre']
    
    # controle_de_permissao
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsProfessor()]
        return [IsFuncionario()]
    
    def perform_create(self, serializer):
        recuperacao = serializer.save()
        
        # Cria notificações para os estudantes
        for matricula in recuperacao.matriculas_turma.all():
            NotificacaoRecuperacao.objects.create(
                recuperacao=recuperacao,
                estudante=matricula.estudante
            )


class NotificacaoRecuperacaoViewSet(viewsets.ModelViewSet):
    queryset = NotificacaoRecuperacao.objects.select_related(
        'recuperacao__disciplina', 'estudante__usuario'
    )
    serializer_class = NotificacaoRecuperacaoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['estudante', 'visualizado']
    
    @action(detail=True, methods=['post'])
    def marcar_visualizado(self, request, pk=None):
        """Marca a notificação como visualizada."""
        obj = self.get_object()
        obj.visualizado = True
        obj.data_visualizacao = timezone.now()
        obj.save()
        return Response(NotificacaoRecuperacaoSerializer(obj).data)

