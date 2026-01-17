"""
View para Disciplina-Turma
"""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.http import HttpResponse
import io
import pandas as pd

from apps.core.models import DisciplinaTurma, Turma, Disciplina
from apps.core.serializers import DisciplinaTurmaSerializer
from apps.core.mixins import AnoLetivoFilterMixin
from core_project.permissions import Policy, GESTAO, SECRETARIA



class DisciplinaTurmaViewSet(AnoLetivoFilterMixin, viewsets.ModelViewSet):
    """
    ViewSet para DisciplinaTurma.
    Leitura: Gestão / Secretaria | Escrita: Gestão / Secretaria
    
    Filtrado pelo ano letivo selecionado do usuário.
    """
    queryset = DisciplinaTurma.objects.select_related('disciplina', 'turma')
    serializer_class = DisciplinaTurmaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['disciplina', 'turma', 'turma__ano_letivo']
    
    ano_letivo_field = 'turma__ano_letivo'  # Campo de filtro do AnoLetivoFilterMixin
    
    permission_classes = [Policy(
        create=[GESTAO, SECRETARIA],
        read=[GESTAO, SECRETARIA],
        update=[GESTAO, SECRETARIA],
        delete=[GESTAO, SECRETARIA],
        custom={
            'importar_arquivo': [GESTAO, SECRETARIA],
            'importar_em_massa': [GESTAO, SECRETARIA],
            'download_modelo': [GESTAO, SECRETARIA],
        }
    )]


    @action(detail=False, methods=['post'], url_path='importar-arquivo')
    @transaction.atomic
    def importar_arquivo(self, request):
        """
        Importa disciplinas para uma turma específica via CSV/XLSX.
        Esperado: arquivo 'file' e campo 'turma_id' no POST.
        Colunas: SIGLA_DISCIPLINA, AULAS_SEMANAIS (opcional)
        """
        file = request.FILES.get('file')
        turma_id = request.data.get('turma_id')

        if not file:
            return Response({'error': 'Nenhum arquivo enviado'}, status=400)
        if not turma_id:
            return Response({'error': 'ID da turma não informado (turma_id)'}, status=400)

        try:
            turma = Turma.objects.get(pk=turma_id)
        except Turma.DoesNotExist:
            return Response({'error': 'Turma não encontrada'}, status=404)

        try:
            if file.name.endswith('.csv'):
                df = pd.read_csv(io.BytesIO(file.read()))
            else:
                df = pd.read_excel(io.BytesIO(file.read()))
        except Exception as e:
            return Response({'error': f'Erro ao ler arquivo: {str(e)}'}, status=400)

        if 'SIGLA_DISCIPLINA' not in df.columns:
            return Response({'error': 'Coluna obrigatória "SIGLA_DISCIPLINA" não encontrada'}, status=400)

        created_count = 0
        updated_count = 0
        errors = []
        disciplinas_map = {d.sigla.upper(): d for d in Disciplina.objects.all()}

        for idx, row in df.iterrows():
            try:
                sigla = str(row['SIGLA_DISCIPLINA']).strip().upper()
                aulas_semanais = int(row.get('AULAS_SEMANAIS', 0)) if pd.notna(row.get('AULAS_SEMANAIS')) else 0

                disciplina = disciplinas_map.get(sigla)
                if not disciplina:
                    errors.append(f'Linha {idx + 2}: Disciplina "{sigla}" não encontrada')
                    continue

                dt, created = DisciplinaTurma.objects.update_or_create(
                    disciplina=disciplina,
                    turma=turma,
                    defaults={'aulas_semanais': aulas_semanais}
                )

                if created:
                    created_count += 1
                else:
                    updated_count += 1

            except Exception as e:
                errors.append(f'Linha {idx + 2}: {str(e)}')

        return Response({
            'criados': created_count,
            'atualizados': updated_count,
            'total_processados': created_count + updated_count,
            'erros': errors[:20],
            'total_erros': len(errors)
        })

    @action(detail=False, methods=['post'], url_path='importar-em-massa')
    @transaction.atomic
    def importar_em_massa(self, request):
        """
        Importa disciplinas para múltiplas turmas selecionadas via CSV/XLSX.
        Espera: file (arquivo) e turmas_ids (lista de IDs separada por vírgula).
        Colunas do arquivo: SIGLA_DISCIPLINA, AULAS_SEMANAIS (opcional)
        """
        file = request.FILES.get('file')
        turmas_ids_str = request.data.get('turmas_ids', '')

        if not file:
            return Response({'error': 'Nenhum arquivo enviado'}, status=400)
        
        if not turmas_ids_str:
            return Response({'error': 'Nenhuma turma selecionada (turmas_ids)'}, status=400)

        # Processa IDs das turmas
        try:
            turmas_ids = [id.strip() for id in turmas_ids_str.split(',') if id.strip()]
            turmas = list(Turma.objects.filter(id__in=turmas_ids))
        except Exception:
            return Response({'error': 'Formato de IDs de turmas inválido.'}, status=400)

        if not turmas:
            return Response({'error': 'Nenhuma turma válida encontrada.'}, status=400)

        # Lê o arquivo
        try:
            if file.name.endswith('.csv'):
                df = pd.read_csv(io.BytesIO(file.read()))
            else:
                df = pd.read_excel(io.BytesIO(file.read()))
        except Exception as e:
            return Response({'error': f'Erro ao ler arquivo: {str(e)}'}, status=400)

        if 'SIGLA_DISCIPLINA' not in df.columns:
            return Response({'error': 'Coluna obrigatória "SIGLA_DISCIPLINA" não encontrada'}, status=400)

        created_count = 0
        updated_count = 0
        errors = []
        
        disciplinas_map = {d.sigla.upper(): d for d in Disciplina.objects.all()}

        # Itera sobre cada turma selecionada
        for turma in turmas:
            # Itera sobre cada linha do arquivo (disciplinas)
            for idx, row in df.iterrows():
                try:
                    sigla = str(row['SIGLA_DISCIPLINA']).strip().upper()
                    aulas_semanais = int(row.get('AULAS_SEMANAIS', 4)) if pd.notna(row.get('AULAS_SEMANAIS')) else 4

                    disciplina = disciplinas_map.get(sigla)
                    if not disciplina:
                        # Loga erro apenas uma vez por disciplina, se desejar, ou ignora para não poluir
                        # Aqui vamos logar erro referenciando a linha
                        errors.append(f'Linha {idx + 2}: Disciplina "{sigla}" não encontrada')
                        continue

                    dt, created = DisciplinaTurma.objects.update_or_create(
                        disciplina=disciplina,
                        turma=turma,
                        defaults={'aulas_semanais': aulas_semanais}
                    )

                    if created:
                        created_count += 1
                    else:
                        updated_count += 1

                except Exception as e:
                    errors.append(f'Turma {turma.nome} - Linha {idx + 2}: {str(e)}')

        # Dedup errors (optional but good UI practice)
        errors = list(dict.fromkeys(errors))

        return Response({
            'created_count': created_count,
            'updated_count': updated_count,
            'total_processados': created_count + updated_count,
            'errors': errors[:20],
             'message': f'Processamento concluído. {created_count} vinculos criados, {updated_count} atualizados em {len(turmas)} turmas.'
        })

    @action(detail=False, methods=['get'], url_path='download-modelo')
    def download_modelo(self, request):
        """Retorna arquivo modelo para importação em massa de disciplinas."""
        df = pd.DataFrame({
            'SIGLA_DISCIPLINA': ['MAT', 'PORT', 'HIST'],
            'AULAS_SEMANAIS': [4, 4, 2]
        })

        output = io.BytesIO()
        df.to_excel(output, index=False)
        output.seek(0)

        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="modelo_disciplinas_massa.xlsx"'
        return response
