"""
ViewSets para Aula e Faltas (unificado).

Este módulo contém a ViewSet principal para o gerenciamento de aulas e faltas,
centralizando a lógica de permissions e actions customizadas.
"""
from datetime import datetime
from django.db import transaction
from django.utils import timezone
from django.core import serializers as django_serializers
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from django.db.models import Count
from apps.pedagogical.models import Aula, Faltas
from apps.pedagogical.serializers.aula_faltas import (
    AulaFaltasSerializer,
    AulaFaltasListSerializer,
    AtualizarFaltasSerializer,
    ContextoAulaSerializer
)
from apps.academic.models import MatriculaTurma
from apps.core.models import ProfessorDisciplinaTurma
from apps.core.mixins import AnoLetivoFilterMixin

from apps.pedagogical.validators import verificar_data_registro_aula, obter_datas_liberadas_cached
from apps.pedagogical.services.faltas_service import FaltasService
from core_project.permissions import Policy, PROFESSOR, FUNCIONARIO, OWNER


class AulaFaltasViewSet(AnoLetivoFilterMixin, viewsets.ModelViewSet):
    """
    ViewSet unificado para Aulas e Faltas.
    """
    permission_classes = [Policy(
        create=[PROFESSOR],
        read=[FUNCIONARIO],
        update=OWNER,
        delete=OWNER,
        custom={
            'opcoes_nova_aula': [PROFESSOR],
            'contexto_formulario': [PROFESSOR],
            'verificar_data_registro': [PROFESSOR],
            'verificar_existente': [PROFESSOR],
            'estudantes': [PROFESSOR],
            'estudantes_por_turma': [PROFESSOR],
            'atualizar_faltas': OWNER,
        }
    )]

    queryset = Aula.objects.select_related(
        'professor_disciplina_turma__professor__usuario',
        'professor_disciplina_turma__disciplina_turma__disciplina',
        'professor_disciplina_turma__disciplina_turma__turma__curso'
    ).prefetch_related('faltas__estudante__usuario')
    

    filter_backends = [DjangoFilterBackend]
    
    # Filtros
    filterset_fields = {
        'professor_disciplina_turma__disciplina_turma__turma': ['exact'],
        'professor_disciplina_turma__disciplina_turma__disciplina': ['exact'],
        'data': ['exact', 'gte', 'lte'],
    }
    ano_letivo_field = 'professor_disciplina_turma__disciplina_turma__turma__ano_letivo'

    def get_serializer_class(self):
        if self.action == 'list':
            return AulaFaltasListSerializer
        return AulaFaltasSerializer

    def get_queryset(self):
        """
        Refina o queryset base:
        - PROFESSOR: apenas suas aulas.
        - OUTROS: filtrado por ano letivo (via Mixin).
        """
        qs = super().get_queryset()
        user = self.request.user
        
        if user.tipo_usuario == 'PROFESSOR':
            # Garante que o professor veja apenas suas atribuições
            qs = qs.filter(professor_disciplina_turma__professor__usuario=user)
            
        return qs.annotate(
            total_faltas_count=Count('faltas')
        ).order_by(
            '-data', 
            'professor_disciplina_turma__disciplina_turma__turma__numero',
            'professor_disciplina_turma__disciplina_turma__turma__letra',
            'professor_disciplina_turma__disciplina_turma__disciplina__nome'
        )

    # =========================================================================
    # ACTIONS: DADOS AUXILIARES & FORMULÁRIOS
    # =========================================================================

    @action(detail=False, methods=['get'])
    def opcoes_nova_aula(self, request):
        """
        Retorna dados para o formulário de nova aula:
        - Atribuições (Turmas/Disciplinas) do professor no ano selecionado.
        - Regras de controle de datas.
        """
        user = request.user
        if not hasattr(user, 'funcionario'):
            return Response({'error': 'Usuário sem vínculo de funcionário.'}, status=400)

        # 1. Recupera o Ano Letivo via método do model (AGORA RETORNA O OBJETO)
        ano_selecionado = user.get_ano_letivo_selecionado()
        
        if not ano_selecionado:
             return Response({'error': 'Nenhum ano letivo selecionado.'}, status=400)



        # 2. Busca Atribuições
        atribuicoes = ProfessorDisciplinaTurma.objects.filter(
            professor=user.funcionario,
            disciplina_turma__turma__ano_letivo=ano_selecionado.ano
        ).select_related(
            'disciplina_turma__turma__curso',
            'disciplina_turma__disciplina'
        ).order_by('disciplina_turma__turma__numero', 'disciplina_turma__turma__letra')

        # 3. Formata os dados de atribuição e contexto
        contexto_serializer = ContextoAulaSerializer(atribuicoes)
        
        lista_atribuicoes = []
        for atrib in atribuicoes:
            turma = atrib.disciplina_turma.turma
            disciplina = atrib.disciplina_turma.disciplina
            lista_atribuicoes.append({
                'id': str(atrib.id),
                'turma_id': str(turma.id),
                'turma_nome': turma.nome_completo,
                'turma_numero': turma.numero,
                'turma_letra': turma.letra,
                'disciplina_id': str(disciplina.id),
                'disciplina_nome': disciplina.nome,
                'disciplina_sigla': disciplina.sigla,
                'aulas_semanais': atrib.disciplina_turma.aulas_semanais
            })

        scope = request.query_params.get('scope', 'full')
        data = {
            'atribuicoes': lista_atribuicoes,
            'turmas': contexto_serializer.data.get('turmas', []),
            'disciplinas_por_turma': contexto_serializer.data.get('disciplinas_por_turma', {}),
            'ano_letivo': str(ano_selecionado.ano),
        }

        # 4. Datas Liberadas para DateInputAnoLetivo (scope=full)
        # =====================================================================
        # Usa cache com TTL de 2h para evitar recálculo a cada requisição.
        # Frontend recebe datasLiberadas já processadas, não precisa calcular.
        # =====================================================================
        if scope == 'full':
            # Garante que controles existem
            if not ano_selecionado.controles:
                ano_selecionado.atualizar_controles_json()
                ano_selecionado.refresh_from_db()

            # Obtém datas liberadas do cache (recalcula se expirado)
            datas = obter_datas_liberadas_cached(ano_selecionado)
            
            data['datasLiberadas'] = sorted(list(datas))
            data['data_atual'] = timezone.localdate().isoformat()

        return Response(data)

    @action(detail=False, methods=['get'])
    def contexto_formulario(self, request):
        """Alias para opcoes_nova_aula."""
        return self.opcoes_nova_aula(request)

    @action(detail=False, methods=['get'])
    def verificar_data_registro(self, request):
        """Valida data para registro de aula usando regras pedagógicas."""
        data_str = request.query_params.get('data')
        if not data_str:
            return Response({'error': 'Data obrigatória.'}, status=400)
            
        try:
            data_registro = datetime.strptime(data_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Formato inválido (YYYY-MM-DD).'}, status=400)
            
        ano = request.user.get_ano_letivo_selecionado()
        if not ano:
             return Response({'error': 'Ano letivo não selecionado.'}, status=400)

        # Passa o OBJETIVO ano para o validador
        resultado = verificar_data_registro_aula(ano, data_registro)
        resultado['ano_letivo'] = ano.ano
        
        return Response(resultado)

    @action(detail=False, methods=['post'])
    def verificar_existente(self, request):
        """Verifica se já existe aula na data/turma para aquele professor."""
        pdt_id = request.data.get('professor_disciplina_turma_id')
        data_aula = request.data.get('data')
        
        if not pdt_id or not data_aula:
            return Response({'error': 'Dados incompletos.'}, status=400)
            
        aula = Aula.objects.filter(
            professor_disciplina_turma_id=pdt_id,
            data=data_aula
        ).only('id', 'conteudo', 'numero_aulas').first()
        
        if aula:
            return Response({
                'existe': True,
                'aula_id': str(aula.id),
                'conteudo': aula.conteudo,
                'numero_aulas': aula.numero_aulas
            })
        return Response({'existe': False})

    # =========================================================================
    # ACTIONS: GESTÃO DE ESTUDANTES E FALTAS
    # =========================================================================

    def _get_alunos_data(self, turma, aula=None):
        """
        Helper para listar alunos e suas faltas (se aula existir).
        Evita duplicação de lógica entre 'estudantes' e 'estudantes_por_turma'.
        """
        matriculas = MatriculaTurma.objects.filter(
            turma=turma,
            status__in=['CURSANDO', 'RETIDO', 'PROMOVIDO']
        ).select_related(
            'matricula_cemep__estudante__usuario'
        ).order_by('mumero_chamada', 'matricula_cemep__estudante__usuario__first_name')

        # Se tiver aula, mapeia as faltas existentes efficiently
        faltas_map = {}
        if aula:
            faltas_map = {
                f.estudante_id: {'qtd': f.qtd_faltas, 'aulas': f.aulas_faltas}
                for f in aula.faltas.all()
            }

        response_data = []
        for m in matriculas:
            estudante = m.matricula_cemep.estudante
            est_id = estudante.id
            
            # Default: sem faltas
            falta_info = faltas_map.get(est_id, {'qtd': 0, 'aulas': []})
            
            response_data.append({
                'id': str(est_id),
                'nome': estudante.nome_social or estudante.usuario.get_full_name(),
                'status': m.status,
                'numero_chamada': m.mumero_chamada, # Campo numero_chamada para o frontend
                'qtd_faltas': falta_info['qtd'],
                'aulas_faltas': falta_info['aulas']
            })
        return response_data

    @action(detail=True, methods=['get'])
    def estudantes(self, request, pk=None):
        """Retorna estudantes da aula (com faltas já registradas)."""
        aula = self.get_object()
        turma = aula.professor_disciplina_turma.disciplina_turma.turma
        
        data = self._get_alunos_data(turma, aula=aula)
        return Response(data)

    @action(detail=False, methods=['get'])
    def estudantes_por_turma(self, request):
        """Retorna estudantes de uma turma (para criar nova aula)."""
        pdt_id = request.query_params.get('professor_disciplina_turma_id')
        if not pdt_id:
            return Response({'error': 'ID da atribuição obrigatório.'}, status=400)

        # Valida atribuição e permissão
        try:
            pdt = ProfessorDisciplinaTurma.objects.select_related(
                'disciplina_turma__turma', 
                'disciplina_turma__disciplina'
            ).get(id=pdt_id)
            
            if request.user.tipo_usuario == 'PROFESSOR' and pdt.professor.usuario != request.user:
                 return Response({'error': 'Acesso negado.'}, status=403)
        except ProfessorDisciplinaTurma.DoesNotExist:
            return Response({'error': 'Atribuição não encontrada.'}, status=404)

        data = self._get_alunos_data(pdt.disciplina_turma.turma, aula=None)
        
        return Response({
            'turma_nome': pdt.disciplina_turma.turma.nome_completo,
            'disciplina_nome': pdt.disciplina_turma.disciplina.nome,
            'estudantes': data
        })

    @action(detail=True, methods=['patch'])
    def atualizar_faltas(self, request, pk=None):
        """Atualiza faltas de um ÚNICO estudante (auto-save)."""
        aula = self.get_object()
        
        serializer = AtualizarFaltasSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        estudante_id = serializer.validated_data['estudante_id']
        aulas_faltas = serializer.validated_data['aulas_faltas']
        
        # Usa serviço centralizado (já é atômico internamente)
        resultado = FaltasService.salvar_falta_unitaria(aula, estudante_id, aulas_faltas)
        
        return Response({
            'status': 'ok', 
            'acao': resultado['acao'],
            'aulas_faltas': resultado['aulas_faltas']
        })

    def list(self, request, *args, **kwargs):
        """Override do list para injetar metadados para professores."""
        response = super().list(request, *args, **kwargs)
        
        if request.user.tipo_usuario == 'PROFESSOR' and isinstance(response.data, dict):
            ano = request.user.get_ano_letivo_selecionado() # Objeto
            if ano:
                count = ProfessorDisciplinaTurma.objects.filter(
                    professor__usuario=request.user,
                    disciplina_turma__turma__ano_letivo=ano.ano
                ).values('disciplina_turma__disciplina').distinct().count()
                
                response.data['disciplinas_count'] = count
                
        return response

