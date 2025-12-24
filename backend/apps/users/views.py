"""
Views para o App Users
"""
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
import secrets

from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    ChangePasswordSerializer, PasswordResetRequestSerializer
)
from .permissions import IsGestao, IsOwnerOrGestao

User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciamento de usuários."""
    
    queryset = User.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer
    
    # controle_de_permissao
    def get_permissions(self):
        if self.action in ['create', 'destroy']:
            return [IsGestao()]
        elif self.action in ['update', 'partial_update']:
            return [IsOwnerOrGestao()]
        return [IsAuthenticated()]
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Retorna os dados do usuário autenticado."""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['put'])
    def update_me(self, request):
        """Atualiza os dados do usuário autenticado."""
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)
    
    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """Altera a senha do usuário autenticado."""
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'message': 'Senha alterada com sucesso.'})
    
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
        username = request.data.get('username')
        password = request.data.get('password')
        nome = request.data.get('nome')
        
        if not email:
            return Response(
                {'detail': 'E-mail é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Contexto para o template
        context = {
            'nome': nome,
            'username': username,
            'password': password,
            'site_url': settings.SITE_URL,
            'site_name': settings.SITE_NAME,
            'institution_name': settings.INSTITUTION_NAME,
            'logo_url': f"{settings.SITE_URL}/static/img/{settings.INSTITUTIONAL_DATA['institution']['logo']['filename']}",
        }
        
        try:
            # Renderiza o template HTML
            html_message = render_to_string('emails/credentials_email.html', context)
            plain_message = strip_tags(html_message)
            
            send_mail(
                subject=f'{settings.SITE_NAME} - Suas Credenciais de Acesso',
                message=plain_message,
                html_message=html_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
            return Response({'message': 'E-mail enviado com sucesso.'})
        except Exception as e:
            return Response(
                {'detail': f'Erro ao enviar e-mail: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PasswordResetRequestView(generics.GenericAPIView):
    """View para solicitação de recuperação de senha."""
    
    permission_classes = [AllowAny]
    serializer_class = PasswordResetRequestSerializer
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        user = User.objects.get(email=email)
        
        # Gera uma senha temporária
        temp_password = secrets.token_urlsafe(8)
        user.set_password(temp_password)
        user.save()
        
        # Contexto para o template de e-mail
        context = {
            'nome': user.first_name or user.username,
            'username': user.username,
            'password': temp_password,
            'site_url': settings.SITE_URL,
            'site_name': settings.SITE_NAME,
            'institution_name': settings.INSTITUTION_NAME,
            'logo_url': f"{settings.SITE_URL}/static/img/{settings.INSTITUTIONAL_DATA['institution']['logo']['filename']}",
        }
        
        try:
            # Renderiza o template HTML
            html_message = render_to_string('emails/password_reset_email.html', context)
            plain_message = strip_tags(html_message)
            
            send_mail(
                subject=f'{settings.SITE_NAME} - Recuperação de Senha',
                message=plain_message,
                html_message=html_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
        except Exception as e:
            # Em caso de erro no envio, podemos logar o erro
            print(f"Erro ao enviar e-mail de recuperação: {e}")
        
        return Response({'message': 'E-mail de recuperação enviado.'})

