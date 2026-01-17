"""
View de autenticação que unifica JWT e Sessão para segurança máxima.
Necessário para permitir acesso a arquivos protegidos via browser (tags <img>)
sem expor tokens na URL.
"""
from django.contrib.auth import authenticate, login
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken


class LoginView(APIView):
    """
    Login híbrido: Sessão (para Mídia) + JWT (para API).
    
    Cria um cookie de sessão HttpOnly que permite ao navegador acessar
    """
    permission_classes = [AllowAny]
    authentication_classes = []  # Remove autenticação padrão (e verificação CSRF)
    
    def post(self, request):
        username = request.data.get('username', '')
        password = request.data.get('password', '')
        
        if not username or not password:
            return Response(
                {'detail': 'Usuário e senha são obrigatórios.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = authenticate(request, username=username, password=password)
        
        if user is None:
            return Response(
                {'detail': 'Credenciais inválidas.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not user.is_active:
            return Response(
                {'detail': 'Conta desativada.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # OBRIGATÓRIO: Cria a sessão Django (cookie sessionid)
        # Isso habilita o acesso direto às URLs de mídia no browser
        login(request, user)
        
        # Gera JWT para uso nas chamadas de API padrão
        refresh = RefreshToken.for_user(user)
        
        user_data = {
            'id': str(user.id),
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'tipo_usuario': user.tipo_usuario,
            'dark_mode': user.dark_mode,
        }
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': user_data,
        })


class LogoutView(APIView):
    """Logout completo (Sessão + JWT Blacklist client-side)."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        from django.contrib.auth import logout
        # Limpa o cookie de sessão
        logout(request)
        return Response({'detail': 'Logout realizado com sucesso.'})
