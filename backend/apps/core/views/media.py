"""
================================================================================
SISTEMA DE MÍDIA PROTEGIDA - CEMEP Digital
================================================================================

Este módulo implementa controle de acesso a arquivos de mídia.

REGRAS DE ACESSO:
-----------------
1. Arquivos em `public/`: Acesso livre (logos, assets)
2. Arquivos registrados no model `Arquivo`: Verificação de ownership
   - OWNER: Usuário que fez upload pode acessar
   - FUNCIONARIO: Gestão, Secretaria, Professor, Monitor podem acessar
3. Arquivos não registrados (legacy/direto no model): Requer autenticação

FLUXO DE VERIFICAÇÃO:
---------------------
1. Se path começa com `public/` → AllowAny
2. Busca registro `Arquivo` pelo path do arquivo
3. Se encontrado → Verifica is_owner() OU is_funcionario()
4. Se não encontrado → Apenas autenticados (fallback seguro)

COMPATIBILIDADE GCS:
--------------------
- Em produção (USE_GCS=True): Gera Signed URL temporária
- Em desenvolvimento: Serve arquivo do disco local

================================================================================
"""
import os
import mimetypes
from django.conf import settings
from django.http import FileResponse, Http404, HttpResponseForbidden
from django.shortcuts import redirect
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny

from core_project.permissions.constants import FUNCIONARIO_TIPOS


class ProtectedMediaView(APIView):
    """
    Serve arquivos de mídia com controle de acesso baseado em ownership.
    
    Política:
    - public/: Qualquer pessoa
    - Outros: OWNER ou FUNCIONARIO (consistente com ArquivoViewSet)
    
    Segurança:
    - Previne ataques de path traversal
    - Verifica ownership via model Arquivo
    - Retorna 401/403/404 conforme apropriado
    
    Performance:
    - Cache de 1 hora para imagens
    - Signed URLs para GCS (não passa pelo Django)
    """
    
    # Sempre permite a requisição chegar ao método get()
    # A verificação de permissão é feita manualmente para suportar lógica complexa
    permission_classes = [AllowAny]
    
    def _is_public_path(self, file_path: str) -> bool:
        """Verifica se o path é público (não requer autenticação)."""
        return file_path.startswith('public/')
    
    def _is_funcionario(self, user) -> bool:
        """Verifica se o usuário é funcionário."""
        if not user.is_authenticated:
            return False
        return getattr(user, 'tipo_usuario', None) in FUNCIONARIO_TIPOS
    
    
    def _can_access_file(self, request, file_path: str) -> tuple[bool, str]:
        """
        Verifica se o usuário pode acessar o arquivo.
        A autenticação é feita via Sessão (Browser) ou JWT (API).
        
        Returns:
            tuple: (pode_acessar: bool, motivo: str)
        """
        user = request.user
        
        # 1. Arquivos públicos: acesso livre
        if self._is_public_path(file_path):
            return True, "public"
        
        # 2. Requer autenticação
        if not user.is_authenticated:
            return False, "not_authenticated"
        
        # 3. Funcionários podem acessar qualquer arquivo protegido
        if self._is_funcionario(user):
            return True, "funcionario"
        
        # 4. Busca o registro Arquivo para verificar ownership
        from apps.core.models import Arquivo
        
        try:
            # O path do arquivo no FileField inclui o caminho relativo
            arquivo = Arquivo.objects.filter(arquivo=file_path).first()
            
            if arquivo:
                # Verifica se é o dono
                if arquivo.is_owner(user):
                    return True, "owner"
                else:
                    return False, "not_owner"
            else:
                # Arquivo não registrado no model Arquivo
                # Pode ser um arquivo de model legado (ImageField direto)
                # Para esses, permite apenas funcionários (já verificado acima)
                # Usuários não-funcionários não podem acessar
                return False, "not_registered"
                
        except Exception:
            # Em caso de erro, bloqueia por segurança
            return False, "error"

    def get(self, request, file_path):
        """
        Serve o arquivo após verificação de permissões.
        """
        # Verifica permissão de acesso
        can_access, reason = self._can_access_file(request, file_path)
        
        if not can_access:
            # Se for requisição de navegador (espera HTML), redireciona para página bonita
            accept_header = request.META.get('HTTP_ACCEPT', '')
            is_browser_request = 'text/html' in accept_header
            
            if is_browser_request:
                from django.conf import settings
                if reason == "not_authenticated":
                    # Redireciona para login
                    return redirect(f"{settings.FRONTEND_URL}/login")
                else:
                    # Redireciona para Forbidden
                    return redirect(f"{settings.FRONTEND_URL}/forbidden")

            # Retorno padrão JSON para APIs
            if reason == "not_authenticated":
                from rest_framework.exceptions import NotAuthenticated
                raise NotAuthenticated("Autenticação necessária para acessar este arquivo.")
            else:
                return HttpResponseForbidden(
                    "Você não tem permissão para acessar este arquivo."
                )
        
        # =====================================================================
        # GOOGLE CLOUD STORAGE: Redireciona para Signed URL
        # =====================================================================
        if getattr(settings, 'USE_GCS', False):
            from django.core.files.storage import default_storage
            
            if not default_storage.exists(file_path):
                raise Http404("Arquivo não encontrado")
            
            # Gera URL assinada temporária
            signed_url = default_storage.url(file_path)
            return redirect(signed_url)
        
        # =====================================================================
        # ARMAZENAMENTO LOCAL: Serve do disco
        # =====================================================================
        absolute_path = os.path.join(settings.MEDIA_ROOT, file_path)
        
        # Previne Path Traversal Attack
        absolute_path = os.path.normpath(absolute_path)
        if not absolute_path.startswith(str(settings.MEDIA_ROOT)):
            raise Http404("Arquivo não encontrado")
        
        if not os.path.exists(absolute_path) or not os.path.isfile(absolute_path):
            raise Http404("Arquivo não encontrado")
        
        # Detecta content type
        content_type, _ = mimetypes.guess_type(absolute_path)
        if content_type is None:
            content_type = 'application/octet-stream'
        
        # Serve o arquivo
        response = FileResponse(
            open(absolute_path, 'rb'),
            content_type=content_type
        )
        
        # Cache para imagens
        if content_type.startswith('image/'):
            response['Cache-Control'] = 'private, max-age=3600'
        
        return response
