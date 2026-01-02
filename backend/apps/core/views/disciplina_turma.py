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

from apps.core.models import DisciplinaTurma, Turma, Disciplina, AnoLetivo
from apps.core.serializers import DisciplinaTurmaSerializer
from apps.users.permissions import GestaoSecretariaMixin


class DisciplinaTurmaViewSet(GestaoSecretariaMixin, viewsets.ModelViewSet):
    """
    ViewSet para DisciplinaTurma.
    Leitura: Gestão / Secretaria | Escrita: Gestão / Secretaria
    """
    queryset = DisciplinaTurma.objects.filter(
        turma__ano_letivo__in=AnoLetivo.objects.filter(is_active=True).values('ano')
    ).select_related('disciplina', 'turma')
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

    def _process_import_file(self, file, turmas, errors_list):
        """
        Processa o arquivo e associa disciplinas às turmas informadas.
        Retorna (created_count, updated_count)
        """
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
            raise ValueError('Coluna SIGLA_DISCIPLINA é obrigatória.')

        disciplinas_map = {d.sigla: d for d in Disciplina.objects.all()}
        
        total_created = 0
        total_updated = 0

        # Validação prévia das linhas para não falhar no meio
        rows_data = []
        for idx, row in df.iterrows():
            line = idx + 2
            sigla = str(row['SIGLA_DISCIPLINA']).strip()
            aulas_str = str(row.get('AULAS_SEMANAIS', '')).strip()
            aulas = int(aulas_str) if aulas_str.isdigit() else 4

            if not sigla:
                errors_list.append(f"Linha {line}: Sigla da disciplina é obrigatória.")
                continue

            disciplina = disciplinas_map.get(sigla)
            if not disciplina:
                errors_list.append(f"Linha {line}: Disciplina com sigla '{sigla}' não encontrada.")
                continue
            
            rows_data.append({
                'disciplina': disciplina,
                'aulas': aulas
            })

        if errors_list:
            return 0, 0

        # Processamento
        for turma in turmas:
            for item in rows_data:
                try:
                    obj, created = DisciplinaTurma.objects.update_or_create(
                        turma=turma,
                        disciplina=item['disciplina'],
                        defaults={'aulas_semanais': item['aulas']}
                    )
                    if created:
                        total_created += 1
                    else:
                        total_updated += 1
                except Exception as e:
                    errors_list.append(f"Erro na Turma {turma}: {str(e)}")
        
        return total_created, total_updated

    @action(detail=False, methods=['post'], url_path='importar-arquivo')
    @transaction.atomic
    def importar_arquivo(self, request):
        """
        Importa disciplinas para uma turma específica via CSV/XLSX.
        Esperado: arquivo 'file' e campo 'turma_id' no POST.
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
            errors = []
            created, updated = self._process_import_file(file, [turma], errors)

            msg = f'Processamento concluído. {created} criados, {updated} atualizados.'
            if errors:
                msg = 'Erros encontrados na importação.'

            return Response({
                'message': msg,
                'errors': errors,
                'created_count': created,
                'updated_count': updated
            })

        except Exception as e:
            return Response({'detail': f'Erro: {str(e)}'}, status=400)

    @action(detail=False, methods=['post'], url_path='importar-em-massa')
    @transaction.atomic
    def importar_em_massa(self, request):
        """
        Importa disciplinas para VÁRIAS turmas via CSV/XLSX.
        Esperado: arquivo 'file' e campo 'turmas_ids' (lista de IDs separada por vírgula) no POST.
        """
        file = request.FILES.get('file')
        turmas_ids_raw = request.data.get('turmas_ids')

        if not file:
            return Response({'detail': 'Arquivo não enviado.'}, status=400)
        if not turmas_ids_raw:
            return Response({'detail': 'IDs das turmas não informados.'}, status=400)
        
        # Parse IDs
        try:
            if isinstance(turmas_ids_raw, list):
                ids = turmas_ids_raw
            else:
                ids = [x.strip() for x in turmas_ids_raw.split(',') if x.strip()]
            
            turmas = list(Turma.objects.filter(id__in=ids))
        except Exception:
            return Response({'detail': 'Formato de IDs de turma inválido.'}, status=400)

        if not turmas:
            return Response({'detail': 'Nenhuma turma válida encontrada.'}, status=400)

        try:
            errors = []
            # Como o arquivo é lido uma vez, precisamos garantir que o ponteiro esteja no início se fosse lido
            # mas o método _process_import_file já trata a leitura.
            # O ideal é ler em memória para não ter problema de seek em request.FILES se for iterado
            # Porém o pandas read já consome. Se precisasse re-ler, copiaria.
            # Aqui passamos a lista de turmas para o método processar de uma vez.
            
            created, updated = self._process_import_file(file, turmas, errors)

            msg = f'Processamento em massa concluído para {len(turmas)} turmas. {created} vínculos criados, {updated} atualizados.'
            if errors:
                msg = 'Erros encontrados na importação em massa.'

            return Response({
                'message': msg,
                'errors': errors,
                'created_count': created,
                'updated_count': updated
            })

        except Exception as e:
            return Response({'detail': f'Erro: {str(e)}'}, status=400)

    @action(detail=False, methods=['get'], url_path='download-modelo')
    def download_modelo(self, request):
        buffer = io.BytesIO()
        data = {
            'SIGLA_DISCIPLINA': ['MAT', 'POR', 'FIS'],
            'AULAS_SEMANAIS': ['4', '4', '2']
        }
        df = pd.DataFrame(data)
        
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            df.to_excel(writer, index=False)
            ws = writer.sheets['Sheet1']
            ws.column_dimensions['A'].width = 20
            ws.column_dimensions['B'].width = 18
        
        buffer.seek(0)
        response = HttpResponse(
            buffer.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename=modelo_disciplinas_turma.xlsx'
        return response
