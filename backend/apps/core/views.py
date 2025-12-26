"""
Views para o App Core
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
import secrets
import csv
import io
import pandas as pd
from django.http import FileResponse



from .models import (
    Funcionario, PeriodoTrabalho, Disciplina, Curso, Turma,
    DisciplinaTurma, ProfessorDisciplinaTurma, CalendarioEscolar, Habilidade, Bimestre
)
from .serializers import (
    FuncionarioSerializer, FuncionarioCreateSerializer, FuncionarioCompletoSerializer,
    FuncionarioUpdateSerializer, PeriodoTrabalhoSerializer, DisciplinaSerializer, 
    CursoSerializer, TurmaSerializer, DisciplinaTurmaSerializer, 
    ProfessorDisciplinaTurmaSerializer, CalendarioEscolarSerializer, HabilidadeSerializer,
    BimestreSerializer
)
from apps.users.permissions import (
    IsGestao, GestaoOnlyMixin, GestaoWriteFuncionarioReadMixin, 
    GestaoSecretariaMixin, GestaoWritePublicReadMixin, 
    GestaoSecretariaWritePublicReadMixin
)
from apps.users.models import User
from apps.users.utils import send_credentials_email


class FuncionarioViewSet(GestaoWriteFuncionarioReadMixin, viewsets.ModelViewSet):
    """ViewSet de Funcionários. Leitura: Funcionários | Escrita: Gestão"""
    queryset = Funcionario.objects.select_related('usuario').all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['usuario__tipo_usuario', 'usuario__is_active']
    search_fields = ['matricula', 'usuario__first_name', 'apelido']
    
    def destroy(self, request, *args, **kwargs):
        return Response({'detail': 'A exclusão de registros não é permitida.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def get_serializer_class(self):
        if self.action == 'criar_completo':
            return FuncionarioCompletoSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return FuncionarioCreateSerializer
        return FuncionarioSerializer
    
    @action(detail=True, methods=['post'], url_path='toggle-ativo')
    def toggle_ativo(self, request, pk=None):
        """Alterna o status is_active do usuário associado ao funcionário."""
        funcionario = self.get_object()
        user = funcionario.usuario
        user.is_active = not user.is_active
        user.save()
        return Response({
            'is_active': user.is_active,
            'message': 'Funcionário ativado' if user.is_active else 'Funcionário desativado'
        })

    @action(detail=False, methods=['post'], url_path='importar-arquivo')
    @transaction.atomic
    def importar_arquivo(self, request):
        """
        Importa funcionários via XLSX/CSV.
        Colunas: NOME_COMPLETO, EMAIL, MATRICULA, TIPO_USUARIO, SENHA, CPF, APELIDO
        User Creation: MATRICULA -> username.
        Validação: FuncionarioCompletoSerializer logic (manual).
        """
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'Arquivo não enviado.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Ler com Pandas
            if file.name.endswith('.csv'):
                try:
                    df = pd.read_csv(file, sep=';', dtype={'MATRICULA': str, 'TELEFONE': str, 'CPF': str, 'SENHA': str})
                except:
                    file.seek(0)
                    df = pd.read_csv(file, sep=',', dtype={'MATRICULA': str, 'TELEFONE': str, 'CPF': str, 'SENHA': str})
            else:
                df = pd.read_excel(file, dtype={'MATRICULA': str, 'TELEFONE': str, 'CPF': str, 'SENHA': str})
            
            df = df.fillna('')
            df.columns = [c.strip().upper() for c in df.columns]
            
            required = ['NOME_COMPLETO', 'MATRICULA', 'TIPO_USUARIO', 'EMAIL']
            missing = [c for c in required if c not in df.columns]
            if missing:
                return Response({'detail': f'Colunas faltando: {", ".join(missing)}'}, status=400)

            created_count = 0
            updated_count = 0
            errors = []

            for idx, row in df.iterrows():
                try:
                    line = idx + 2
                    matricula = str(row['MATRICULA']).strip()
                    nome = row['NOME_COMPLETO'].strip()
                    tipo = row['TIPO_USUARIO'].strip().upper()
                    
                    if not matricula or not nome:
                         errors.append(f"Linha {line}: Matrícula ou Nome inválidos.")
                         continue

                    # Mapeamento e Validação de Tipo
                    map_tipo = {
                        'GESTÃO': 'GESTAO', 'SECRETARIA': 'SECRETARIA', 
                        'PROFESSOR': 'PROFESSOR', 'MONITOR': 'MONITOR',
                        'FUNCIONÁRIO': 'FUNCIONARIO', 'GESTAO': 'GESTAO'
                    }
                    tipo_codigo = map_tipo.get(tipo, tipo)
                    
                    if tipo_codigo not in User.TipoUsuario.values:
                         errors.append(f"Linha {line}: Tipo '{tipo}' inválido.")
                         continue

                    # Password Logic
                    raw_password = str(row.get('SENHA', '')).strip()
                    if not raw_password:
                        import random, string
                        chars = string.ascii_letters + string.digits + "!@#"
                        raw_password = ''.join(random.choice(chars) for _ in range(8))

                    sid = transaction.savepoint()
                    
                    try:
                        # -- USER --
                        # Username agora é a MATRICULA
                        user_defaults={
                            'first_name': nome, # Nome Completo no first_name como solicitado
                            'last_name': '',
                            'email': row.get('EMAIL', '').strip(),
                            'tipo_usuario': tipo_codigo,
                            'is_active': True 
                        }

                        user, user_created = User.objects.update_or_create(
                            username=matricula,
                            defaults=user_defaults
                        )
                        
                        # Se criado ou se senha fornecida explicitamente, atualizar senha
                        if user_created or row.get('SENHA', '').strip():
                            user.set_password(raw_password)
                            user.save()

                        # -- FUNCIONARIO --
                        apelido = row.get('APELIDO', '').strip()
                        if not apelido:
                            apelido = nome.split(' ')[0]

                        cpf = str(row.get('CPF', '')).strip().replace('.', '').replace('-', '')
                        if not cpf: # Garantir que não tente salvar string vazia se campo for unique/validado
                            cpf = None

                        func, func_created = Funcionario.objects.update_or_create(
                            usuario=user,
                            defaults={
                                'matricula': matricula, # Redundante mas mantido
                                'apelido': apelido,
                                'cpf': cpf,
                                # Outros campos opcionais não solicitados mas mantidos como nullable
                            }
                        )
                        
                        if func_created:
                            created_count += 1
                        else:
                            updated_count += 1
                            
                        transaction.savepoint_commit(sid)

                    except Exception as ie:
                        transaction.savepoint_rollback(sid)
                        raise ie 
                        
                except Exception as e:
                    errors.append(f"Linha {idx + 2}: {str(e)}")

            msg = f'Importação concluída: {created_count} criados, {updated_count} atualizados.'
            if errors:
                msg += f' {len(errors)} erros.'
            
            return Response({
                'message': msg,
                'errors': errors,
                'created_count': created_count,
                'updated_count': updated_count
            })
            
        except Exception as e:
            return Response({'detail': f'Erro processando arquivo: {str(e)}'}, status=400)

    @action(detail=False, methods=['get'], url_path='download-modelo', permission_classes=[AllowAny])
    def download_modelo(self, request):
        buffer = io.BytesIO()
        data = {
            'NOME_COMPLETO': ['Maria Oliveira'],
            'EMAIL': ['maria@escola.com.br'],
            'MATRICULA': ['202401'],
            'TIPO_USUARIO': ['PROFESSOR'],
            'SENHA': ['123@Mudar'],
            'CPF': ['12345678900'],
            'APELIDO': ['Maria']
        }
        df = pd.DataFrame(data)
        
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            df.to_excel(writer, index=False)
            ws = writer.sheets['Sheet1']
            for i, col in enumerate(df.columns):
                ws.column_dimensions[chr(65+i)].width = 20

        buffer.seek(0)
        return FileResponse(
            buffer, 
            as_attachment=True, 
            filename='modelo_funcionarios.xlsx',
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    
    @action(detail=False, methods=['post'], url_path='criar-completo')
    @transaction.atomic
    def criar_completo(self, request):
        """
        Cria usuário, funcionário e período de trabalho em uma única transação atômica.
        Se qualquer parte falhar, tudo é revertido.
        """
        serializer = FuncionarioCompletoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        
        # Guarda senha antes de hash para enviar por email
        password_plain = data['password']
        
        # Criar usuário
        user = User.objects.create_user(
            username=data['username'],
            email=data.get('email', ''),
            password=password_plain,
            first_name=data['nome'],
            telefone=data.get('telefone', ''),
            tipo_usuario=data['tipo_usuario'],
        )
        
        # Criar funcionário
        funcionario = Funcionario.objects.create(
            usuario=user,
            matricula=data['matricula'],
            area_atuacao=data.get('area_atuacao') or None,
            apelido=data.get('apelido') or None,
            cpf=data.get('cpf') or None,
            cin=data.get('cin') or '',
            nome_social=data.get('nome_social') or '',
            data_nascimento=data.get('data_nascimento'),
            logradouro=data.get('logradouro') or '',
            numero=data.get('numero') or '',
            bairro=data.get('bairro') or '',
            cidade=data.get('cidade') or 'Mogi Guaçu',
            estado=data.get('estado') or 'SP',
            cep=data.get('cep') or '',
            complemento=data.get('complemento') or '',
            telefone=data.get('telefone') or '',  # Telefone duplicado no model Funcionario
            data_admissao=data.get('data_admissao'),
        )
        
        # Criar período de trabalho inicial
        PeriodoTrabalho.objects.create(
            funcionario=funcionario,
            data_entrada=data['data_entrada'],
            data_saida=None,  # Ainda em atividade
        )
        
        # Envia email com credenciais
        email_result = None
        if user.email:
            email_result = send_credentials_email(
                email=user.email,
                nome=data['nome'],
                username=data['username'],
                password=password_plain,
                tipo_usuario=data['tipo_usuario']
            )
        
        response_data = FuncionarioSerializer(funcionario).data
        if email_result:
            response_data['email_enviado'] = email_result['success']
            response_data['email_message'] = email_result['message']
        
        return Response(response_data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['put'], url_path='atualizar-completo')
    @transaction.atomic
    def atualizar_completo(self, request, pk=None):
        """
        Atualiza funcionário, usuário e período de trabalho em uma única transação atômica.
        """
        funcionario = self.get_object()
        serializer = FuncionarioUpdateSerializer(
            data=request.data, 
            context={'funcionario': funcionario}
        )
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        
        # Atualizar usuário
        user = funcionario.usuario
        user.first_name = data['nome']
        user.email = data.get('email', '')
        user.telefone = data.get('telefone', '')
        user.tipo_usuario = data['tipo_usuario']
        user.save()
        
        # Atualizar funcionário
        funcionario.matricula = data['matricula']
        funcionario.area_atuacao = data.get('area_atuacao') or None
        funcionario.apelido = data.get('apelido') or None
        
        # Novos campos
        funcionario.cpf = data.get('cpf') or None
        funcionario.cin = data.get('cin') or ''
        funcionario.nome_social = data.get('nome_social') or ''
        funcionario.data_nascimento = data.get('data_nascimento')
        funcionario.logradouro = data.get('logradouro') or ''
        funcionario.numero = data.get('numero') or ''
        funcionario.bairro = data.get('bairro') or ''
        funcionario.cidade = data.get('cidade') or 'Mogi Guaçu'
        funcionario.estado = data.get('estado') or 'SP'
        funcionario.cep = data.get('cep') or ''
        funcionario.complemento = data.get('complemento') or ''
        if 'telefone' in data:
            funcionario.telefone = data['telefone']
        
        # Data de admissão
        funcionario.data_admissao = data.get('data_admissao')
            
        funcionario.save()
        
        # Atualizar ou criar período de trabalho
        periodo = funcionario.periodos_trabalho.order_by('data_entrada').first()
        if periodo:
            periodo.data_entrada = data['data_entrada']
            periodo.save()
        else:
            PeriodoTrabalho.objects.create(
                funcionario=funcionario,
                data_entrada=data['data_entrada'],
                data_saida=None,
            )
        
        return Response(FuncionarioSerializer(funcionario).data)
    
    @action(detail=True, methods=['post'], url_path='resetar-senha')
    def resetar_senha(self, request, pk=None):
        """
        Reseta a senha do funcionário e envia a nova senha por e-mail.
        """
        funcionario = self.get_object()
        user = funcionario.usuario
        
        # Verifica se o usuário tem e-mail cadastrado
        if not user.email:
            return Response(
                {'detail': 'Este funcionário não possui e-mail cadastrado.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Gera uma nova senha aleatória (12 caracteres)
        nova_senha = secrets.token_urlsafe(9)  # Gera ~12 caracteres
        
        # Atualiza a senha do usuário
        user.set_password(nova_senha)
        user.save()
        
        # Contexto para o template de e-mail
        context = {
            'nome': user.first_name or funcionario.apelido or 'Usuário',
            'username': user.username,
            'password': nova_senha,
            'site_url': settings.SITE_URL,
            'site_name': settings.SITE_NAME,
            'institution_name': settings.INSTITUTION_NAME,
            'logo_url': f"{settings.SITE_URL}/static/img/{settings.INSTITUTIONAL_DATA['institution']['logo']['filename']}",
        }
        
        try:
            # Renderiza o template HTML
            html_message = render_to_string('emails/password_reset_email.html', context)
            plain_message = strip_tags(html_message)
            
            send_mail(
                subject=f'{settings.SITE_NAME} - Sua Senha Foi Redefinida',
                message=plain_message,
                html_message=html_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
            
            return Response({
                'message': f'Senha redefinida com sucesso! Um e-mail foi enviado para {user.email}.'
            })
        except Exception as e:
            # Se falhar o envio do email, reverte a senha (melhor não deixar sem notificar)
            return Response(
                {'detail': f'Erro ao enviar e-mail: {str(e)}. A senha não foi alterada.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PeriodoTrabalhoViewSet(GestaoWriteFuncionarioReadMixin, viewsets.ModelViewSet):
    """ViewSet de Períodos de Trabalho. Leitura: Funcionários | Escrita: Gestão"""
    queryset = PeriodoTrabalho.objects.select_related('funcionario').all()
    serializer_class = PeriodoTrabalhoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['funcionario']


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
            # Ler arquivo com Pandas
            if file.name.endswith('.csv'):
                # Tenta detectar separador ou usa ; como padrão (BR)
                try:
                    df = pd.read_csv(file, sep=';')
                    if 'NOME' not in [c.upper() for c in df.columns]:
                        file.seek(0)
                        df = pd.read_csv(file, sep=',') # Tenta vírgula se falhar
                except:
                    file.seek(0)
                    df = pd.read_csv(file, sep=';') # Fallback
            elif file.name.endswith('.xlsx') or file.name.endswith('.xls'):
                df = pd.read_excel(file)
            else:
                return Response({'detail': 'Formato inválido. Use .csv ou .xlsx'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Normalizar colunas
            df.columns = [c.strip().upper() for c in df.columns]
            
            required_fields = ['NOME', 'SIGLA', 'AREA_CONHECIMENTO']
            missing = [f for f in required_fields if f not in df.columns]
            if missing:
                return Response(
                    {'detail': f'Colunas faltando: {", ".join(missing)}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Limpar dados (NaN -> None/Empty)
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
                        
                    # Validar Área
                    if area and area not in Disciplina.AreaConhecimento.values:
                        if area in Disciplina.AreaConhecimento.names:
                            area = Disciplina.AreaConhecimento[area]
                        else:
                            # Tentar fuzzy match ou ignorar? Vamos logar erro por enquanto
                            errors.append(f"Linha {index + 2}: Área '{area}' inválida.")
                            continue
                            
                    obj, created = Disciplina.objects.update_or_create(
                        sigla=sigla,
                        defaults={
                            'nome': nome,
                            'area_conhecimento': area if area else None,
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
        
        # Criar DataFrame com colunas e um exemplo
        data = {
            'NOME': ['Matemática'],
            'SIGLA': ['MAT'],
            'AREA_CONHECIMENTO': ['MATEMATICA']
        }
        df = pd.DataFrame(data)
        
        # Salvar no buffer
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Modelo Importação')
            
            # Ajustar largura das colunas (opcional, requer acesso à sheet)
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



class CursoViewSet(GestaoSecretariaMixin, viewsets.ModelViewSet):
    """ViewSet de Cursos. Leitura: Gestão/Secretaria | Escrita: Gestão/Secretaria"""
    queryset = Curso.objects.all()
    serializer_class = CursoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_active']
    search_fields = ['nome', 'sigla']

    def destroy(self, request, *args, **kwargs):
        return Response({'detail': 'A exclusão de registros não é permitida.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


class TurmaViewSet(GestaoSecretariaMixin, viewsets.ModelViewSet):
    """ViewSet de Turmas. Leitura: Gestão/Secretaria | Escrita: Gestão/Secretaria"""
    queryset = Turma.objects.select_related('curso').prefetch_related('professores_representantes__usuario').all()
    serializer_class = TurmaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['numero', 'letra', 'ano_letivo', 'curso', 'nomenclatura', 'is_active']
    search_fields = ['numero', 'letra']

    def destroy(self, request, *args, **kwargs):
        return Response({'detail': 'A exclusão de registros não é permitida.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    @action(detail=False, methods=['get'], url_path='anos-disponiveis')
    def anos_disponiveis(self, request):
        """Retorna a lista de anos letivos disponíveis nas turmas."""
        anos = Turma.objects.values_list('ano_letivo', flat=True).distinct().order_by('-ano_letivo')
        return Response(list(anos))


class DisciplinaTurmaViewSet(GestaoSecretariaMixin, viewsets.ModelViewSet):
    """ViewSet de Disciplinas por Turma. Leitura: Gestão/Secretaria | Escrita: Gestão/Secretaria"""
    queryset = DisciplinaTurma.objects.select_related('disciplina', 'turma').all()
    serializer_class = DisciplinaTurmaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['disciplina', 'turma', 'turma__ano_letivo']


class ProfessorDisciplinaTurmaViewSet(GestaoWriteFuncionarioReadMixin, viewsets.ModelViewSet):
    """ViewSet de Professor-Disciplina-Turma. Leitura: Funcionários | Escrita: Gestão"""
    queryset = ProfessorDisciplinaTurma.objects.select_related(
        'professor__usuario', 'disciplina_turma__disciplina', 'disciplina_turma__turma'
    ).all()
    serializer_class = ProfessorDisciplinaTurmaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['professor', 'disciplina_turma', 'disciplina_turma__turma', 'disciplina_turma__turma__ano_letivo']
    
    def get_queryset(self):
        qs = super().get_queryset()
        # Filtro customizado por turma
        turma = self.request.query_params.get('turma')
        if turma:
            qs = qs.filter(disciplina_turma__turma_id=turma)
        return qs


class BimestreViewSet(GestaoSecretariaWritePublicReadMixin, viewsets.ModelViewSet):
    """ViewSet de Bimestres. Leitura: Todos autenticados | Escrita: Gestão/Secretaria"""
    queryset = Bimestre.objects.all()
    serializer_class = BimestreSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['ano_letivo']


class CalendarioEscolarViewSet(GestaoWritePublicReadMixin, viewsets.ModelViewSet):
    """ViewSet de Calendário Escolar. Leitura: Todos autenticados | Escrita: Gestão"""
    queryset = CalendarioEscolar.objects.all()
    serializer_class = CalendarioEscolarSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['letivo', 'tipo']


class HabilidadeViewSet(GestaoWriteFuncionarioReadMixin, viewsets.ModelViewSet):
    """ViewSet de Habilidades. Leitura: Funcionários | Escrita: Gestão"""
    queryset = Habilidade.objects.select_related('disciplina').all()
    serializer_class = HabilidadeSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['disciplina', 'is_active']
    search_fields = ['codigo', 'descricao']

