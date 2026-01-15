from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.evaluation.models import AvaliacaoConfigProfessor
from apps.evaluation.serializers.avaliacao_config_professor import AvaliacaoConfigProfessorSerializer
from apps.users.permissions import IsProfessor

class AvaliacaoConfigProfessorViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Configurações de Avaliação do Professor.
    """
    queryset = AvaliacaoConfigProfessor.objects.all()
    serializer_class = AvaliacaoConfigProfessorSerializer
    permission_classes = [IsProfessor]

    def get_queryset(self):
        user = self.request.user
        if not hasattr(user, 'funcionario'):
            return AvaliacaoConfigProfessor.objects.none()
        
        qs = super().get_queryset()
        if user.tipo_usuario == 'PROFESSOR':
            qs = qs.filter(professor=user.funcionario)
        
        return qs

    @action(detail=False, methods=['get', 'post', 'patch'], url_path='mine')
    def mine(self, request):
        """
        Retorna ou atualiza a configuração do professor logado para o ano letivo selecionado.
        """
        user = request.user
        if not hasattr(user, 'funcionario'):
            return Response({'error': 'Usuário sem vínculo de funcionário.'}, status=400)
        
        ano_selecionado = user.get_ano_letivo_selecionado()
        if not ano_selecionado:
            return Response({'error': 'Nenhum ano letivo selecionado.'}, status=400)
            
        config, created = AvaliacaoConfigProfessor.objects.get_or_create(
            professor=user.funcionario,
            ano_letivo=ano_selecionado
        )
        
        if request.method in ['POST', 'PATCH']:
            # Força o professor e ano letivo para garantir integridade
            data = request.data.copy()
            data['professor'] = user.funcionario.id
            data['ano_letivo'] = ano_selecionado.id
            
            serializer = AvaliacaoConfigProfessorSerializer(config, data=data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        serializer = AvaliacaoConfigProfessorSerializer(config)
        return Response(serializer.data)
