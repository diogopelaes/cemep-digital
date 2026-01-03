"""
View para Curso
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

from apps.core.models import Curso
from apps.core.serializers import CursoSerializer
from apps.users.permissions import GestaoSecretariaWritePublicReadMixin


class CursoViewSet(GestaoSecretariaWritePublicReadMixin, viewsets.ModelViewSet):
    """
    ViewSet para Curso.
    Leitura: Gestão / Secretaria | Escrita: Gestão / Secretaria
    """
    queryset = Curso.objects.all()
    serializer_class = CursoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_active']
    search_fields = ['nome', 'sigla']

    def destroy(self, request, *args, **kwargs):
        return Response({'detail': 'A exclusão de registros não é permitida.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    @action(detail=True, methods=['post'], url_path='toggle-ativo')
    @transaction.atomic
    def toggle_active(self, request, pk=None):
        curso = self.get_object()
        curso.is_active = not curso.is_active
        curso.save()
        return Response({'status': 'status updated', 'is_active': curso.is_active})

    @action(detail=False, methods=['post'], url_path='importar-arquivo')
    @transaction.atomic
    def importar_arquivo(self, request):
        """
        Importa cursos via arquivo CSV ou Excel (.xlsx).
        Esperado: arquivo 'file' no request.FILES.
        Colunas esperadas: NOME, SIGLA
        """
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'Nenhum arquivo enviado.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            if file.name.endswith('.csv'):
                try:
                    df = pd.read_csv(file, sep=';', dtype=str)
                except:
                    file.seek(0)
                    df = pd.read_csv(file, sep=',', dtype=str)
            elif file.name.endswith('.xlsx') or file.name.endswith('.xls'):
                df = pd.read_excel(file, dtype=str)
            else:
                return Response({'detail': 'Formato inválido. Use .csv ou .xlsx'}, status=status.HTTP_400_BAD_REQUEST)
            
            df.columns = [c.strip().upper() for c in df.columns]
            df = df.fillna('')
            
            required_fields = ['NOME', 'SIGLA']
            missing = [f for f in required_fields if f not in df.columns]
            if missing:
                return Response(
                    {'detail': f'Colunas faltando: {", ".join(missing)}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            created_count = 0
            updated_count = 0
            errors = []
            
            for index, row in df.iterrows():
                try:
                    nome = str(row['NOME']).strip()
                    sigla = str(row['SIGLA']).strip()
                    
                    if not nome or not sigla:
                        errors.append(f"Linha {index + 2}: Nome e Sigla são obrigatórios.")
                        continue
                        
                    obj, created = Curso.objects.update_or_create(
                        nome=nome,
                        defaults={
                            'sigla': sigla,
                            'is_active': True
                        }
                    )
                    
                    if created:
                        created_count += 1
                    else:
                        obj.sigla = sigla
                        obj.save()
                        updated_count += 1
                        
                except Exception as e:
                    errors.append(f"Linha {index + 2}: {str(e)}")
            
            msg = f'Importação concluída. {created_count} criados, {updated_count} atualizados.'
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
        """Gera e retorna o modelo de importação de cursos em Excel."""
        buffer = io.BytesIO()
        
        data = {
            'NOME': ['Técnico em Informática', 'Ensino Médio'],
            'SIGLA': ['INFO', 'EM']
        }
        df = pd.DataFrame(data)
        
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Modelo Cursos')
            worksheet = writer.sheets['Modelo Cursos']
            for idx, col in enumerate(df.columns):
                worksheet.column_dimensions[chr(65 + idx)].width = 25
                
        buffer.seek(0)
        return FileResponse(
            buffer, 
            as_attachment=True, 
            filename='modelo_cursos.xlsx',
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
