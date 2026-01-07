"""
View para Aula e Faltas (unificado)
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.utils import timezone
from datetime import datetime

from apps.pedagogical.models import Aula, Faltas
from apps.pedagogical.serializers.aula_faltas import (
    AulaFaltasSerializer,
    AulaFaltasListSerializer,
    ContextoAulaSerializer,
    EstudanteChamadaSerializer,
    AtualizarFaltasSerializer
)
from apps.academic.models import MatriculaTurma
from apps.core.models import ProfessorDisciplinaTurma, Funcionario, AnoLetivo, ControleRegistrosVisualizacao
from apps.core.utils import get_restricoes_controle, verificar_data_registro_aula
from apps.users.permissions import (
    IsProfessor, IsFuncionario, IsOwnerProfessorOrGestao, AnoLetivoFilterMixin
)


class AulaFaltasViewSet(AnoLetivoFilterMixin, viewsets.ModelViewSet):
    """
    ViewSet unificado para Aulas e Faltas.
    
    Permissões:
    - Create: Professor/Gestão
    - Read: Todos funcionários  
    - Update/Delete: Apenas owner (professor que criou) ou Gestão
    
    Filtros:
    - turma: ID da turma
    - disciplina: ID da disciplina
    - data: Data da aula
    - bimestre: 1, 2, 3 ou 4
    """
    
    queryset = Aula.objects.select_related(
        'professor_disciplina_turma__professor__usuario',
        'professor_disciplina_turma__disciplina_turma__disciplina',
        'professor_disciplina_turma__disciplina_turma__turma__curso'
    ).prefetch_related('faltas__estudante__usuario')
    
    serializer_class = AulaFaltasSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = {
        'professor_disciplina_turma__disciplina_turma__turma': ['exact'],
        'professor_disciplina_turma__disciplina_turma__disciplina': ['exact'],
        'data': ['exact', 'gte', 'lte'],
    }
    ano_letivo_field = 'professor_disciplina_turma__disciplina_turma__turma__ano_letivo'
    
    def get_permissions(self):
        """Define permissões por ação."""
        if self.action in ['create']:
            return [IsProfessor()]
        elif self.action in ['update', 'partial_update', 'destroy']:
            return [IsProfessor(), IsOwnerProfessorOrGestao()]
        return [IsFuncionario()]
    
    def get_queryset(self):
        """Filtra aulas do professor logado (se for professor)."""
        qs = super().get_queryset()
        user = self.request.user
        
        # Se for professor, mostrar apenas suas aulas
        if user.tipo_usuario == 'PROFESSOR':
            try:
                funcionario = user.funcionario
                qs = qs.filter(professor_disciplina_turma__professor=funcionario)
            except Funcionario.DoesNotExist:
                return qs.none()
        
        # Filtro por bimestre (via query param)
        bimestre = self.request.query_params.get('bimestre')
        if bimestre:
            # Implementar filtro por bimestre usando as datas do ano letivo
            # Por simplicidade, retorna todas e filtra no frontend
            pass
        
        return qs.order_by('-data', '-numero_aulas')
    
    def get_serializer_class(self):
        """Usa serializer leve para listagem."""
        if self.action == 'list':
            return AulaFaltasListSerializer
        return AulaFaltasSerializer
    
    def list(self, request, *args, **kwargs):
        """Lista aulas com contagem de disciplinas do professor."""
        response = super().list(request, *args, **kwargs)
        
        # Adiciona contagem de disciplinas para UI condicional
        user = request.user
        disciplinas_count = 1
        
        if user.tipo_usuario == 'PROFESSOR':
            try:
                funcionario = user.funcionario
                ano = user.get_ano_letivo_selecionado()
                if ano:
                    disciplinas_count = ProfessorDisciplinaTurma.objects.filter(
                        professor=funcionario,
                        disciplina_turma__turma__ano_letivo=ano
                    ).values('disciplina_turma__disciplina').distinct().count()
            except:
                pass
        
        if isinstance(response.data, dict):
            response.data['disciplinas_count'] = disciplinas_count
        
        return response
    
    @action(detail=False, methods=['get'])
    def contexto_formulario(self, request):
        """
        Retorna turmas e disciplinas do professor logado para o formulário.
        GET /pedagogical/aulas-faltas/contexto-formulario/
        
        Também inclui as restrições de datas para registro de aula.
        """
        user = request.user
        
        if user.tipo_usuario not in ['PROFESSOR', 'GESTAO']:
            return Response(
                {'error': 'Apenas professores podem acessar este endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            funcionario = user.funcionario
        except Funcionario.DoesNotExist:
            return Response({'turmas': [], 'disciplinas_por_turma': {}, 'restricoes_data': {}})
        
        # Busca atribuições do professor no ano letivo selecionado
        ano_selecionado = user.get_ano_letivo_selecionado()
        atribuicoes = ProfessorDisciplinaTurma.objects.filter(
            professor=funcionario,
            disciplina_turma__turma__ano_letivo=ano_selecionado
        ).select_related(
            'disciplina_turma__turma__curso',
            'disciplina_turma__disciplina'
        ).order_by('disciplina_turma__turma__numero', 'disciplina_turma__turma__letra')
        
        serializer = ContextoAulaSerializer(atribuicoes)
        response_data = serializer.data
        
        # Adiciona restrições de datas para registro de aula (usando função utilitária centralizada)
        response_data['restricoes_data'] = get_restricoes_controle(ano_selecionado, 'AULA')
        response_data['ano_letivo'] = ano_selecionado
        
        return Response(response_data)
    
    @action(detail=True, methods=['get'])
    def estudantes(self, request, pk=None):
        """
        Retorna lista de estudantes da turma para chamada.
        GET /pedagogical/aulas-faltas/{id}/estudantes/
        
        Inclui qtd_faltas atual de cada estudante na aula.
        """
        aula = self.get_object()
        turma = aula.professor_disciplina_turma.disciplina_turma.turma
        
        # Buscar matrículas ativas (CURSANDO, RETIDO, PROMOVIDO)
        matriculas = MatriculaTurma.objects.filter(
            turma=turma,
            status__in=['CURSANDO', 'RETIDO', 'PROMOVIDO']
        ).select_related('estudante__usuario').order_by('estudante__usuario__first_name')
        
        # Mapear faltas existentes
        faltas_map = {
            f.estudante_id: f.qtd_faltas
            for f in aula.faltas.all()
        }
        
        estudantes = []
        for matricula in matriculas:
            estudantes.append({
                'id': str(matricula.estudante.id),
                'nome': matricula.estudante.nome_social or matricula.estudante.usuario.get_full_name(),
                'status': matricula.status,
                'qtd_faltas': faltas_map.get(matricula.estudante.id, 0)
            })
        
        return Response(estudantes)
    
    @action(detail=False, methods=['get'])
    def estudantes_por_turma(self, request):
        """
        Retorna lista de estudantes de uma turma (sem aula existente).
        GET /pedagogical/aulas-faltas/estudantes-por-turma/?professor_disciplina_turma_id=XXX
        """
        pdt_id = request.query_params.get('professor_disciplina_turma_id')
        
        if not pdt_id:
            return Response(
                {'error': 'professor_disciplina_turma_id é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            pdt = ProfessorDisciplinaTurma.objects.select_related(
                'disciplina_turma__turma'
            ).get(id=pdt_id)
        except ProfessorDisciplinaTurma.DoesNotExist:
            return Response(
                {'error': 'Atribuição não encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        turma = pdt.disciplina_turma.turma
        
        # Buscar matrículas ativas
        matriculas = MatriculaTurma.objects.filter(
            turma=turma,
            status__in=['CURSANDO', 'RETIDO', 'PROMOVIDO']
        ).select_related('estudante__usuario').order_by('estudante__usuario__first_name')
        
        estudantes = [
            {
                'id': str(m.estudante.id),
                'nome': m.estudante.nome_social or m.estudante.usuario.get_full_name(),
                'status': m.status,
                'qtd_faltas': 0
            }
            for m in matriculas
        ]
        
        return Response({
            'turma_nome': turma.nome_completo,
            'disciplina_nome': pdt.disciplina_turma.disciplina.nome,
            'estudantes': estudantes
        })
    
    @action(detail=True, methods=['patch'])
    def atualizar_faltas(self, request, pk=None):
        """
        Atualiza faltas de um estudante específico (para auto-save).
        PATCH /pedagogical/aulas-faltas/{id}/atualizar-faltas/
        
        Body: { "estudante_id": "xxx", "qtd_faltas": 2 }
        """
        aula = self.get_object()
        serializer = AtualizarFaltasSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        estudante_id = serializer.validated_data['estudante_id']
        qtd_faltas = serializer.validated_data['qtd_faltas']
        
        with transaction.atomic():
            if qtd_faltas == 0:
                # Remove registro de falta
                Faltas.objects.filter(aula=aula, estudante_id=estudante_id).delete()
            else:
                # Cria ou atualiza
                Faltas.objects.update_or_create(
                    aula=aula,
                    estudante_id=estudante_id,
                    defaults={'qtd_faltas': qtd_faltas}
                )
        
        return Response({'status': 'ok', 'qtd_faltas': qtd_faltas})
    
    @action(detail=False, methods=['post'])
    def verificar_existente(self, request):
        """
        Verifica se já existe aula para a data/turma/disciplina.
        POST /pedagogical/aulas-faltas/verificar-existente/
        
        Body: { "professor_disciplina_turma_id": "xxx", "data": "2024-01-15" }
        """
        pdt_id = request.data.get('professor_disciplina_turma_id')
        data = request.data.get('data')
        
        if not pdt_id or not data:
            return Response(
                {'error': 'professor_disciplina_turma_id e data são obrigatórios'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        aula = Aula.objects.filter(
            professor_disciplina_turma_id=pdt_id,
            data=data
        ).first()
        
        if aula:
            return Response({
                'existe': True,
                'aula_id': str(aula.id),
                'conteudo': aula.conteudo,
                'numero_aulas': aula.numero_aulas
            })
        
        return Response({'existe': False})

    @action(detail=False, methods=['get'])
    def verificar_data_registro(self, request):
        """
        Verifica se uma data pode ser usada para registro de aula.
        GET /pedagogical/aulas-faltas/verificar_data_registro/?data=2026-03-15
        
        Usa função utilitária centralizada em apps.core.utils
        """
        data_str = request.query_params.get('data')
        
        if not data_str:
            return Response(
                {'error': 'Parâmetro data é obrigatório (formato: YYYY-MM-DD)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            data_registro = datetime.strptime(data_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Formato de data inválido. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = request.user
        ano_selecionado = user.get_ano_letivo_selecionado()
        
        # Usa função utilitária centralizada
        resultado = verificar_data_registro_aula(ano_selecionado, data_registro)
        resultado['ano_letivo'] = ano_selecionado
        
        return Response(resultado)
