"""
View para Plano de Aula
"""
from rest_framework import viewsets
from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend

from apps.pedagogical.models import PlanoAula
from apps.pedagogical.serializers import PlanoAulaSerializer




from apps.core.models import Funcionario, ProfessorDisciplinaTurma, Disciplina, Habilidade
from apps.core.serializers.disciplina import DisciplinaSerializer
from apps.core.serializers.turma import TurmaSerializer
from apps.core.serializers.habilidade import HabilidadeSerializer
from rest_framework import permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from core_project.permissions import Policy, PROFESSOR, FUNCIONARIO, OWNER, GESTAO

class PlanoAulaViewSet(viewsets.ModelViewSet):
    """
    ViewSet de Planos de Aula.
    - Create: Professor
    - Update/Destroy: Owner (Professor criador) ou Gestão
    - Read: Funcionários (filtrado para professor ver apenas os seus)
    """
    permission_classes = [Policy(
        create=[PROFESSOR],
        read=[FUNCIONARIO],
        update=[OWNER, GESTAO],
        delete=[OWNER, GESTAO],
        custom={
            'contexto_formulario': [PROFESSOR]
        }
    )]
    queryset = PlanoAula.objects.select_related(
        'professor__usuario', 
        'disciplina'
    ).prefetch_related(
        'turmas__curso', 
        'habilidades'
    )

    serializer_class = PlanoAulaSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['professor', 'disciplina', 'turmas', 'ano_letivo', 'bimestre']
    search_fields = ['titulo', 'conteudo']
    ordering_fields = ['data_inicio', 'bimestre', 'disciplina__nome', 'titulo']
    ordering = ['-data_inicio', '-bimestre', 'disciplina__nome', 'titulo']  # Ordenação padrão



    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        
        # Filtra pelo ano letivo selecionado
        if hasattr(user, 'ano_letivo_selecionado') and user.ano_letivo_selecionado:
             qs = qs.filter(ano_letivo=user.ano_letivo_selecionado.ano_letivo)

        # Se for professor (e não gestão), vê apenas os próprios planos
        if user.tipo_usuario == 'PROFESSOR' and not user.is_staff: # Refinar is_staff check se necessario
             # Assumindo que 'GESTAO' tem permissão total, mas 'PROFESSOR' só vê o seu.
             # A antiga logica de permissao dava leitura para funcionarios.

             # Mas o requisito 1 diz "apenas usuário professor pode criar".
             # Requisito 3 diz "ao selecionar a disciplina deve aparecer...".
             # Vou restringir a visualização para o próprio professor ou gestão.
             if hasattr(user, 'funcionario'):
                 qs = qs.filter(professor=user.funcionario)

        # Filtros adicionais para uso no select de AulaFaltasForm
        data_aula = self.request.query_params.get('data')
        turma_id = self.request.query_params.get('turma_id')
        disciplina_id = self.request.query_params.get('disciplina_id')

        if data_aula:
            qs = qs.filter(data_inicio__lte=data_aula, data_fim__gte=data_aula)
        
        if turma_id:
            qs = qs.filter(turmas__id=turma_id)
        
        if disciplina_id:
            qs = qs.filter(disciplina_id=disciplina_id)
        
        return qs

    def list(self, request, *args, **kwargs):
        """Override list to include discipline count for the professor."""
        response = super().list(request, *args, **kwargs)
        
        # Conta quantas disciplinas distintas o professor leciona no ano selecionado
        user = request.user
        disciplinas_count = 1  # Default: assume apenas uma
        
        if hasattr(user, 'funcionario'):
            ano_letivo = user.get_ano_letivo_selecionado()
            if ano_letivo:
                disciplinas_count = ProfessorDisciplinaTurma.objects.filter(
                    professor=user.funcionario,
                    disciplina_turma__turma__ano_letivo=ano_letivo.ano,
                    disciplina_turma__turma__is_active=True
                ).values('disciplina_turma__disciplina').distinct().count()
        
        # Adiciona a contagem ao response (metadata)
        if isinstance(response.data, dict):
            response.data['disciplinas_count'] = disciplinas_count
        else:
            # Se paginação está desativada e retorna lista direta
            response.data = {'results': response.data, 'disciplinas_count': disciplinas_count}
        
        return response

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
            disciplina_turma__turma__ano_letivo=ano_letivo.ano,
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
                'numero_letra': turma.numero_letra
            }
            
            # Adiciona turma à lista da disciplina se ainda não estiver
            if turma_data not in turmas_por_disciplina[str(disc.id)]:
                turmas_por_disciplina[str(disc.id)].append(turma_data)

        # 4. Serializa
        disciplinas_list = sorted(list(disciplinas_map.values()), key=lambda d: d.nome)
        disciplinas_data = DisciplinaSerializer(disciplinas_list, many=True).data
        
        # Busca habilidades das disciplinas encontradas (agora via M2M reverso)
        # Estrutura: { disciplina_id: [habilidades] }
        habilidades_por_disciplina = {}
        for disc in disciplinas_list:
            habilidades_disc = disc.habilidades.filter(is_active=True)
            habilidades_por_disciplina[str(disc.id)] = HabilidadeSerializer(habilidades_disc, many=True).data

        return Response({
            'disciplinas': disciplinas_data,
            'turmas_por_disciplina': turmas_por_disciplina,
            'habilidades_por_disciplina': habilidades_por_disciplina
        })
