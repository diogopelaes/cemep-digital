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
from apps.users.permissions import GestaoSecretariaMixin


class DisciplinaTurmaViewSet(GestaoSecretariaMixin, viewsets.ModelViewSet):
    """ViewSet de Disciplinas por Turma. Leitura: Gestão/Secretaria | Escrita: Gestão/Secretaria"""
    queryset = DisciplinaTurma.objects.select_related('disciplina', 'turma').all()
    serializer_class = DisciplinaTurmaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['disciplina', 'turma', 'turma__ano_letivo']

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
            return Response({'detail': 'Arquivo não enviado.'}, status=400)
        if not turma_id:
            return Response({'detail': 'ID da turma não informado.'}, status=400)
        
        try:
            turma = Turma.objects.get(pk=turma_id)
        except Turma.DoesNotExist:
            return Response({'detail': 'Turma não encontrada.'}, status=404)

        try:
            if file.name.endswith('.csv'):
                try:
                    df = pd.read_csv(file, sep=';', dtype=str)
                except:
                    file.seek(0)
                    df = pd.read_csv(file, sep=',', dtype=str)
            else:
                df = pd.read_excel(file, dtype=str)
            
            df.columns = [c.strip().upper() for c in df.columns]
            df = df.fillna('')
            
            if 'SIGLA_DISCIPLINA' not in df.columns:
                 return Response({'detail': 'Coluna SIGLA_DISCIPLINA é obrigatória.'}, status=400)

            created_count = 0
            updated_count = 0
            errors = []
            
            disciplinas_map = {d.sigla: d for d in Disciplina.objects.all()}

            for idx, row in df.iterrows():
                try:
                    line = idx + 2
                    sigla = str(row['SIGLA_DISCIPLINA']).strip()
                    aulas_str = str(row.get('AULAS_SEMANAIS', '')).strip()
                    aulas = int(aulas_str) if aulas_str.isdigit() else 4

                    if not sigla:
                        errors.append(f"Linha {line}: Sigla da disciplina é obrigatória.")
                        continue

                    disciplina = disciplinas_map.get(sigla)
                    if not disciplina:
                        errors.append(f"Linha {line}: Disciplina com sigla '{sigla}' não encontrada.")
                        continue

                    obj, created = DisciplinaTurma.objects.update_or_create(
                        turma=turma,
                        disciplina=disciplina,
                        defaults={'aulas_semanais': aulas}
                    )

                    if created:
                        created_count += 1
                    else:
                        updated_count += 1

                except Exception as e:
                    errors.append(f"Linha {line}: {str(e)}")

            msg = f'Processamento concluído. {created_count} criados, {updated_count} atualizados.'
            if errors:
                msg += f' {len(errors)} erros.'

            return Response({
                'message': msg,
                'errors': errors,
                'created_count': created_count,
                'updated_count': updated_count
            })

        except Exception as e:
            return Response({'detail': f'Erro: {str(e)}'}, status=400)

    @action(detail=False, methods=['get'], url_path='download-modelo')
    def download_modelo(self, request):
        buffer = io.BytesIO()
        df = pd.DataFrame(columns=['SIGLA_DISCIPLINA', 'AULAS_SEMANAIS'])
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            df.to_excel(writer, index=False)
        
        buffer.seek(0)
        response = HttpResponse(
            buffer.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename=modelo_disciplinas_turma.xlsx'
        return response
