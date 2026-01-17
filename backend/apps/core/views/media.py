"""
================================================================================
SISTEMA DE MÍDIA PROTEGIDA - CEMEP Digital
================================================================================

Este módulo implementa controle de acesso a arquivos de mídia via HTTP.
Toda a lógica de negócio e armazenamento foi delegada ao MediaService.

FLUXO:
1. Recebe requisição (GET)
2. MediaService verifica permissões (check_access)
3. Se negado: Retorna JSON ou Redireciona para Frontend (Login/Forbidden)
4. Se permitido: MediaService entrega o arquivo (Local ou Signed URL)

================================================================================
"""
from django.conf import settings
from django.shortcuts import redirect
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import NotAuthenticated
from django.http import HttpResponseForbidden

from apps.core.services.media_service import MediaService

class ProtectedMediaView(APIView):
    """
    Endpoint para acesso seguro a arquivos de mídia.
    Delega a lógica para apps.core.services.media_service.MediaService.
    """
    
    # Permite que qualquer um chegue ao método handler.
    # A validação real acontece no service.
    permission_classes = [AllowAny]
    
    def get(self, request, file_path):
        """
        Serve o arquivo após verificação de permissões.
        """
        # 1. Verifica Acesso
        access = MediaService.check_access(request.user, file_path)
        
        if not access.allowed:
            # Tratamento de Erro: API (JSON) vs Navegador (HTML)
            accept_header = request.META.get('HTTP_ACCEPT', '')
            is_browser_request = 'text/html' in accept_header
            
            if is_browser_request:
                if access.reason == "not_authenticated":
                    return redirect(f"{settings.FRONTEND_URL}/login")
                else:
                    return redirect(f"{settings.FRONTEND_URL}/forbidden")

            # Resposta Padrão API
            if access.reason == "not_authenticated":
                raise NotAuthenticated("Autenticação necessária para acessar este arquivo.")
            else:
                return HttpResponseForbidden(
                    "Você não tem permissão para acessar este arquivo."
                )
        
        # 2. Serve o Arquivo (Delega a estratégia de storage)
        return MediaService.serve_file(file_path)
