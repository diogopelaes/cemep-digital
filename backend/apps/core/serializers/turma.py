"""
Serializer para Turma
"""
from rest_framework import serializers
from apps.core.models import Funcionario, Turma, Curso
from .funcionario import FuncionarioSerializer
from .curso import CursoSerializer


class TurmaSerializer(serializers.ModelSerializer):
    curso = CursoSerializer(read_only=True)
    curso_id = serializers.PrimaryKeyRelatedField(
        queryset=Curso.objects.all(),
        source='curso',
        write_only=True
    )
    nome_completo = serializers.CharField(read_only=True)
    disciplinas_count = serializers.SerializerMethodField()
    estudantes_count = serializers.SerializerMethodField()
    professores_representantes = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Funcionario.objects.all(),
        required=False
    )
    professores_representantes_details = FuncionarioSerializer(
        source='professores_representantes',
        many=True,
        read_only=True
    )
    
    class Meta:
        model = Turma
        fields = [
            'id', 'numero', 'letra', 'ano_letivo', 'nomenclatura',
            'curso', 'curso_id', 'nome_completo', 'disciplinas_count', 'estudantes_count',
            'professores_representantes', 'professores_representantes_details', 'is_active'
        ]
    
    def get_disciplinas_count(self, obj):
        return obj.disciplinas_vinculadas.count()
    
    def get_estudantes_count(self, obj):
        """Conta apenas estudantes com matrícula status CURSANDO."""
        return obj.matriculas.filter(status='CURSANDO').count()
