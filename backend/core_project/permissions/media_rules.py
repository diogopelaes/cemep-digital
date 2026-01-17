from core_project.permissions.constants import FUNCIONARIO_TIPOS, ADMIN
from apps.core.models import Arquivo

class MediaAccessResult:
    """DTO para resultado da verificação de acesso."""
    def __init__(self, allowed: bool, reason: str):
        self.allowed = allowed
        self.reason = reason

def _is_public_path(file_path: str) -> bool:
    return file_path.startswith('public/')

def _is_admin(user) -> bool:
    """Verifica se é Gestão ou Secretaria (Super Acesso)."""
    if not user.is_authenticated:
        return False
    return getattr(user, 'tipo_usuario', None) in ADMIN
    
def _is_equipe_escolar(user) -> bool:
    """Verifica se é funcionário (Gestão, Sec, Prof, Monitor)."""
    if not user.is_authenticated:
        return False
    return getattr(user, 'tipo_usuario', None) in FUNCIONARIO_TIPOS

def check_media_access(user, file_path: str) -> MediaAccessResult:
    """
    Verifica se o usuário tem permissão para acessar o arquivo.
    
    Regras:
    1. public/ -> Permitido
    2. Não autenticado -> Negado
    3. ADMIN (Gestão/Sec) -> Acesso Total aos arquivos registrados
    4. Regras do Arquivo (Visibilidade/Owner)
    5. Arquivo legado (sem registro) -> Permitido apenas para Equipe Escolar
    """
    
    # 1. Arquivos públicos
    if _is_public_path(file_path):
        return MediaAccessResult(True, "public")
    
    # 2. Autenticação obrigatória
    if not user.is_authenticated:
        return MediaAccessResult(False, "not_authenticated")
        
    # 3. Super acesso para ADMIN (Gestão/Secretaria)
    # Eles podem ver arquivos privados de qualquer um
    if _is_admin(user):
        return MediaAccessResult(True, "admin_override")
        
    # 4. Verificação no Banco de Dados
    try:
        arquivo_obj = Arquivo.objects.filter(arquivo=file_path).first()
        
        if arquivo_obj:
            visibilidade = getattr(arquivo_obj, 'visibilidade', 'PRIVATE')
            
            if visibilidade == 'PUBLIC':
                return MediaAccessResult(True, "visibility_public")
            
            if visibilidade == 'AUTHENTICATED':
                return MediaAccessResult(True, "visibility_authenticated")
            
            # PRIVATE
            if arquivo_obj.is_owner(user):
                return MediaAccessResult(True, "owner")
            else:
                return MediaAccessResult(False, "private_file")
        else:
            # Arquivo não registrado (Legado)
            # Permite apenas para Equipe Escolar (Staff), bloqueia alunos
            if _is_equipe_escolar(user):
                return MediaAccessResult(True, "legacy_staff_access")
                
            return MediaAccessResult(False, "not_registered")
            
    except Exception:
        return MediaAccessResult(False, "error")
