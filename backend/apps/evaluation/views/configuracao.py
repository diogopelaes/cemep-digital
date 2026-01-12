from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.users.permissions import IsGestao, IsProfessor
from apps.evaluation.models import (
    ConfiguracaoAvaliacaoGeral,
    ConfiguracaoAvaliacaoProfessor,
    FormaCalculo,
    RegraArredondamento,
)
from apps.evaluation.serializers import (
    ConfiguracaoAvaliacaoGeralSerializer,
    ConfiguracaoAvaliacaoProfessorSerializer,
)


class ConfiguracaoAvaliacaoGeralViewSet(viewsets.ModelViewSet):
    """
    ViewSet para configuração geral de avaliação.
    
    Permissões:
    - GET: GESTAO
    - POST/PUT/DELETE: GESTAO
    """
    queryset = ConfiguracaoAvaliacaoGeral.objects.all().select_related('ano_letivo')
    serializer_class = ConfiguracaoAvaliacaoGeralSerializer
    permission_classes = [IsAuthenticated, IsGestao]
    
    def get_queryset(self):
        """Filtra por ano letivo selecionado se disponível."""
        qs = super().get_queryset()
        ano_letivo = self.request.user.get_ano_letivo_selecionado()
        if ano_letivo:
            qs = qs.filter(ano_letivo=ano_letivo)
        return qs
    
    @action(detail=False, methods=['get'])
    def choices(self, request):
        """Retorna as opções de regras de arredondamento."""
        return Response({
            'regra_arredondamento': [
                {'value': choice[0], 'label': choice[1]}
                for choice in RegraArredondamento.choices
            ]
        })
    
    @action(detail=False, methods=['get'])
    def atual(self, request):
        """Retorna a configuração do ano letivo atual."""
        ano_letivo = request.user.get_ano_letivo_selecionado()
        if not ano_letivo:
            return Response(
                {'detail': 'Nenhum ano letivo selecionado.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            config = ConfiguracaoAvaliacaoGeral.objects.get(ano_letivo=ano_letivo)
            serializer = self.get_serializer(config)
            return Response(serializer.data)
        except ConfiguracaoAvaliacaoGeral.DoesNotExist:
            return Response(
                {'detail': 'Configuração não encontrada para o ano letivo atual.'},
                status=status.HTTP_404_NOT_FOUND
            )


class ConfiguracaoAvaliacaoProfessorViewSet(viewsets.ModelViewSet):
    """
    ViewSet para configuração de avaliação do professor.
    
    Permissões:
    - GET: Professor próprio ou GESTAO
    - POST/PUT: Professor próprio
    - DELETE: GESTAO
    """
    queryset = ConfiguracaoAvaliacaoProfessor.objects.all().select_related(
        'ano_letivo', 'professor__usuario'
    )
    serializer_class = ConfiguracaoAvaliacaoProfessorSerializer
    permission_classes = [IsAuthenticated, IsProfessor]
    
    def get_queryset(self):
        """Professor só vê suas próprias configurações."""
        qs = super().get_queryset()
        user = self.request.user
        
        # Gestão vê tudo
        if user.perfil == 'GESTAO':
            return qs
        
        # Professor vê apenas as próprias
        if hasattr(user, 'funcionario'):
            return qs.filter(professor=user.funcionario)
        
        return qs.none()
    
    def perform_create(self, serializer):
        """Define o professor automaticamente se não fornecido."""
        if hasattr(self.request.user, 'funcionario'):
            serializer.save(professor=self.request.user.funcionario)
        else:
            serializer.save()
    
    @action(detail=False, methods=['get'])
    def choices(self, request):
        """Retorna as opções de forma de cálculo."""
        return Response({
            'forma_calculo': [
                {'value': choice[0], 'label': choice[1]}
                for choice in FormaCalculo.choices
            ]
        })
    
    @action(detail=False, methods=['get'])
    def minha(self, request):
        """Retorna a configuração do professor logado para o ano letivo atual."""
        if not hasattr(request.user, 'funcionario'):
            return Response(
                {'detail': 'Usuário não é funcionário.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        ano_letivo = request.user.get_ano_letivo_selecionado()
        if not ano_letivo:
            return Response(
                {'detail': 'Nenhum ano letivo selecionado.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            config = ConfiguracaoAvaliacaoProfessor.objects.get(
                ano_letivo=ano_letivo,
                professor=request.user.funcionario
            )
            serializer = self.get_serializer(config)
            return Response(serializer.data)
        except ConfiguracaoAvaliacaoProfessor.DoesNotExist:
            return Response(
                {'detail': 'Configuração não encontrada.'},
                status=status.HTTP_404_NOT_FOUND
            )
