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

from apps.core.models import Turma, Curso, AnoLetivo
from apps.core.serializers import TurmaSerializer
from apps.users.permissions import GestaoSecretariaMixin, AnoLetivoFilterMixin


from rest_framework.filters import OrderingFilter

class TurmaViewSet(AnoLetivoFilterMixin, GestaoSecretariaMixin, viewsets.ModelViewSet):
    """
    ViewSet para Turma.
    Leitura: Gestão / Secretaria | Escrita: Gestão / Secretaria
    
    Filtrado pelo ano letivo selecionado do usuário.
    """
    queryset = Turma.objects.select_related('curso').prefetch_related('professores_representantes__usuario')
    serializer_class = TurmaSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['numero', 'letra', 'ano_letivo', 'curso', 'nomenclatura', 'is_active']
    ordering_fields = ['ano_letivo', 'numero', 'letra', 'curso__nome']
    ordering = ['-ano_letivo', 'numero', 'letra', 'curso__nome']
    search_fields = ['numero', 'letra']
    
    ano_letivo_field = 'ano_letivo'  # Campo de filtro do AnoLetivoFilterMixin

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
        Importa turmas via arquivo CSV/XLSX.
        Colunas esperadas: NUMERO, LETRA, ANO_LETIVO, SIGLA_CURSO, NOMENCLATURA (opcional)
        """
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'Nenhum arquivo enviado'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            if file.name.endswith('.csv'):
                df = pd.read_csv(io.BytesIO(file.read()))
            else:
                df = pd.read_excel(io.BytesIO(file.read()))
        except Exception as e:
            return Response({'error': f'Erro ao ler arquivo: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        required_cols = ['NUMERO', 'LETRA', 'ANO_LETIVO', 'SIGLA_CURSO']
        missing = [c for c in required_cols if c not in df.columns]
        if missing:
            return Response({'error': f'Colunas obrigatórias faltando: {missing}'}, status=status.HTTP_400_BAD_REQUEST)

        created_count = 0
        updated_count = 0
        errors = []

        # Carrega dados de referência
        cursos_map = {c.sigla.upper(): c for c in Curso.objects.all()}
        anos_letivos_validos = set(AnoLetivo.objects.values_list('ano', flat=True))

        for idx, row in df.iterrows():
            try:
                numero = int(row['NUMERO'])
                letra = str(row['LETRA']).strip().upper()
                ano_letivo = int(row['ANO_LETIVO'])
                sigla_curso = str(row['SIGLA_CURSO']).strip().upper()
                nomenclatura = str(row.get('NOMENCLATURA', '')).strip() if pd.notna(row.get('NOMENCLATURA')) else ''

                if ano_letivo not in anos_letivos_validos:
                    errors.append(f'Linha {idx + 2}: Ano letivo {ano_letivo} não existe no sistema')
                    continue

                curso = cursos_map.get(sigla_curso)
                if not curso:
                    errors.append(f'Linha {idx + 2}: Curso com sigla "{sigla_curso}" não encontrado')
                    continue

                turma, created = Turma.objects.update_or_create(
                    numero=numero,
                    letra=letra,
                    ano_letivo=ano_letivo,
                    curso=curso,
                    defaults={'nomenclatura': nomenclatura if nomenclatura else None}
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
        """Retorna arquivo modelo para importação de turmas."""
        df = pd.DataFrame({
            'NUMERO': [1, 2],
            'LETRA': ['A', 'B'],
            'ANO_LETIVO': [2024, 2024],
            'SIGLA_CURSO': ['EM', 'EM'],
            'NOMENCLATURA': ['1ª Série A - Matutino', '']
        })

        output = io.BytesIO()
        df.to_excel(output, index=False)
        output.seek(0)

        response = FileResponse(
            output,
            as_attachment=True,
            filename='modelo_importacao_turmas.xlsx'
        )
        return response

    @action(detail=True, methods=['get'], url_path='exportar-dados')
    def exportar_dados(self, request, pk=None):
        """Exporta dados da turma e seus estudantes para XLSX."""
        from apps.academic.models import MatriculaTurma
        
        turma = self.get_object()
        
        matriculas = MatriculaTurma.objects.filter(
            turma=turma
        ).select_related(
            'matricula_cemep__estudante__usuario'
        ).order_by('matricula_cemep__estudante__usuario__first_name')

        data = []
        for m in matriculas:
            estudante = m.matricula_cemep.estudante
            usuario = estudante.usuario
            data.append({
                'MATRICULA': usuario.username,
                'NOME': usuario.get_full_name(),
                'EMAIL': usuario.email or '',
                'STATUS': m.get_status_display(),
            })

        df = pd.DataFrame(data)
        
        output = io.BytesIO()
        df.to_excel(output, index=False)
        output.seek(0)

        filename = f'turma_{turma.nome_completo.replace(" ", "_")}.xlsx'
        
        response = FileResponse(
            output,
            as_attachment=True,
            filename=filename
        )
        return response
