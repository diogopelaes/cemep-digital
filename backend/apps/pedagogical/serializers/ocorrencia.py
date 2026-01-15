"""
Serializers para Ocorrências Pedagógicas
"""
from rest_framework import serializers
from apps.pedagogical.models import (
    DescritorOcorrenciaPedagogica, OcorrenciaPedagogica,
    OcorrenciaResponsavelCiente
)
from apps.academic.models import Estudante
from apps.core.models import Funcionario
from apps.core.serializers import FuncionarioSerializer
from apps.academic.serializers.estudante import EstudanteSerializer

class EstudanteResumoSerializer(serializers.ModelSerializer):
    """Serializer leve para estudantes em listagens de ocorrências."""
    nome_exibicao = serializers.SerializerMethodField()
    foto = serializers.SerializerMethodField()
    
    class Meta:
        model = Estudante
        fields = ['id', 'nome_exibicao', 'foto']

    def get_nome_exibicao(self, obj):
        return obj.nome_social or obj.usuario.get_full_name()

    def get_foto(self, obj):
        if obj.usuario and obj.usuario.foto:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.usuario.foto.url)
            return obj.usuario.foto.url
        return None

class AutorResumoSerializer(serializers.ModelSerializer):
    """Serializer leve para o autor da ocorrência."""
    nome = serializers.ReadOnlyField(source='usuario.get_full_name')
    class Meta:
        model = Funcionario
        fields = ['id', 'nome']

class DescritorOcorrenciaPedagogicaSerializer(serializers.ModelSerializer):
    gestor = FuncionarioSerializer(read_only=True)
    
    class Meta:
        model = DescritorOcorrenciaPedagogica
        fields = ['id', 'gestor', 'texto', 'ativo']


class OcorrenciaPedagogicaSerializer(serializers.ModelSerializer):
    estudante = EstudanteResumoSerializer(read_only=True)
    autor = AutorResumoSerializer(read_only=True)
    tipo = DescritorOcorrenciaPedagogicaSerializer(read_only=True)
    
    estudante_id = serializers.PrimaryKeyRelatedField(
        queryset=Estudante.objects.all(),
        source='estudante',
        write_only=True
    )
    tipo_id = serializers.PrimaryKeyRelatedField(
        queryset=DescritorOcorrenciaPedagogica.objects.all(),
        source='tipo',
        write_only=True
    )
    
    class Meta:
        model = OcorrenciaPedagogica
        fields = [
            'id', 'estudante', 'estudante_id', 'autor',
            'tipo', 'tipo_id', 'data'
        ]
        read_only_fields = ['data', 'autor']


class OcorrenciaResponsavelCienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = OcorrenciaResponsavelCiente
        fields = ['id', 'responsavel', 'ocorrencia', 'ciente', 'data_ciencia']
        read_only_fields = ['data_ciencia']
