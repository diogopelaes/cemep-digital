from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings

from apps.users.serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer
)


User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciamento de usuários."""
    queryset = User.objects.all()

    def destroy(self, request, *args, **kwargs):
        # Mesmo para Gestão, a exclusão direta pode ser perigosa.
        # Mantendo o comportamento de não permitir exclusão por enquanto,
        # ou se o usuário quiser liberar para gestão, alteraria aqui.
        # O pedido foi "criação e update... gestão".
        # Vou manter blouqeado destroy por segurança se não foi explicitamente pedido para liberar.
        return Response({'detail': 'A exclusão de registros não é permitida.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer
    
    def get_permissions(self):
        return [IsAuthenticated()]
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Retorna os dados do usuário autenticado."""
        return Response(UserSerializer(request.user).data)
    
    @action(detail=False, methods=['post'])
    def toggle_dark_mode(self, request):
        """Alterna o modo escuro do usuário."""
        request.user.dark_mode = not request.user.dark_mode
        request.user.save()
        return Response({'dark_mode': request.user.dark_mode})
    
    @action(detail=False, methods=['post'], url_path='send-credentials')
    def send_credentials(self, request):
        """Envia credenciais de acesso por e-mail usando template HTML."""
        email = request.data.get('email')
        if not email:
            return Response({'detail': 'E-mail é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
        
        context = {
            'nome': request.data.get('nome'),
            'username': request.data.get('username'),
            'password': request.data.get('password'),
            'site_url': settings.SITE_URL,
            'site_name': settings.SITE_NAME,
            'institution_name': settings.INSTITUTION_NAME,
            'logo_url': f"{settings.SITE_URL}/static/img/{settings.INSTITUTIONAL_DATA['institution']['logo']['filename']}",
        }
        
        try:
            html_message = render_to_string('emails/credentials_email.html', context)
            send_mail(
                subject=f'{settings.SITE_NAME} - Suas Credenciais de Acesso',
                message=strip_tags(html_message),
                html_message=html_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
            return Response({'message': 'E-mail enviado com sucesso.'})
        except Exception as e:
            return Response({'detail': f'Erro ao enviar e-mail: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
