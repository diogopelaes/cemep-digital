"""
View para MinhasTurmas (Turmas do Professor)
"""
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.core.models import Turma, ProfessorDisciplinaTurma
from apps.core.serializers.turma import TurmaSerializer


class MinhasTurmasViewSet(viewsets.ViewSet):
    """
    ViewSet para retornar as turmas onde o professor autenticado leciona.
    
    Permissões: Qualquer usuário autenticado pode acessar (filtra automaticamente).
    
    GET /core/minhas-turmas/ - Retorna as turmas do professor no ano letivo selecionado
    GET /core/minhas-turmas/{id}/ - Retorna os detalhes de uma turma específica
    """
    permission_classes = [IsAuthenticated]

    def _get_disciplinas_por_turma(self, professor, ano_letivo):
        """
        Retorna um dicionário mapeando turma_id -> lista de disciplinas (sigla, nome).
        """
        if not ano_letivo:
            return {}
            
        atribuicoes = ProfessorDisciplinaTurma.objects.filter(
            professor=professor,
            disciplina_turma__turma__ano_letivo=ano_letivo.ano
        ).select_related(
            'disciplina_turma__disciplina',
            'disciplina_turma__turma'
        )
        
        disciplinas_map = {}
        for atribuicao in atribuicoes:
            turma_id = str(atribuicao.disciplina_turma.turma.id)
            disciplina = atribuicao.disciplina_turma.disciplina
            
            if turma_id not in disciplinas_map:
                disciplinas_map[turma_id] = []
            
            # Evita duplicatas caso haja múltiplas atribuições (ex: titular e substituto na mesma disciplina?? improvável, mas seguro)
            dados_brutos = {'sigla': disciplina.sigla, 'nome': disciplina.nome}
            if dados_brutos not in disciplinas_map[turma_id]:
                disciplinas_map[turma_id].append(dados_brutos)
                
        return disciplinas_map

    def list(self, request):
        """Retorna as turmas onde o professor leciona no ano letivo selecionado."""
        user = request.user
        ano_letivo = user.get_ano_letivo_selecionado()
        
        if not ano_letivo:
            return Response(
                {'detail': 'Nenhum ano letivo selecionado ou ativo.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            funcionario = user.funcionario
        except AttributeError:
            return Response(
                {'detail': 'Usuário não possui perfil de funcionário.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Mapa de disciplinas
        disciplinas_map = self._get_disciplinas_por_turma(funcionario, ano_letivo)
        turma_ids = list(disciplinas_map.keys())
        
        turmas = Turma.objects.filter(
            id__in=turma_ids
        ).select_related(
            'curso'
        ).order_by('numero', 'letra')
        
        serializer = TurmaSerializer(turmas, many=True)
        data = serializer.data
        
        # Injeta as disciplinas
        for turma_data in data:
            turma_data['disciplinas_lecionadas'] = disciplinas_map.get(turma_data['id'], [])
            
        return Response({
            'results': data,
            'count': len(data)
        })

    def retrieve(self, request, pk=None):
        """Retorna os detalhes de uma turma específica."""
        user = request.user
        ano_letivo = user.get_ano_letivo_selecionado()
        
        try:
            funcionario = user.funcionario
        except AttributeError:
            return Response(
                {'detail': 'Usuário não possui perfil de funcionário.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Verifica atribuição
        leciona_turma = ProfessorDisciplinaTurma.objects.filter(
            professor=funcionario,
            disciplina_turma__turma__id=pk,
            disciplina_turma__turma__ano_letivo=ano_letivo.ano if ano_letivo else None
        ).exists()
        
        if not leciona_turma:
            return Response(
                {'detail': 'Você não leciona nesta turma.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            turma = Turma.objects.select_related(
                'curso'
            ).get(id=pk)
        except Turma.DoesNotExist:
            return Response(
                {'detail': 'Turma não encontrada.'},
                status=status.HTTP_404_NOT_FOUND
            )
            
        # Busca disciplinas desta turma específica
        disciplinas_map = self._get_disciplinas_por_turma(funcionario, ano_letivo)
        
        serializer = TurmaSerializer(turma)
        data = serializer.data
        data['disciplinas_lecionadas'] = disciplinas_map.get(str(turma.id), [])
        
        return Response(data)
