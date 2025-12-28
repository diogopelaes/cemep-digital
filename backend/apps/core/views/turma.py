"""
View para Turma
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

from apps.core.models import Turma, Curso
from apps.core.serializers import TurmaSerializer
from apps.users.permissions import GestaoSecretariaMixin


from rest_framework.filters import OrderingFilter

class TurmaViewSet(GestaoSecretariaMixin, viewsets.ModelViewSet):
    """ViewSet de Turmas. Leitura: Gestão/Secretaria | Escrita: Gestão/Secretaria"""
    queryset = Turma.objects.select_related('curso').prefetch_related('professores_representantes__usuario').all()
    serializer_class = TurmaSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['numero', 'letra', 'ano_letivo', 'curso', 'nomenclatura', 'is_active']
    ordering_fields = ['ano_letivo', 'numero', 'letra', 'curso__nome']
    ordering = ['-ano_letivo', 'numero', 'letra', 'curso__nome']
    search_fields = ['numero', 'letra']

    def destroy(self, request, *args, **kwargs):
        return Response({'detail': 'A exclusão de registros não é permitida.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    @action(detail=False, methods=['get'], url_path='anos-disponiveis')
    def anos_disponiveis(self, request):
        """Retorna a lista de anos letivos disponíveis nas turmas."""
        anos = Turma.objects.values_list('ano_letivo', flat=True).distinct().order_by('-ano_letivo')
        return Response(list(anos))

    @action(detail=True, methods=['post'], url_path='toggle-ativo')
    @transaction.atomic
    def toggle_ativo(self, request, pk=None):
        turma = self.get_object()
        turma.is_active = not turma.is_active
        turma.save()
        return Response({'status': 'status updated', 'is_active': turma.is_active})

    @action(detail=False, methods=['post'], url_path='importar-arquivo')
    @transaction.atomic
    def importar_arquivo(self, request):
        """
        Importa turmas via CSV/XLSX.
        Colunas: NUMERO, LETRA, ANO_LETIVO, NOMENCLATURA, SIGLA_CURSO
        """
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'Arquivo não enviado.'}, status=400)
        
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
            
            required = ['NUMERO', 'LETRA', 'ANO_LETIVO', 'NOMENCLATURA', 'SIGLA_CURSO']
            missing = [c for c in required if c not in df.columns]
            if missing:
                return Response({'detail': f'Colunas faltando: {", ".join(missing)}'}, status=400)
            
            created_count = 0
            updated_count = 0
            errors = []
            
            cursos_map = {c.sigla: c for c in Curso.objects.all()}
            
            nom_map = {
                'SÉRIE': 'SERIE', 'SERIE': 'SERIE',
                'ANO': 'ANO',
                'MÓDULO': 'MODULO', 'MODULO': 'MODULO'
            }
            
            for idx, row in df.iterrows():
                try:
                    line = idx + 2
                    num_str = str(row['NUMERO']).strip()
                    letra = str(row['LETRA']).strip().upper()
                    ano_str = str(row['ANO_LETIVO']).strip()
                    nom_raw = str(row['NOMENCLATURA']).strip().upper()
                    sigla_curso = str(row['SIGLA_CURSO']).strip()
                    
                    if not all([num_str, letra, ano_str, nom_raw, sigla_curso]):
                        errors.append(f"Linha {line}: Todos os campos são obrigatórios.")
                        continue
                        
                    curso = cursos_map.get(sigla_curso)
                    if not curso:
                        errors.append(f"Linha {line}: Curso com sigla '{sigla_curso}' não encontrado.")
                        continue
                        
                    nomenclatura = nom_map.get(nom_raw)
                    if not nomenclatura:
                         errors.append(f"Linha {line}: Nomenclatura '{nom_raw}' inválida (Use Série, Ano ou Módulo).")
                         continue
                         
                    try:
                        numero = int(num_str)
                        ano_letivo = int(ano_str)
                    except ValueError:
                        errors.append(f"Linha {line}: Número e Ano Letivo devem ser numéricos.")
                        continue
                        
                    turma, created = Turma.objects.update_or_create(
                        numero=numero,
                        letra=letra,
                        ano_letivo=ano_letivo,
                        curso=curso,
                        defaults={
                            'nomenclatura': nomenclatura,
                            'is_active': True
                        }
                    )
                    
                    if created:
                        created_count += 1
                    else:
                        updated_count += 1
                        
                except Exception as e:
                    errors.append(f"Linha {line}: {str(e)}")
            
            msg = f'Importação concluída. {created_count} criados, {updated_count} atualizados.'
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

    @action(detail=False, methods=['get'], url_path='download-modelo', permission_classes=[AllowAny])
    def download_modelo(self, request):
        buffer = io.BytesIO()
        data = {
            'NUMERO': ['1', '2'],
            'LETRA': ['A', 'B'],
            'ANO_LETIVO': ['2024', '2024'],
            'NOMENCLATURA': ['Série', 'Módulo'],
            'SIGLA_CURSO': ['INFO', 'ADM']
        }
        df = pd.DataFrame(data)
        
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            df.to_excel(writer, index=False)
            ws = writer.sheets['Sheet1']
            for i, col in enumerate(df.columns):
                ws.column_dimensions[chr(65+i)].width = 20
                
        buffer.seek(0)
        return FileResponse(buffer, as_attachment=True, filename='modelo_turmas.xlsx')
