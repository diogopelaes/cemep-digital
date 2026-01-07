"""
ViewSets para Aula e Faltas (unificado).

Este módulo contém a ViewSet principal para o gerenciamento de aulas e faltas,
centralizando a lógica de permissions e actions customizadas.
"""
from datetime import datetime, timedelta
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.utils import timezone

from apps.pedagogical.models import Aula, Faltas
from apps.pedagogical.serializers.aula_faltas import (
    AulaFaltasSerializer,
    AulaFaltasListSerializer,
    ContextoAulaSerializer,
    AtualizarFaltasSerializer
)
from apps.academic.models import MatriculaTurma
from apps.core.models import ProfessorDisciplinaTurma, Funcionario
from apps.users.permissions import IsOwnerProfessorStrict, AnoLetivoFilterMixin

# --- Helper Local Funcional (Otimizado) ---
def _calcular_regras_registro(ano_letivo_id):
    """
    Calcula datas permitidas para registro de aula de forma funcional e performática.
    Retorna apenas datas válidas baseadas no ControleRegistrosVisualizacao.
    """
    from apps.core.models import AnoLetivo, ControleRegistrosVisualizacao
    
    # Fast-fail
    if not ano_letivo_id:
        return {'datas': [], 'hoje': timezone.localdate().isoformat(), 'mensagem': 'Ano letivo não informado.'}

    hoje = timezone.localdate()
    hoje_iso = hoje.isoformat()
    
    try:
        # Busca/Prefetch otimizado
        ano = AnoLetivo.objects.prefetch_related(
            'dias_nao_letivos',
            'dias_letivos_extras'
        ).get(ano=ano_letivo_id)
    except AnoLetivo.DoesNotExist:
        return {'datas': [], 'hoje': hoje_iso, 'mensagem': 'Ano letivo inválido.'}

    # Sets para lookup O(1)
    dias_nao_letivos = {d.data for d in ano.dias_nao_letivos.all()}
    dias_extras = {d.data for d in ano.dias_letivos_extras.all()}

    # Filtra controles AULA liberados hoje
    controles = ControleRegistrosVisualizacao.objects.filter(
        ano_letivo=ano,
        tipo=ControleRegistrosVisualizacao.TipoControle.REGISTRO_AULA
    )
    
    datas_validas = set()

    for controle in controles:
        # Verifica se bimestre está liberado HOJE
        if not controle.esta_liberado(hoje):
            continue
            
        bim = controle.bimestre
        inicio = getattr(ano, f'data_inicio_{bim}bim', None)
        fim = getattr(ano, f'data_fim_{bim}bim', None)
        permite_futuro = controle.digitacao_futura

        if not (inicio and fim):
            continue

        # Range do bimestre
        # Otimização: se não permite futuro, trava no hoje
        data_corte = fim
        if not permite_futuro and fim > hoje:
            data_corte = hoje
            
        curr = inicio
        while curr <= data_corte:
            # Regras de exclusão
            # 1. Dia não letivo
            if curr in dias_nao_letivos:
                curr += timedelta(days=1)
                continue
            
            # 2. Fim de semana (salvo se extra)
            if curr.weekday() >= 5 and curr not in dias_extras:
                curr += timedelta(days=1)
                continue
                
            datas_validas.add(curr.isoformat())
            curr += timedelta(days=1)

    return {
        'datas': sorted(datas_validas),
        'hoje': hoje_iso,
        'mensagem': None if datas_validas else 'Nenhum período disponível para registro hoje.'
    }

