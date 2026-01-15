from rest_framework import serializers
from apps.core.models import Turma, ProfessorDisciplinaTurma
from apps.core.serializers.curso import CursoSerializer

class MinhasTurmasSerializer(serializers.ModelSerializer):
    """
    Serializer de alta performance para a listagem de turmas do professor.
    Utiliza dados pré-calculados na View (Annotation e Prefetch).
    """
    curso = CursoSerializer(read_only=True)
    nome = serializers.ReadOnlyField()
    sigla = serializers.ReadOnlyField()
    # Pega o valor contado diretamente no banco via annotation
    estudantes_count = serializers.IntegerField(source='total_estudantes', read_only=True)
    disciplinas_lecionadas = serializers.SerializerMethodField()

    class Meta:
        model = Turma
        fields = [
            'id', 'numero', 'letra', 'ano_letivo', 'curso', 
            'nome', 'sigla', 'estudantes_count', 'disciplinas_lecionadas'
        ]

    def get_disciplinas_lecionadas(self, obj):
        # Utiliza o cache do Prefetch (Zero queries extras)
        dts = getattr(obj, 'disciplinas_docente', [])
        
        return [
            {'sigla': dt.disciplina.sigla, 'nome': dt.disciplina.nome}
            for dt in dts
        ]

class MinhaTurmaDetalhesSerializer(MinhasTurmasSerializer):
    """
    Serializer expandido para detalhes da turma (se necessário no futuro).
    """
    class Meta(MinhasTurmasSerializer.Meta):
        fields = MinhasTurmasSerializer.Meta.fields + ['nomenclatura', 'is_active']
