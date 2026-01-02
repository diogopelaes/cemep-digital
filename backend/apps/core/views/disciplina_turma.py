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
from apps.users.permissions import GestaoSecretariaMixin, AnoLetivoFilterMixin


class DisciplinaTurmaViewSet(AnoLetivoFilterMixin, GestaoSecretariaMixin, viewsets.ModelViewSet):
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
        Importa disciplinas para múltiplas turmas via CSV/XLSX.
        Colunas: NUMERO_TURMA, LETRA_TURMA, ANO_LETIVO_TURMA, SIGLA_CURSO, SIGLA_DISCIPLINA, AULAS_SEMANAIS (opcional)
        """
        file = request.FILES.get('file')

        if not file:
            return Response({'error': 'Nenhum arquivo enviado'}, status=400)

        try:
            if file.name.endswith('.csv'):
                df = pd.read_csv(io.BytesIO(file.read()))
            else:
                df = pd.read_excel(io.BytesIO(file.read()))
        except Exception as e:
            return Response({'error': f'Erro ao ler arquivo: {str(e)}'}, status=400)

        required_cols = ['NUMERO_TURMA', 'LETRA_TURMA', 'ANO_LETIVO_TURMA', 'SIGLA_CURSO', 'SIGLA_DISCIPLINA']
        missing = [c for c in required_cols if c not in df.columns]
        if missing:
            return Response({'error': f'Colunas obrigatórias faltando: {missing}'}, status=400)

        created_count = 0
        updated_count = 0
        errors = []
        
        from apps.core.models import Curso
        cursos_map = {c.sigla.upper(): c for c in Curso.objects.all()}
        disciplinas_map = {d.sigla.upper(): d for d in Disciplina.objects.all()}
        turmas_cache = {}

        for idx, row in df.iterrows():
            try:
                numero = int(row['NUMERO_TURMA'])
                letra = str(row['LETRA_TURMA']).strip().upper()
                ano_letivo = int(row['ANO_LETIVO_TURMA'])
                sigla_curso = str(row['SIGLA_CURSO']).strip().upper()
                sigla_disciplina = str(row['SIGLA_DISCIPLINA']).strip().upper()
                aulas_semanais = int(row.get('AULAS_SEMANAIS', 0)) if pd.notna(row.get('AULAS_SEMANAIS')) else 0

                turma_key = (numero, letra, ano_letivo, sigla_curso)
                if turma_key not in turmas_cache:
                    curso = cursos_map.get(sigla_curso)
                    if not curso:
                        errors.append(f'Linha {idx + 2}: Curso "{sigla_curso}" não encontrado')
                        continue
                    try:
                        turma = Turma.objects.get(numero=numero, letra=letra, ano_letivo=ano_letivo, curso=curso)
                        turmas_cache[turma_key] = turma
                    except Turma.DoesNotExist:
                        errors.append(f'Linha {idx + 2}: Turma {numero}{letra} do ano {ano_letivo} não encontrada')
                        continue
                else:
                    turma = turmas_cache[turma_key]

                disciplina = disciplinas_map.get(sigla_disciplina)
                if not disciplina:
                    errors.append(f'Linha {idx + 2}: Disciplina "{sigla_disciplina}" não encontrada')
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

    @action(detail=False, methods=['get'], url_path='download-modelo')
    def download_modelo(self, request):
        """Retorna arquivo modelo para importação em massa de disciplinas."""
        df = pd.DataFrame({
            'NUMERO_TURMA': [1, 1],
            'LETRA_TURMA': ['A', 'A'],
            'ANO_LETIVO_TURMA': [2024, 2024],
            'SIGLA_CURSO': ['EM', 'EM'],
            'SIGLA_DISCIPLINA': ['MAT', 'PORT'],
            'AULAS_SEMANAIS': [4, 4]
        })

        output = io.BytesIO()
        df.to_excel(output, index=False)
        output.seek(0)

        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="modelo_importacao_disciplinas_turma.xlsx"'
        return response