def verificar_data_registro_aula(ano_letivo_id, data_verificar):
    """
    Verifica se uma data específica pode ser usada para registrar aula.
    Implementação local para evitar alterar apps.core.utils.
    """
    from apps.core.models import AnoLetivo, ControleRegistrosVisualizacao
    
    if not ano_letivo_id:
        return {'valida': False, 'mensagem': 'Selecione um ano letivo.'}
        
    try:
        ano_letivo = AnoLetivo.objects.get(ano=ano_letivo_id)
    except AnoLetivo.DoesNotExist:
        return {'valida': False, 'mensagem': 'Ano letivo inválido.'}

    hoje = timezone.localdate()
    # 1. Verifica controles liberados
    controles = ControleRegistrosVisualizacao.objects.filter(
        ano_letivo=ano_letivo,
        tipo=ControleRegistrosVisualizacao.TipoControle.REGISTRO_AULA
    )
    
    bimestre_contemplado = None
    permite_futuro = False
    
    for controle in controles:
        if controle.esta_liberado(hoje):
            bim = controle.bimestre
            inicio = getattr(ano_letivo, f'data_inicio_{bim}bim', None)
            fim = getattr(ano_letivo, f'data_fim_{bim}bim', None)
            
            if inicio and fim and inicio <= data_verificar <= fim:
                bimestre_contemplado = bim
                permite_futuro = controle.digitacao_futura
                break
    
    if not bimestre_contemplado:
        return {'valida': False, 'mensagem': 'Esta data não pertence a nenhum bimestre liberado para registro agora.'}
        
    # 2. Verifica futuro
    if not permite_futuro and data_verificar > hoje:
        return {'valida': False, 'mensagem': 'Registros futuros não estão liberados.'}
        
    # 3. Verifica dias não letivos
    if ano_letivo.dias_nao_letivos.filter(data=data_verificar).exists():
        return {'valida': False, 'mensagem': 'Esta data é um feriado ou recesso escolar.'}
        
    # 4. Verifica fim de semana (salvo se extra)
    if data_verificar.weekday() >= 5:
        if not ano_letivo.dias_letivos_extras.filter(data=data_verificar).exists():
             return {'valida': False, 'mensagem': 'Registros em fins de semana só são permitidos em dias letivos extras.'}
             
    return {'valida': True, 'mensagem': 'Data válida.'}


