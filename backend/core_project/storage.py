"""
================================================================================
STORAGE BACKENDS - CEMEP Digital
================================================================================

Este módulo define os backends de armazenamento para arquivos de mídia.

ESTRATÉGIA:
-----------
- Desenvolvimento (DEBUG=True): Armazenamento local em MEDIA_ROOT
- Produção (USE_GCS=True): Google Cloud Storage com Signed URLs

SEGURANÇA (GCS):
----------------
1. O bucket é configurado como PRIVADO (GS_DEFAULT_ACL='private')
2. Ninguém acessa arquivos diretamente pela URL pública do GCS
3. O Django gera Signed URLs temporárias (15 min) após verificar permissões
4. URLs expiradas são inúteis - o usuário deve solicitar novamente

FLUXO DE ACESSO:
---------------
Usuário → JWT Token → ProtectedMediaView → Verifica Permissões → Signed URL

================================================================================
"""
from datetime import timedelta
from django.conf import settings


# Só importa o backend GCS se estiver configurado para usar
if getattr(settings, 'USE_GCS', False):
    from storages.backends.gcloud import GoogleCloudStorage
    
    class CEMEPGoogleCloudStorage(GoogleCloudStorage):
        """
        Storage backend customizado para Google Cloud Storage.
        
        IMPORTANTE: Todos os arquivos são privados por padrão.
        O acesso é controlado via Signed URLs geradas pelo Django
        após verificação de permissões em ProtectedMediaView.
        
        Configurações esperadas em settings.py:
        - GS_BUCKET_NAME: Nome do bucket no GCS
        - GS_PROJECT_ID: ID do projeto no Google Cloud
        - GS_CREDENTIALS: Caminho para o arquivo JSON de credenciais
        - GS_SIGNED_URL_EXPIRY: timedelta para expiração das URLs
        """
        
        def url(self, name):
            """
            Gera uma Signed URL para acesso temporário ao arquivo.
            
            Esta URL:
            - Expira após GS_SIGNED_URL_EXPIRY (padrão: 15 minutos)
            - Contém assinatura criptográfica validada pelo Google
            - Não pode ser reutilizada após expiração
            - É única para cada solicitação
            
            Args:
                name: Caminho do arquivo no bucket (ex: 'profile_pics/abc.jpg')
                
            Returns:
                URL assinada temporária para download do arquivo
            """
            expiry = getattr(settings, 'GS_SIGNED_URL_EXPIRY', timedelta(minutes=15))
            
            # Gera URL assinada usando as credenciais do service account
            blob = self.bucket.blob(name)
            return blob.generate_signed_url(
                expiration=expiry,
                method='GET',
                version='v4'  # Usa a versão mais recente da assinatura
            )
