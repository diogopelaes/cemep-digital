"""
View para Disciplina
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.http import FileResponse
import io
import pandas as pd

from apps.core.models import Disciplina
from apps.core.serializers import DisciplinaSerializer
from apps.users.permissions import GestaoWritePublicReadMixin


class DisciplinaViewSet(GestaoWritePublicReadMixin, viewsets.ModelViewSet):
    """ViewSet de Disciplinas. Leitura: Todos autenticados | Escrita: Gestão"""
    queryset = Disciplina.objects.all()
    serializer_class = DisciplinaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_active']
    search_fields = ['nome', 'sigla']

    def destroy(self, request, *args, **kwargs):
        return Response({'detail': 'A exclusão de registros não é permitida.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    @action(detail=True, methods=['post'], url_path='toggle-ativo')
    @transaction.atomic
    def toggle_active(self, request, pk=None):
        disciplina = self.get_object()
        disciplina.is_active = not disciplina.is_active
        disciplina.save()
        return Response({'status': 'status updated', 'is_active': disciplina.is_active})

    @action(detail=False, methods=['post'], url_path='importar-arquivo')
    @transaction.atomic
    def importar_arquivo(self, request):
        """
        Importa disciplinas via arquivo CSV ou Excel (.xlsx).
        Esperado: arquivo 'file' no request.FILES.
        Colunas esperadas: NOME, SIGLA, AREA_CONHECIMENTO
        """
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'Nenhum arquivo enviado.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            if file.name.endswith('.csv'):
                try:
                    df = pd.read_csv(file, sep=';')
                    if 'NOME' not in [c.upper() for c in df.columns]:
                        file.seek(0)
                        df = pd.read_csv(file, sep=',')
                except:
                    file.seek(0)
                    df = pd.read_csv(file, sep=';')
            elif file.name.endswith('.xlsx') or file.name.endswith('.xls'):
                df = pd.read_excel(file)
            else:
                return Response({'detail': 'Formato inválido. Use .csv ou .xlsx'}, status=status.HTTP_400_BAD_REQUEST)
            
            df.columns = [c.strip().upper() for c in df.columns]
            
            required_fields = ['NOME', 'SIGLA', 'AREA_CONHECIMENTO']
            missing = [f for f in required_fields if f not in df.columns]
            if missing:
                return Response(
                    {'detail': f'Colunas faltando: {", ".join(missing)}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            df = df.fillna('')
            
            created_count = 0
            updated_count = 0
            errors = []
            
            for index, row in df.iterrows():
                try:
                    nome = str(row['NOME']).strip()
                    sigla = str(row['SIGLA']).strip()
                    area = str(row['AREA_CONHECIMENTO']).strip()
                    
                    if not nome or not sigla:
                        continue
                        
                    if area and area not in Disciplina.AreaConhecimento.values:
                        if area in Disciplina.AreaConhecimento.names:
                            area = Disciplina.AreaConhecimento[area]
                        else:
                            errors.append(f"Linha {index + 2}: Área '{area}' inválida.")
                            continue
                            
                    obj, created = Disciplina.objects.update_or_create(
                        nome=nome,
                        defaults={
                            'sigla': sigla,
                            'area_conhecimento': area if area else None,
                            'is_active': True
                        }
                    )
                    
                    if created:
                        created_count += 1
                    else:
                        updated_count += 1
                        
                except Exception as e:
                    errors.append(f"Linha {index + 2}: {str(e)}")
            
            msg = f'Processamento concluído. {created_count} criados, {updated_count} atualizados.'
            if errors:
                msg += f' {len(errors)} erros encontrados.'
                
            return Response({
                'message': msg,
                'errors': errors,
                'created_count': created_count,
                'updated_count': updated_count
            })
            
        except Exception as e:
            return Response({'detail': f'Erro ao processar arquivo: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='download-modelo', permission_classes=[AllowAny])
    def download_modelo(self, request):
        """Gera e retorna o modelo de importação em Excel."""
        buffer = io.BytesIO()
        
        data = {
            'NOME': ['Matemática'],
            'SIGLA': ['MAT'],
            'AREA_CONHECIMENTO': ['MATEMATICA']
        }
        df = pd.DataFrame(data)
        
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Modelo Importação')
            worksheet = writer.sheets['Modelo Importação']
            for idx, col in enumerate(df.columns):
                worksheet.column_dimensions[chr(65 + idx)].width = 25
                
        buffer.seek(0)
        
        return FileResponse(
            buffer, 
            as_attachment=True, 
            filename='modelo_disciplinas.xlsx',
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
