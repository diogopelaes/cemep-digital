from rest_framework import serializers
from apps.core.models import Arquivo

class ArquivoSerializer(serializers.ModelSerializer):
    """
    Serializer para o model Arquivo.
    """
    
    tamanho_formatado = serializers.SerializerMethodField()

    nome_original = serializers.SerializerMethodField()

    class Meta:
        model = Arquivo
        fields = [
            'id', 
            'arquivo', 
            'nome_original', 
            'categoria',
            'tamanho',
            'tamanho_formatado',
            'mime_type',
            'criado_em',
            'criado_por',
        ]
        read_only_fields = [
            'id', 
            'tamanho', 
            'tamanho_formatado', 
            'mime_type', 
            'criado_em', 
            'criado_por',
            'nome_original'
        ]

    def get_nome_original(self, obj):
        return obj.nome_original

    def get_tamanho_formatado(self, obj):
        """Retorna o tamanho do arquivo formatado (KB, MB)."""
        if not obj.tamanho:
            return "0 B"
        
        tamanho = obj.tamanho
        for unidade in ['B', 'KB', 'MB', 'GB']:
            if tamanho < 1024:
                return f"{tamanho:.1f} {unidade}"
            tamanho /= 1024
        return f"{tamanho:.1f} TB"

    def validate_arquivo(self, value):
        """
        Valida extensão e tamanho do arquivo segundo a política.
        """
        import os
        
        # Definição da Política
        POLITICA = {
            'text': {
                'ext': ['pdf', 'docx', 'odt', 'txt', 'md'],
                'max_mb': 10
            },
            'spreadsheet': {
                'ext': ['csv', 'xlsx', 'ods'],
                'max_mb': 5
            },
            'image': {
                'ext': ['jpg', 'jpeg', 'png'],
                'max_mb': 5  # Atualizado para 5MB conforme solicitação
            },
            'presentation': {
                'ext': ['pptx', 'odp'],
                'max_mb': 10
            }
        }
        
        ext = os.path.splitext(value.name)[1].lower().strip('.')
        
        # 1. Valida Extensão (Whitelist)
        allowed_type = None
        for tipo, config in POLITICA.items():
            if ext in config['ext']:
                allowed_type = config
                break
        
        if not allowed_type:
            raise serializers.ValidationError(
                f"Extensão '.{ext}' não permitida. Tipos aceitos: " +
                ", ".join([e for c in POLITICA.values() for e in c['ext']])
            )
            
        # 2. Valida Tamanho
        max_bytes = allowed_type['max_mb'] * 1024 * 1024
        if value.size > max_bytes:
             raise serializers.ValidationError(
                f"Arquivo muito grande para o tipo .{ext}. "
                f"Máximo permitido: {allowed_type['max_mb']}MB."
            )
            
        return value