class AulaFaltasViewSet(AnoLetivoFilterMixin, viewsets.ModelViewSet):
    """
    ViewSet unificado para Aulas e Faltas.
    
    Permissões (via IsOwnerProfessorStrict):
    - Create: Apenas PROFESSOR.
    - Read (List/Retrieve): GESTAO, SECRETARIA, PROFESSOR, MONITOR.
    - Update/Delete: APENAS o PROFESSOR proprietário — nem GESTAO pode alterar.
    
    Filtros Automáticos:
    - Ano Letivo (via AnoLetivoFilterMixin)
    """
    
    queryset = Aula.objects.select_related(
        'professor_disciplina_turma__professor__usuario',
        'professor_disciplina_turma__disciplina_turma__disciplina',
        'professor_disciplina_turma__disciplina_turma__turma__curso',
        'professor_disciplina_turma__disciplina_turma__turma__curso'
    ).prefetch_related('faltas__estudante__usuario')
    
    permission_classes = [IsOwnerProfessorStrict]
    serializer_class = AulaFaltasSerializer
    
    filter_backends = [DjangoFilterBackend]
    filterset_fields = {
        'professor_disciplina_turma__disciplina_turma__turma': ['exact'],
        'professor_disciplina_turma__disciplina_turma__disciplina': ['exact'],
        'data': ['exact', 'gte', 'lte'],
    }
    
    # Configuração do AnoLetivoFilterMixin
    ano_letivo_field = 'professor_disciplina_turma__disciplina_turma__turma__ano_letivo'

    def get_queryset(self):
        """
        Refina o queryset base:
        - Se for PROFESSOR, mostra apenas SUAS aulas.
        - Se for GESTAO/SECRETARIA, mostra tudo (filtrado por ano letivo).
        """
        qs = super().get_queryset()
        user = self.request.user
        
        if user.tipo_usuario == 'PROFESSOR':
            # Filtro adicional de segurança para garantir que professor só vê suas aulas
            # (embora IsOwnerProfessorStrict já proteja edição, listagem deve ser restrita também)
            try:
                # Usa related_name reverso se existir, ou query direta
                qs = qs.filter(professor_disciplina_turma__professor__usuario=user)
            except Exception:
                return qs.none()
                
        return qs.order_by('-data', '-criado_em')

    def get_serializer_class(self):
        """Usa serializer otimizado para listagem."""
        if self.action == 'list':
            return AulaFaltasListSerializer
        return AulaFaltasSerializer

    def list(self, request, *args, **kwargs):
        """Standard list com metadados opcionais."""
        response = super().list(request, *args, **kwargs)
        
        # Injeta contagem de disciplinas para UI (apenas para professor)
        # Útil para saber se mostra dropdown de disciplinas ou não
        if request.user.tipo_usuario == 'PROFESSOR' and isinstance(response.data, dict):
            try:
                ano = request.user.get_ano_letivo_selecionado()
                count = ProfessorDisciplinaTurma.objects.filter(
                    professor__usuario=request.user,
                    disciplina_turma__turma__ano_letivo=ano
                ).values('disciplina_turma__disciplina').distinct().count()
                response.data['disciplinas_count'] = count
            except Exception:
                pass
                
        return response

    @action(detail=False, methods=['get'])
    def opcoes_nova_aula(self, request):
        """
        Endpoint otimizado para opções de nova aula e filtros.
        Param 'scope':
         - 'full' (default): Retorna turmas, disciplinas E datas calculadas (Pesado).
         - 'simple'/'filters': Retorna apenas turmas e disciplinas (Leve, para filtros).
        """
        scope = request.query_params.get('scope', 'full')
        user = request.user
        
        if not hasattr(user, 'funcionario'):
             return Response({'error': 'Usuário sem vínculo de funcionário.'}, status=400)

        funcionario = user.funcionario
        ano_selecionado = user.get_ano_letivo_selecionado()
        
        # 1. Dados Básicos (Turmas e Disciplinas - Sempre retorna)
        atribuicoes = ProfessorDisciplinaTurma.objects.filter(
            professor=funcionario,
            disciplina_turma__turma__ano_letivo=ano_selecionado
        ).select_related(
            'disciplina_turma__turma__curso',
            'disciplina_turma__disciplina'
        ).order_by('disciplina_turma__turma__numero', 'disciplina_turma__turma__letra')
        
        serializer = ContextoAulaSerializer(atribuicoes)
        data = serializer.data
        data['ano_letivo'] = str(ano_selecionado)
        
        # 2. Dados Calculados (Datas - Apenas se scope=full)
        if scope == 'full':
            regras = _calcular_regras_registro(ano_selecionado)
            data.update({
                'datas_liberadas': regras['datas'],
                'data_atual': regras['hoje'],
                'mensagem_restricao': regras['mensagem'],
            })
        
        return Response(data)
    
    # Alias mantido para compatibilidade com código legado
    @action(detail=False, methods=['get'])
    def contexto_formulario(self, request):
        """Alias para opcoes_nova_aula (mantido para compatibilidade)."""
        return self.opcoes_nova_aula(request)

    @action(detail=True, methods=['get'])
    def estudantes(self, request, pk=None):
        """
        Retorna estudantes da turma vinculada à aula, com status de faltas atual.
        """
        aula = self.get_object()
        turma = aula.professor_disciplina_turma.disciplina_turma.turma
        
        # 1. Busca todos alunos ativos da turma
        matriculas = MatriculaTurma.objects.filter(
            turma=turma,
            status__in=['CURSANDO', 'RETIDO', 'PROMOVIDO']
        ).select_related('matricula_cemep__estudante__usuario').order_by('matricula_cemep__estudante__usuario__first_name')
        
        # 2. Busca faltas já registradas nesta aula
        # Map: estudante_id -> {qtd: int, aulas: list}
        faltas_map = {
            f.estudante_id: {'qtd': f.qtd_faltas, 'aulas': f.aulas_faltas}
            for f in aula.faltas.all()
        }
        
        response_data = []
        for m in matriculas:
            est_id = m.matricula_cemep.estudante.id
            falta_info = faltas_map.get(est_id, {'qtd': 0, 'aulas': []})
            
            response_data.append({
                'id': str(est_id),
                'nome': m.matricula_cemep.estudante.nome_social or m.matricula_cemep.estudante.usuario.get_full_name(),
                'status': m.status,
                'qtd_faltas': falta_info['qtd'],
                'aulas_faltas': falta_info['aulas']
            })
            
        return Response(response_data)

    @action(detail=False, methods=['get'])
    def estudantes_por_turma(self, request):
        """
        Retorna estudantes de uma turma (para criar nova aula).
        Query Param: professor_disciplina_turma_id
        """
        pdt_id = request.query_params.get('professor_disciplina_turma_id')
        if not pdt_id:
            return Response({'error': 'ID da atribuição obrigatório.'}, status=400)
            
        # Valida se atribuição existe e pertence ao professor (implícito se pdt filtrado)
        # Mas vamos buscar direto para ser seguro
        try:
            pdt = ProfessorDisciplinaTurma.objects.get(id=pdt_id)
            # Permissão extra manual se quiser garantir que é do user prof
            if request.user.tipo_usuario == 'PROFESSOR' and pdt.professor.usuario != request.user:
                 return Response({'error': 'Acesso negado a esta atribuição.'}, status=403)
        except ProfessorDisciplinaTurma.DoesNotExist:
            return Response({'error': 'Atribuição não encontrada.'}, status=404)

        turma = pdt.disciplina_turma.turma
        matriculas = MatriculaTurma.objects.filter(
            turma=turma,
            status__in=['CURSANDO', 'RETIDO', 'PROMOVIDO']
        ).select_related('matricula_cemep__estudante__usuario').order_by('matricula_cemep__estudante__usuario__first_name')

        estudantes = [
            {
                'id': str(m.matricula_cemep.estudante.id),
                'nome': m.matricula_cemep.estudante.nome_social or m.matricula_cemep.estudante.usuario.get_full_name(),
                'status': m.status,
                'qtd_faltas': 0,
                'aulas_faltas': []
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
        Atualiza faltas de um ÚNICO estudante (auto-save).
        """
        aula = self.get_object() # IsOwnerProfessorStrict protege aqui
        
        serializer = AtualizarFaltasSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        estudante_id = serializer.validated_data['estudante_id']
        aulas_faltas = serializer.validated_data['aulas_faltas']
        
        # Usa atomicidade para garantir consistência
        with transaction.atomic():
            if not aulas_faltas:
                # Se lista vazia, remove falta
                Faltas.objects.filter(aula=aula, estudante_id=estudante_id).delete()
            else:
                # Atualiza ou cria
                Faltas.objects.update_or_create(
                    aula=aula,
                    estudante_id=estudante_id,
                    defaults={'aulas_faltas': aulas_faltas}
                )
        
        return Response({'status': 'ok', 'aulas_faltas': aulas_faltas})

    @action(detail=False, methods=['post'])
    def verificar_existente(self, request):
        """Verifica se já existe aula na data/turma."""
        pdt_id = request.data.get('professor_disciplina_turma_id')
        data = request.data.get('data')
        
        if not pdt_id or not data:
            return Response({'error': 'Dados incompletos.'}, status=400)
            
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
        """Valida data para registro de aula (regras pedagógicas)."""
        data_str = request.query_params.get('data')
        if not data_str:
            return Response({'error': 'Data obrigatória.'}, status=400)
            
        try:
            data_registro = datetime.strptime(data_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Formato inválido (YYYY-MM-DD).'}, status=400)
            
        ano = request.user.get_ano_letivo_selecionado()
        resultado = verificar_data_registro_aula(ano, data_registro)
        resultado['ano_letivo'] = ano
        
        return Response(resultado)
