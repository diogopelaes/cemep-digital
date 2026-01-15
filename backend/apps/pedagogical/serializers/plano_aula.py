from rest_framework import serializers
from apps.pedagogical.models import PlanoAula
from apps.core.serializers.habilidade import HabilidadeSerializer
from apps.core.serializers.turma import TurmaSerializer

from apps.core.serializers.disciplina import DisciplinaSerializer

class TurmaResumoSerializer(serializers.ModelSerializer):
    """Serializer ultra-leve para listagens."""
    nome = serializers.ReadOnlyField()
    sigla = serializers.ReadOnlyField()
    class Meta:
        model = TurmaSerializer.Meta.model # Pega o model de Turma
        fields = ['id', 'nome', 'sigla', 'numero', 'letra']

class HabilidadeResumoSerializer(serializers.ModelSerializer):
    """Serializer ultra-leve para listagens."""
    class Meta:
        model = HabilidadeSerializer.Meta.model
        fields = ['id', 'codigo', 'descricao']

class PlanoAulaSerializer(serializers.ModelSerializer):
    habilidades_detalhes = HabilidadeResumoSerializer(source='habilidades', many=True, read_only=True)
    turmas_detalhes = TurmaResumoSerializer(source='turmas', many=True, read_only=True)
    disciplina_detalhes = DisciplinaSerializer(source='disciplina', read_only=True)
    
    class Meta:
        model = PlanoAula
        fields = [
            'id', 'titulo', 'professor', 'disciplina', 'disciplina_detalhes',
            'turmas', 'turmas_detalhes',
            'data_inicio', 'data_fim', 'conteudo', 
            'habilidades', 'habilidades_detalhes',
            'ano_letivo', 'bimestre'
        ]
        read_only_fields = ['professor', 'bimestre']

    def create(self, validated_data):
        # Define o professor automaticamente como o usuário logado
        request = self.context.get('request')
        if request:
            if hasattr(request.user, 'funcionario'):
                validated_data['professor'] = request.user.funcionario
            
            # Define o ano letivo selecionado automaticamente
            ano_letivo_obj = None
            try:
                if hasattr(request.user, 'ano_letivo_selecionado'):
                    ano_letivo_obj = request.user.ano_letivo_selecionado.ano_letivo
            except Exception:
                pass
            
            # Se não tiver seleção, pega o ano ativo
            if not ano_letivo_obj:
                from apps.core.models import AnoLetivo
                ano_letivo_obj = AnoLetivo.objects.filter(is_active=True).first()
            
            if ano_letivo_obj:
                validated_data['ano_letivo'] = ano_letivo_obj

        return super().create(validated_data)

    def validate(self, data):
        """
        Valida se pelo menos um dos campos foi preenchido:
        - Conteúdo
        - Habilidades
        """
        conteudo = data.get('conteudo')
        habilidades = data.get('habilidades')
        
        # Em updates, precisamos checar a instância existente se os dados não vieram
        if self.instance:
            if conteudo is None:
                conteudo = self.instance.conteudo
            # Para M2M em updates, o comportamento do serializer é substituir a lista.
            # Se 'habilidades' não estiver em data, ele não vai mexer? 
            # Depende se é PATCH ou PUT. Assumindo comportamento padrão DRF.
            # Se a chave 'habilidades' não vier no partial_update, não validamos M2M aqui facilmente sem acessar self.instance.habilidades.all(),
            # mas acessar o banco na validação é custoso/complexo antes de salvar.
            # Simplificação: Se enviou, valida.
            pass

        # Validação principal
        if not conteudo and not habilidades:
             raise serializers.ValidationError(
                "É obrigatório informar o Conteúdo OU selecionar pelo menos uma Habilidade."
            )
        
        return data
