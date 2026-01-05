"""
View para Plano de Aula
"""
from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend

from apps.pedagogical.models import PlanoAula
from apps.pedagogical.serializers import PlanoAulaSerializer
from apps.users.permissions import ProfessorWriteFuncionarioReadMixin


from apps.users.permissions import ProfessorWriteFuncionarioReadMixin, IsOwnerOrGestao, IsProfessor, IsGestao
from apps.core.models import Funcionario, ProfessorDisciplinaTurma, Disciplina
from apps.core.serializers.disciplina import DisciplinaSerializer
from apps.core.serializers.turma import TurmaSerializer
from rest_framework import permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

class PlanoAulaViewSet(ProfessorWriteFuncionarioReadMixin, viewsets.ModelViewSet):
    """
    ViewSet de Planos de Aula.
    - Create: Professor
    - Update/Destroy: Owner (Professor criador) ou Gestão
    - Read: Funcionários (filtrado para professor ver apenas os seus)
    """
    queryset = PlanoAula.objects.select_related('professor__usuario', 'disciplina').prefetch_related('turmas', 'habilidades')
    serializer_class = PlanoAulaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['professor', 'disciplina', 'turmas', 'ano_letivo', 'bimestre']

    def get_permissions(self):
        if self.action == 'create':
            return [IsProfessor()]
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsOwnerOrGestao()]
        return super().get_permissions()

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        
        # Filtra pelo ano letivo selecionado
        if hasattr(user, 'ano_letivo_selecionado') and user.ano_letivo_selecionado:
             qs = qs.filter(ano_letivo=user.ano_letivo_selecionado.ano_letivo)

        # Se for professor (e não gestão), vê apenas os próprios planos
        if user.tipo_usuario == 'PROFESSOR' and not user.is_staff: # Refinar is_staff check se necessario
             # Assumindo que 'GESTAO' tem permissão total, mas 'PROFESSOR' só vê o seu.
             # O mixin ProfessorWriteFuncionarioReadMixin dá leitura para todos funcionários.
             # Mas o requisito 1 diz "apenas usuário professor pode criar".
             # Requisito 3 diz "ao selecionar a disciplina deve aparecer...".
             # Vou restringir a visualização para o próprio professor ou gestão.
             if hasattr(user, 'funcionario'):
                 qs = qs.filter(professor=user.funcionario)
        
        return qs

    @action(detail=False, methods=['get'], url_path='contexto-formulario')
    def contexto_formulario(self, request):
        """
        Retorna os dados necessários para o formulário de Plano de Aula:
        - Disciplinas que o professor leciona
        - Turmas vinculadas a cada disciplina
        """
        user = request.user
        
        # 1. Validações iniciais
        if not hasattr(user, 'funcionario'):
             return Response(
                {'detail': 'Usuário não é um funcionário/professor.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        ano_letivo = user.get_ano_letivo_selecionado()
        if not ano_letivo:
             return Response(
                {'detail': 'Nenhum ano letivo selecionado.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        professor = user.funcionario

        # 2. Busca atribuições (Professor -> Disciplina -> Turma)
        atribuicoes = ProfessorDisciplinaTurma.objects.filter(
            professor=professor,
            disciplina_turma__turma__ano_letivo=ano_letivo,
            disciplina_turma__turma__is_active=True
        ).select_related(
            'disciplina_turma__disciplina',
            'disciplina_turma__turma',
            'disciplina_turma__turma__curso'
        )

        if not atribuicoes.exists():
             return Response({
                'disciplinas': [],
                'turmas_por_disciplina': {}
            })

        # 3. Organiza os dados
        disciplinas_map = {} # {id: DisciplinaObj} para garantir unicidade
        turmas_por_disciplina = {} # {disciplina_id: [TurmaData, ...]}

        for atrib in atribuicoes:
            disc = atrib.disciplina_turma.disciplina
            turma = atrib.disciplina_turma.turma
            
            # Adiciona disciplina ao mapa se não existir
            if disc.id not in disciplinas_map:
                disciplinas_map[disc.id] = disc
                turmas_por_disciplina[str(disc.id)] = []
            
            # Formata dados da turma resumidos
            turma_data = {
                'id': str(turma.id),
                'numero': turma.numero,
                'letra': turma.letra,
                'curso': {'sigla': turma.curso.sigla if turma.curso else ''}
            }
            
            # Adiciona turma à lista da disciplina se ainda não estiver (evita duplicatas se houver múltiplas atribuições na mesma turma)
            if turma_data not in turmas_por_disciplina[str(disc.id)]:
                turmas_por_disciplina[str(disc.id)].append(turma_data)

        # 4. Serializa
        disciplinas_list = sorted(list(disciplinas_map.values()), key=lambda d: d.nome)
        disciplinas_data = DisciplinaSerializer(disciplinas_list, many=True).data

        return Response({
            'disciplinas': disciplinas_data,
            'turmas_por_disciplina': turmas_por_disciplina
        })
