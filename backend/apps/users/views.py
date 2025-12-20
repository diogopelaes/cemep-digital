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

