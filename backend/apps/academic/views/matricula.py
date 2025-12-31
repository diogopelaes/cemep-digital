"""
View para Matrículas
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction

from apps.academic.models import MatriculaCEMEP, MatriculaTurma
from apps.academic.serializers import MatriculaCEMEPSerializer, MatriculaTurmaSerializer
from apps.core.models import Turma
from apps.users.permissions import GestaoSecretariaWriteFuncionarioReadMixin


class MatriculaCEMEPViewSet(GestaoSecretariaWriteFuncionarioReadMixin, viewsets.ModelViewSet):
    """ViewSet de Matrículas CEMEP. Leitura: Funcionários | Escrita: Gestão/Secretaria"""
    queryset = MatriculaCEMEP.objects.select_related('estudante__usuario', 'curso').all()
    serializer_class = MatriculaCEMEPSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'curso', 'estudante']
    search_fields = ['numero_matricula', 'estudante__usuario__first_name']

    def destroy(self, request, *args, **kwargs):
        return Response({'detail': 'A exclusão de registros não é permitida.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


class MatriculaTurmaViewSet(GestaoSecretariaWriteFuncionarioReadMixin, viewsets.ModelViewSet):
    """ViewSet de Matrículas Turma. Leitura: Funcionários | Escrita: Gestão/Secretaria"""
    queryset = MatriculaTurma.objects.select_related(
        'matricula_cemep__estudante__usuario', 'turma__curso'
    ).all()
    serializer_class = MatriculaTurmaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'turma', 'matricula_cemep', 'turma__ano_letivo']
    search_fields = ['matricula_cemep__estudante__usuario__first_name', 'matricula_cemep__numero_matricula']

    @action(detail=False, methods=['get'], url_path='estudantes-elegiveis')
    def estudantes_elegiveis(self, request):
        """
        Retorna estudantes elegíveis para uma turma específica.
        
        Regras:
        1. MatriculaCEMEP com status=MATRICULADO e curso=turma.curso
        2. Não pode ter MatriculaTurma em NENHUMA turma do mesmo curso (evita duplicidade)
        """
        turma_id = request.query_params.get('turma_id')
        if not turma_id:
            return Response({'detail': 'turma_id é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            turma = Turma.objects.get(pk=turma_id)
        except Turma.DoesNotExist:
            return Response({'detail': 'Turma não encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Estudantes já enturmados em QUALQUER turma do mesmo curso
        matriculas_em_turmas_do_curso = MatriculaTurma.objects.filter(
            turma__curso=turma.curso
        ).values_list('matricula_cemep_id', flat=True)
        
        # Estudantes elegíveis: MATRICULADO no mesmo curso e não enturmados em nenhuma turma desse curso
        matriculas_elegiveis = MatriculaCEMEP.objects.filter(
            status=MatriculaCEMEP.Status.MATRICULADO,
            curso=turma.curso
        ).exclude(
            id__in=matriculas_em_turmas_do_curso
        ).select_related('estudante__usuario').order_by('estudante__usuario__first_name')
        
        serializer = MatriculaCEMEPSerializer(matriculas_elegiveis, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='enturmar-lote')
    @transaction.atomic
    def enturmar_lote(self, request):
        """
        Cria matrículas em lote para uma turma.
        Espera: { turma_id, matriculas_cemep_ids: [], data_entrada }
        """
        turma_id = request.data.get('turma_id')
        matriculas_ids = request.data.get('matriculas_cemep_ids', [])
        data_entrada = request.data.get('data_entrada')
        
        if not turma_id or not matriculas_ids or not data_entrada:
            return Response(
                {'detail': 'turma_id, matriculas_cemep_ids e data_entrada são obrigatórios.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            turma = Turma.objects.get(pk=turma_id)
        except Turma.DoesNotExist:
            return Response({'detail': 'Turma não encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        
        created = []
        errors = []
        
        for matricula_id in matriculas_ids:
            try:
                matricula_cemep = MatriculaCEMEP.objects.get(numero_matricula=matricula_id)
                
                # Regra 1: MatriculaCEMEP deve ser do mesmo curso da turma
                if matricula_cemep.curso != turma.curso:
                    errors.append(f'{matricula_cemep.estudante} não está matriculado no curso {turma.curso}.')
                    continue
                
                # Regra 2: Não pode estar enturmado em NENHUMA turma do mesmo curso
                if MatriculaTurma.objects.filter(turma__curso=turma.curso, matricula_cemep=matricula_cemep).exists():
                    errors.append(f'{matricula_cemep.estudante} já está enturmado em uma turma deste curso.')
                    continue
                
                mt = MatriculaTurma.objects.create(
                    turma=turma,
                    matricula_cemep=matricula_cemep,
                    data_entrada=data_entrada
                )
                created.append(MatriculaTurmaSerializer(mt).data)
            except MatriculaCEMEP.DoesNotExist:
                errors.append(f'Matrícula {matricula_id} não encontrada.')
            except Exception as e:
                errors.append(f'Erro ao enturmar {matricula_id}: {str(e)}')
        
        return Response({
            'created': created,
            'created_count': len(created),
            'errors': errors
        }, status=status.HTTP_201_CREATED if created else status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='download-modelo')
    def download_modelo(self, request):
        """Gera arquivo XLSX modelo para importação de enturmação."""
        import pandas as pd
        from django.http import HttpResponse
        from io import BytesIO
        
        # Cria DataFrame com exemplo
        df = pd.DataFrame({
            'MATRICULA': ['1234567890', '0987654321'],
            'TURMA': ['1A', '2B'],
            'CURSO': ['INFO', 'ENF'],
            'DATA_ENTRADA': ['01/01/2024', '01/01/2024']
        })
        
        # Gera arquivo Excel
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Enturmacao')
        output.seek(0)
        
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename=modelo_enturmacao.xlsx'
        return response

    @action(detail=False, methods=['post'], url_path='importar-arquivo')
    @transaction.atomic
    def importar_arquivo(self, request):
        """
        Importa enturmações em massa via arquivo XLSX/CSV.
        
        Colunas esperadas: MATRICULA, TURMA, CURSO, DATA_ENTRADA (opcional)
        """
        import pandas as pd
        from apps.core.models import Curso
        from datetime import datetime
        
        arquivo = request.FILES.get('file')
        if not arquivo:
            return Response({'detail': 'Arquivo é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Lê arquivo
        try:
            if arquivo.name.endswith('.csv'):
                df = pd.read_csv(arquivo)
            else:
                df = pd.read_excel(arquivo)
        except Exception as e:
            return Response({'detail': f'Erro ao ler arquivo: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Valida colunas obrigatórias
        required_cols = ['MATRICULA', 'TURMA', 'CURSO']
        missing = [c for c in required_cols if c not in df.columns]
        if missing:
            return Response({'detail': f'Colunas faltando: {", ".join(missing)}'}, status=status.HTTP_400_BAD_REQUEST)
        
        created = []
        errors = []
        
        for idx, row in df.iterrows():
            linha = idx + 2  # +2 porque idx começa em 0 e há header
            try:
                matricula_num = str(row['MATRICULA']).strip()
                turma_codigo = str(row['TURMA']).strip().upper()
                curso_sigla = str(row['CURSO']).strip().upper()
                
                # Data de entrada (opcional, padrão hoje)
                data_entrada = None
                if 'DATA_ENTRADA' in df.columns and pd.notna(row.get('DATA_ENTRADA')):
                    try:
                        data_str = str(row['DATA_ENTRADA']).strip()
                        # Tenta formatos comuns
                        for fmt in ['%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y']:
                            try:
                                data_entrada = datetime.strptime(data_str, fmt).date()
                                break
                            except ValueError:
                                continue
                    except:
                        pass
                if not data_entrada:
                    data_entrada = datetime.now().date()
                
                # Busca curso
                try:
                    curso = Curso.objects.get(sigla__iexact=curso_sigla)
                except Curso.DoesNotExist:
                    errors.append(f'Linha {linha}: Curso "{curso_sigla}" não encontrado.')
                    continue
                
                # Busca matrícula CEMEP
                try:
                    matricula_cemep = MatriculaCEMEP.objects.get(numero_matricula=matricula_num)
                except MatriculaCEMEP.DoesNotExist:
                    errors.append(f'Linha {linha}: Matrícula "{matricula_num}" não encontrada.')
                    continue
                
                # Valida que matrícula é do mesmo curso
                if matricula_cemep.curso != curso:
                    errors.append(f'Linha {linha}: Matrícula {matricula_num} não é do curso {curso_sigla}.')
                    continue
                
                # Busca turma pelo código (ex: "1A" = numero=1, letra=A)
                if len(turma_codigo) < 2:
                    errors.append(f'Linha {linha}: Código de turma inválido "{turma_codigo}".')
                    continue
                
                turma_numero = turma_codigo[:-1]
                turma_letra = turma_codigo[-1]
                
                try:
                    turma = Turma.objects.get(numero=turma_numero, letra=turma_letra, curso=curso)
                except Turma.DoesNotExist:
                    errors.append(f'Linha {linha}: Turma "{turma_codigo}" do curso {curso_sigla} não encontrada.')
                    continue
                
                # Verifica se já está enturmado em alguma turma do mesmo curso
                if MatriculaTurma.objects.filter(turma__curso=curso, matricula_cemep=matricula_cemep).exists():
                    errors.append(f'Linha {linha}: {matricula_cemep.estudante} já está enturmado no curso {curso_sigla}.')
                    continue
                
                # Cria matrícula na turma
                mt = MatriculaTurma.objects.create(
                    turma=turma,
                    matricula_cemep=matricula_cemep,
                    data_entrada=data_entrada
                )
                created.append(f'{matricula_cemep.estudante} → {turma}')
                
            except Exception as e:
                errors.append(f'Linha {linha}: Erro inesperado - {str(e)}')
        
        return Response({
            'created': created,
            'created_count': len(created),
            'errors': errors
        }, status=status.HTTP_201_CREATED if created else status.HTTP_400_BAD_REQUEST)

