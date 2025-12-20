"""
Views para o App Users
"""
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
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
        """Envia credenciais de acesso por e-mail."""
        email = request.data.get('email')
        username = request.data.get('username')
        password = request.data.get('password')
        nome = request.data.get('nome')
        
        if not email:
            return Response(
                {'detail': 'E-mail é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            send_mail(
                subject='CEMEP Digital - Suas Credenciais de Acesso',
                message=f'''
Olá {nome},

Bem-vindo(a) ao CEMEP Digital!

Suas credenciais de acesso ao sistema foram criadas:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Usuário: {username}
  Senha: {password}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Acesse o sistema em: {request.build_absolute_uri('/').rstrip('/')}

Por segurança, recomendamos que você altere sua senha no primeiro acesso.

Atenciosamente,
Equipe CEMEP Digital
                ''',
                html_message=f'''
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; padding: 40px 20px;">
    <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">CEMEP Digital</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0;">Sistema de Gestão Escolar</p>
        </div>
        <div style="padding: 30px;">
            <h2 style="color: #1e293b; margin-top: 0;">Olá {nome}!</h2>
            <p style="color: #64748b; line-height: 1.6;">
                Bem-vindo(a) ao CEMEP Digital! Suas credenciais de acesso foram criadas.
            </p>
            <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <table style="width: 100%;">
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Usuário:</td>
                        <td style="padding: 8px 0; text-align: right;">
                            <code style="background: white; padding: 6px 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 14px;">{username}</code>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Senha:</td>
                        <td style="padding: 8px 0; text-align: right;">
                            <code style="background: white; padding: 6px 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 14px;">{password}</code>
                        </td>
                    </tr>
                </table>
            </div>
            <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 15px; margin-top: 20px;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                    <strong>⚠️ Importante:</strong> Por segurança, recomendamos que você altere sua senha no primeiro acesso.
                </p>
            </div>
        </div>
        <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                CEMEP Digital - Sistema de Gestão Escolar
            </p>
        </div>
    </div>
</body>
</html>
                ''',
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
        
        # Envia o e-mail
        send_mail(
            subject='CEMEP Digital - Recuperação de Senha',
            message=f'''
Olá {user.first_name},

Você solicitou a recuperação de senha.

Sua nova senha temporária é: {temp_password}

Por favor, altere sua senha após o login.

Atenciosamente,
Equipe CEMEP Digital
            ''',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        
        return Response({'message': 'E-mail de recuperação enviado.'})

