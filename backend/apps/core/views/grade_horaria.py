from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction, models
from django.shortcuts import get_object_or_404
from django.utils import timezone

from apps.core.models import (
    GradeHoraria, GradeHorariaValidade, Turma, 
    HorarioAula, Disciplina, DisciplinaTurma, Curso
)
from apps.core.serializers.grade_horaria import (
    GradeHorariaSerializer, GradeHorariaEdicaoSerializer,
    TurmaSimplificadaSerializer, DisciplinaSimplificadaSerializer,
    HorarioAulaSerializer, GradeHorariaValidadeSerializer
)
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from core_project.permissions import Policy, GESTAO, SECRETARIA, FUNCIONARIO


class GradeHorariaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciamento da Grade Horária.
    Focado nas operações de edição administrativa (Gestão/Secretaria).
    """
    queryset = GradeHoraria.objects.all()
    serializer_class = GradeHorariaSerializer
    
    permission_classes = [Policy(
        create=[GESTAO, SECRETARIA],
        read=FUNCIONARIO,
        update=[GESTAO, SECRETARIA],
        delete=[GESTAO, SECRETARIA],
        custom={
            'dados_edicao': [GESTAO, SECRETARIA],
            'salvar_lote': [GESTAO, SECRETARIA],
        }
    )]




    @action(detail=False, methods=['get'])
    def dados_edicao(self, request):
        """
        Retorna todos os dados necessários para a tela de edição da grade.
        Query params:
            - turma_id: ID de uma das turmas do grupo (ex: 1º Ano A Info)
            - validade_id: (Opcional) ID da validade para carregar grades existentes
        """
        turma_id = request.query_params.get('turma_id')
        validade_id = request.query_params.get('validade_id')

        if not turma_id:
            return Response({'error': 'turma_id é obrigatório'}, status=400)

        turma_ref = get_object_or_404(Turma, id=turma_id)

        # 1. Identificar todas as turmas irmãs (mesmo ano, numero, letra)
        turmas_irmas = Turma.objects.filter(
            ano_letivo=turma_ref.ano_letivo,
            numero=turma_ref.numero,
            letra=turma_ref.letra,
            is_active=True
        ).select_related('curso')

        # 2. Buscar disciplinas vinculadas a QUALQUER uma dessas turmas
        # Precisamos saber qual turma fornece qual disciplina para salvar o curso correto depois
        disciplinas_ids = DisciplinaTurma.objects.filter(
            turma__in=turmas_irmas
        ).values_list('disciplina_id', flat=True).distinct()

        disciplinas = Disciplina.objects.filter(id__in=disciplinas_ids).order_by('nome')

        # Enriquecer disciplinas com sigla do curso (se for específica de um curso)
        # Se a disciplina existe em todas as turmas irmãs, é "Comum". Se só em uma, é "Especifica".
        disciplinas_data = []
        for d in disciplinas:
            turmas_vinculadas = [
                t for t in turmas_irmas 
                if t.disciplinas_vinculadas.filter(disciplina=d).exists()
            ]
            
            # Se vinculado a todas, curso = None/Comum. Se vinculado a algumas, pega a sigla da primeira.
            # No frontend, exibir a sigla ajuda a distinguir "Matemática (EnsMed)" de "Matemática (Tec)" se houver.
            curso_sigla = None
            if len(turmas_vinculadas) < len(turmas_irmas) and len(turmas_vinculadas) > 0:
                 curso_sigla = turmas_vinculadas[0].curso.sigla
            
            d_data = DisciplinaSimplificadaSerializer(d).data
            d_data['curso_sigla'] = curso_sigla
            disciplinas_data.append(d_data)

        # 3. Horários de aula do ano letivo
        horarios = HorarioAula.objects.filter(
            ano_letivo__ano=turma_ref.ano_letivo
        ).order_by('dia_semana', 'numero')

        # 4. Validades existentes para esse grupo
        validades = GradeHorariaValidade.objects.filter(
            ano_letivo__ano=turma_ref.ano_letivo,
            turma_numero=turma_ref.numero,
            turma_letra=turma_ref.letra
        ).order_by('-data_inicio')

        # 5. Se validade_id informada, carregar grades dela
        grades_data = []
        validade_selecionada = None
        if validade_id:
            try:
                validade = validades.get(id=validade_id)
                itens = GradeHoraria.objects.filter(validade=validade)
                grades_data = GradeHorariaSerializer(itens, many=True).data
                validade_selecionada = GradeHorariaValidadeSerializer(validade).data
            except GradeHorariaValidade.DoesNotExist:
                pass
        
        # Se não informou validade, mas existem validades, tenta pegar a vigente
        elif validades.exists():
            hoje = timezone.now().date()
            vigente = validades.filter(data_inicio__lte=hoje, data_fim__gte=hoje).first()
            # Se não tem vigente, pega a última (mais recente)
            if not vigente:
                vigente = validades.first()
            
            if vigente:
                validade = vigente
                itens = GradeHoraria.objects.filter(validade=vigente)
                grades_data = GradeHorariaSerializer(itens, many=True).data
                validade_selecionada = GradeHorariaValidadeSerializer(vigente).data

        return Response({
            'ano_letivo': turma_ref.ano_letivo,
            'turmas': TurmaSimplificadaSerializer(turmas_irmas, many=True).data,
            'disciplinas': disciplinas_data,
            'horarios_aula': HorarioAulaSerializer(horarios, many=True).data,
            'validades': GradeHorariaValidadeSerializer(validades, many=True).data,
            'validade_selecionada': validade_selecionada,
            'grades': grades_data
        })

    @action(detail=False, methods=['post'])
    def salvar_lote(self, request):
        """
        Salva uma grade horária completa (Validade + Itens).
        """
        serializer = GradeHorariaEdicaoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dados = serializer.validated_data

        turma_ref = get_object_or_404(Turma, id=dados['turma_id'])
        ano_letivo_obj = turma_ref.get_ano_letivo_object

        with transaction.atomic():
            # 1. Gerenciar GradeHorariaValidade
            try:
                if dados.get('validade_id'):
                    validade = get_object_or_404(GradeHorariaValidade, id=dados['validade_id'])
                    validade.data_inicio = dados['data_inicio']
                    validade.data_fim = dados['data_fim']
                    # Validar conflitos (o clean() do model já faz isso, mas precisamos excluir o próprio ID)
                    # O save() chamará clean()
                    validade.save()
                else:
                    validade = GradeHorariaValidade(
                        ano_letivo=ano_letivo_obj,
                        turma_numero=turma_ref.numero,
                        turma_letra=turma_ref.letra,
                        data_inicio=dados['data_inicio'],
                        data_fim=dados['data_fim']
                    )
                    validade.save() # Vai validar conflitos de datas no clean()
            except ValidationError as e:
                # Trata erro de validação do Django
                if hasattr(e, 'message_dict') and e.message_dict:
                    # Se for dict, pega primeira msg geral ou de campo
                    raise serializers.ValidationError({'error': str(e.message_dict)})
                if hasattr(e, 'messages'):
                     raise serializers.ValidationError({'error': e.messages[0]})
                if hasattr(e, 'message'):
                    raise serializers.ValidationError({'error': e.message})
                raise serializers.ValidationError({'error': str(e)})
            except Exception as e:
                # Captura outros erros inesperados
                # Logar se necessário
                raise serializers.ValidationError({'error': f'Erro ao salvar grade: {str(e)}'})

            # 2. Limpar itens antigos dessa validade
            validade.itens_grade.all().delete()

            # 3. Criar novos itens
            novos_itens = []
            
            # Cache de Turmas por Disciplina para definir o Curso do item
            # (Necessário porque item de grade tem FK para Curso)
            # Estrattégia: Se a disciplina é da Turma A, usa curso da Turma A.
            # Se for comum (A e B), usa curso da Turma A (arbitrário, mas consistente).
            turmas_irmas = Turma.objects.filter(
                ano_letivo=turma_ref.ano_letivo,
                numero=turma_ref.numero,
                letra=turma_ref.letra
            ).select_related('curso').prefetch_related('disciplinas_vinculadas')

            disciplina_curso_map = {}
            for t in turmas_irmas:
                # IDs das disciplinas dessa turma
                d_ids = t.disciplinas_vinculadas.values_list('disciplina_id', flat=True)
                for d_id in d_ids:
                    if d_id not in disciplina_curso_map:
                        disciplina_curso_map[d_id] = t.curso
            
            for item in dados['grades']:
                horario_id = item['horario_aula']
                disciplina_id = item['disciplina']

                # Curso
                curso = disciplina_curso_map.get(disciplina_id)
                if not curso:
                    # Disciplina não está vinculada a nenhuma das turmas irmãs?
                    # Pode acontecer se removeram o vínculo mas o frontend mandou.
                    # Fallback: curso da turma de referência ou erro.
                    curso = turma_ref.curso

                novos_itens.append(
                    GradeHoraria(
                        validade=validade,
                        horario_aula_id=horario_id,
                        disciplina_id=disciplina_id,
                        curso=curso
                    )
                )

            GradeHoraria.objects.bulk_create(novos_itens)

            # 4. Trigger de Cache (O save() da validade já trigga rebuild turmas, 
            # mas o bulk_create de itens NÃO trigga signals de itens).
            # Precisamos forçar o rebuild das turmas envolvidas e professores citados.
            validade._rebuild_turmas()
            
            # Rebuild professores
            # Pegar todos os professores das disciplinas usadas
            # (Otimização: fazer isso via tarefa assíncrona se fosse muito pesado, mas aqui é ok)
            professores_ids = set()
            disciplinas_ids = [item.disciplina_id for item in novos_itens]
            
            from django.apps import apps
            pdts = apps.get_model('core', 'ProfessorDisciplinaTurma').objects.filter(
                disciplina_turma__turma__in=turmas_irmas,
                disciplina_turma__disciplina_id__in=disciplinas_ids
            ).values_list('professor_id', flat=True)
            
            for pid in pdts:
                # Importar model aqui para evitar circular dependency no topo se houver
                Funcionario = apps.get_model('core', 'Funcionario')
                Funcionario.objects.get(id=pid).build_grade_horaria(save=True)

        return Response({
            'message': 'Grade salva com sucesso',
            'validade_id': validade.id
        }, status=status.HTTP_201_CREATED)
