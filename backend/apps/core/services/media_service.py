import os
import mimetypes
from django.conf import settings
from django.http import FileResponse, Http404
from django.shortcuts import redirect

from core_project.permissions.media_rules import check_media_access, MediaAccessResult

class MediaService:
    """
    Serviço responsável pela lógica de negócio de arquivos de mídia.
    Centraliza regras de acesso (com media_rules) e estratégias de entrega (Storage).
    """

    @classmethod
    def check_access(cls, user, file_path: str) -> MediaAccessResult:
        """
        Verifica permissões delegando para media_rules.
        """
        return check_media_access(user, file_path)

    @staticmethod
    def serve_file(file_path: str):
        """
        Retorna a resposta apropriada para servir o arquivo:
        - Redirect (para Signed URL do GCS)
        - FileResponse (para arquivo local)
        - Http404 (se não encontrado)
        """
        
        # Estratégia GCS
        if getattr(settings, 'USE_GCS', False):
            from django.core.files.storage import default_storage
            
            if not default_storage.exists(file_path):
                raise Http404("Arquivo não encontrado")
            
            signed_url = default_storage.url(file_path)
            return redirect(signed_url)
            
        # Estratégia Local
        absolute_path = os.path.normpath(os.path.join(settings.MEDIA_ROOT, file_path))
        
        # Segurança: Path Traversal
        if not absolute_path.startswith(str(settings.MEDIA_ROOT)):
            raise Http404("Arquivo não encontrado")
            
        if not os.path.exists(absolute_path) or not os.path.isfile(absolute_path):
            raise Http404("Arquivo não encontrado")
            
        content_type, _ = mimetypes.guess_type(absolute_path)
        if content_type is None:
            content_type = 'application/octet-stream'
            
        response = FileResponse(
            open(absolute_path, 'rb'),
            content_type=content_type
        )
        
        if content_type.startswith('image/'):
            response['Cache-Control'] = 'private, max-age=3600'
            
        return response
