"""
================================================================================
SISTEMA DE MÍDIA PROTEGIDA - CEMEP Digital
================================================================================

Este módulo implementa controle de acesso a arquivos de mídia baseado em pastas.
O nível de acesso é determinado automaticamente pelo DIRETÓRIO onde o arquivo
está salvo.

COMO FUNCIONA:
--------------
1. Quando você define um ImageField/FileField no modelo, o parâmetro 'upload_to'
   determina a pasta onde o arquivo será salvo.
   
2. A pasta determina automaticamente quem pode acessar o arquivo.

3. O frontend receberá URLs no formato /api/v1/media/... que requerem JWT.


NÍVEIS DE ACESSO DISPONÍVEIS:
-----------------------------

┌─────────────────────┬──────────────────────────────────────────────────────┐
│ PASTA               │ QUEM PODE ACESSAR                                    │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ public/             │ QUALQUER PESSOA (mesmo sem login)                    │
│                     │ Uso: logos, imagens institucionais, assets públicos  │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ authenticated/      │ QUALQUER USUÁRIO LOGADO                              │
│                     │ Uso: avisos gerais, materiais para todos os perfis   │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ profile_pics/       │ FUNCIONÁRIOS (Gestão, Secretaria, Professor, Monitor)│
│                     │ Uso: fotos de estudantes, fotos de funcionários      │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ pedagogical/        │ FUNCIONÁRIOS (Gestão, Secretaria, Professor, Monitor)│
│                     │ Uso: materiais didáticos, planos de aula, atividades │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ secretaria/         │ GESTÃO e SECRETARIA apenas                           │
│                     │ Uso: documentos de matrícula, declarações, ofícios   │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ gestao/             │ GESTÃO apenas                                        │
│                     │ Uso: documentos financeiros, contratos, RH           │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ (outros)            │ FUNCIONÁRIOS (padrão de segurança)                   │
│                     │ Qualquer pasta não listada usa este nível            │
└─────────────────────┴──────────────────────────────────────────────────────┘


EXEMPLOS DE USO NOS MODELS:
---------------------------

# Foto de estudante - apenas funcionários podem ver
foto = models.ImageField(upload_to='profile_pics/', blank=True)

# Logo da instituição - público
logo = models.ImageField(upload_to='public/', blank=True)

# Material didático - professores e staff
material = models.FileField(upload_to='pedagogical/', blank=True)

# Contrato de trabalho - apenas gestão
contrato = models.FileField(upload_to='gestao/', blank=True)

# Declaração de matrícula - gestão e secretaria
declaracao = models.FileField(upload_to='secretaria/', blank=True)

# Aviso para todos os usuários logados
imagem_aviso = models.ImageField(upload_to='authenticated/', blank=True)


PARA MAIS INFORMAÇÕES SOBRE PERMISSÕES:
---------------------------------------
Veja: apps/users/permissions.py

================================================================================
"""
import os
import mimetypes
from django.conf import settings
from django.http import FileResponse, Http404
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from apps.users.permissions import IsGestao, IsGestaoOrSecretaria, IsFuncionario


# =============================================================================
# CONFIGURAÇÃO DE NÍVEIS DE ACESSO POR PASTA
# =============================================================================
# 
# Adicione novas pastas aqui conforme necessário.
# A ordem importa: a primeira correspondência será usada.
# Use None como valor para indicar acesso público (AllowAny).
#
MEDIA_ACCESS_LEVELS = {
    # -------------------------------------------------------------------------
    # PÚBLICO - Qualquer pessoa pode acessar (sem login necessário)
    # -------------------------------------------------------------------------
    'public/': None,  # None = AllowAny
    
    # -------------------------------------------------------------------------
    # AUTENTICADO - Qualquer usuário logado (todos os perfis)
    # -------------------------------------------------------------------------
    'authenticated/': IsAuthenticated,
    'avisos/': IsAuthenticated,
    
    # -------------------------------------------------------------------------
    # FUNCIONÁRIOS - Gestão, Secretaria, Professor, Monitor
    # -------------------------------------------------------------------------
    'profile_pics/': IsFuncionario,
    'pedagogical/': IsFuncionario,
    'materiais/': IsFuncionario,
    'atividades/': IsFuncionario,
    
    # -------------------------------------------------------------------------
    # GESTÃO + SECRETARIA - Documentos administrativos
    # -------------------------------------------------------------------------
    'secretaria/': IsGestaoOrSecretaria,
    'matriculas/': IsGestaoOrSecretaria,
    'declaracoes/': IsGestaoOrSecretaria,
    
    # -------------------------------------------------------------------------
    # APENAS GESTÃO - Documentos sensíveis/confidenciais
    # -------------------------------------------------------------------------
    'gestao/': IsGestao,
    'financeiro/': IsGestao,
    'rh/': IsGestao,
    'contratos/': IsGestao,
}

# Nível padrão para pastas não configuradas (segurança por padrão)
DEFAULT_ACCESS_LEVEL = IsFuncionario


# =============================================================================
# VIEW DE MÍDIA PROTEGIDA
# =============================================================================

class ProtectedMediaView(APIView):
    """
    Serve arquivos de mídia com controle de acesso baseado em pastas.
    
    O nível de acesso é determinado automaticamente pelo diretório do arquivo.
    Veja a documentação no início deste módulo para detalhes.
    
    Segurança:
    - Previne ataques de path traversal (../../etc/passwd)
    - Retorna 401 se não autenticado (quando requerido)
    - Retorna 403 se autenticado mas sem permissão
    - Retorna 404 se arquivo não existe
    
    Performance:
    - Cache de 1 hora para imagens (Cache-Control: private)
    - Content-Type detectado automaticamente
    """
    
    def get_permissions(self):
        """
        Determina as permissões baseado no path do arquivo.
        """
        file_path = self.kwargs.get('file_path', '')
        
        # Encontra o nível de acesso baseado no prefixo da pasta
        for prefix, permission_class in MEDIA_ACCESS_LEVELS.items():
            if file_path.startswith(prefix):
                if permission_class is None:
                    return [AllowAny()]
                return [permission_class()]
        
        # Pasta não configurada: usa nível padrão (funcionários)
        return [DEFAULT_ACCESS_LEVEL()]

    def get(self, request, file_path):
        """
        Serve o arquivo após verificação de permissões.
        """
        # Constrói o caminho absoluto do arquivo
        absolute_path = os.path.join(settings.MEDIA_ROOT, file_path)
        
        # =====================================================================
        # SEGURANÇA: Previne Path Traversal Attack
        # =====================================================================
        # Normaliza o path para remover ../ e garante que está dentro de MEDIA_ROOT
        absolute_path = os.path.normpath(absolute_path)
        if not absolute_path.startswith(str(settings.MEDIA_ROOT)):
            raise Http404("Arquivo não encontrado")
        
        # Verifica se o arquivo existe e é um arquivo (não diretório)
        if not os.path.exists(absolute_path) or not os.path.isfile(absolute_path):
            raise Http404("Arquivo não encontrado")
        
        # =====================================================================
        # RESPOSTA: Serve o arquivo
        # =====================================================================
        # Detecta o content type baseado na extensão
        content_type, _ = mimetypes.guess_type(absolute_path)
        if content_type is None:
            content_type = 'application/octet-stream'
        
        # Cria resposta com streaming do arquivo
        response = FileResponse(
            open(absolute_path, 'rb'),
            content_type=content_type
        )
        
        # Headers de cache para imagens (1 hora, privado = não cachear em proxies)
        if content_type.startswith('image/'):
            response['Cache-Control'] = 'private, max-age=3600'
        
        return response
