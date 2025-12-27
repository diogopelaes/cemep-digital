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
from django.http import FileResponse, HttpResponse



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
        Importa funcionários via XLSX/CSV com suporte a todos os campos.
        Obrigatórios: NOME_COMPLETO, EMAIL, MATRICULA, TIPO_USUARIO.
        Opcionais com validação 'soft': CPF, DATA_NASCIMENTO, DATA_ADMISSAO.
        Outros opcionais: AREA_ATUACAO, CIN, NOME_SOCIAL, LOGRADOURO, NUMERO, BAIRRO, 
                          CIDADE, ESTADO, CEP, COMPLEMENTO, TELEFONE, APELIDO, SENHA.
        """
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'Arquivo não enviado.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Ler com Pandas
            if file.name.endswith('.csv'):
                try:
                    df = pd.read_csv(file, sep=';', dtype=str)
                except:
                    file.seek(0)
                    df = pd.read_csv(file, sep=',', dtype=str)
            else:
                df = pd.read_excel(file, dtype=str)
            
            df = df.fillna('')
            df.columns = [c.strip().upper() for c in df.columns]
            
            # Campos obrigatórios
            required = ['NOME_COMPLETO', 'MATRICULA', 'TIPO_USUARIO', 'EMAIL']
            missing = [c for c in required if c not in df.columns]
            if missing:
                return Response({'detail': f'Colunas obrigatórias faltando: {", ".join(missing)}'}, status=400)

            created_count = 0
            updated_count = 0
            errors = []
            warnings = []

            # Validadores auxiliares
            from .validators import validate_cpf
            from django.core.exceptions import ValidationError
            from datetime import datetime

            def parse_date(date_str):
                if not date_str: return None
                for fmt in ('%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y'):
                    try:
                        return datetime.strptime(date_str, fmt).date()
                    except ValueError:
                        continue
                return None

            for idx, row in df.iterrows():
                try:
                    line = idx + 2
                    matricula = str(row['MATRICULA']).strip()
                    nome = row['NOME_COMPLETO'].strip()
                    tipo = row['TIPO_USUARIO'].strip().upper()
                    email = row.get('EMAIL', '').strip()
                    
                    # 1. Validação Obrigatória
                    if not matricula or not nome or not tipo:
                         errors.append(f"Linha {line}: Matrícula, Nome e Tipo são obrigatórios.")
                         continue
                    
                    # Mapeamento Tipo
                    map_tipo = {
                        'GESTÃO': 'GESTAO', 'SECRETARIA': 'SECRETARIA', 
                        'PROFESSOR': 'PROFESSOR', 'MONITOR': 'MONITOR',
                        'FUNCIONÁRIO': 'FUNCIONARIO', 'GESTAO': 'GESTAO'
                    }
                    tipo_codigo = map_tipo.get(tipo, tipo)
                    
                    if tipo_codigo not in User.TipoUsuario.values:
                         errors.append(f"Linha {line}: Tipo '{tipo}' inválido.")
                         continue

                    # 1.1 Verificação de Unicidade Rigorosa (Email e Nome)
                    # Se o email já existe em OUTRO usuário (não o da matrícula atual), erro.
                    if email and User.objects.filter(email=email).exclude(username=matricula).exists():
                         errors.append(f"Linha {line}: Email '{email}' já está em uso por outro usuário. Ignorado.")
                         continue
                    
                    # Se o nome já existe em OUTRO usuário, erro.
                    if User.objects.filter(first_name__iexact=nome).exclude(username=matricula).exists():
                         errors.append(f"Linha {line}: Nome '{nome}' já existe no sistema. Ignorado.")
                         continue

                    # 2. Dados Opcionais com Soft Validation
                    campo_cpf = str(row.get('CPF', '')).strip().replace('.', '').replace('-', '')
                    cpf_final = None
                    if campo_cpf:
                        try:
                            # Validação simples de formato/existencia.
                            # Nota: validate_cpf lança ValidationError se inválido
                            validate_cpf(campo_cpf)
                            
                            # Verificar unicidade (se for novo ou se mudou)
                            # Para simplificar na importação em massa, checamos se já existe outro employee com esse CPF
                            # que não seja o atual (caso update). Como não temos o ID fácil aqui,
                            # vamos assumir: se existe e user.username != matricula, erro.
                            
                            qs_cpf = Funcionario.objects.filter(cpf=campo_cpf)
                            if qs_cpf.exists() and qs_cpf.first().usuario.username != matricula:
                                warnings.append(f"Linha {line} ({nome}): CPF {campo_cpf} já pertence a outro funcionário. Ignorado.")
                            else:
                                cpf_final = campo_cpf
                        except ValidationError:
                            warnings.append(f"Linha {line} ({nome}): CPF {campo_cpf} inválido. Ignorado.")

                    data_nasc_final = None
                    d_nasc_str = str(row.get('DATA_NASCIMENTO', '')).strip()
                    if d_nasc_str:
                        parsed = parse_date(d_nasc_str)
                        if parsed:
                            data_nasc_final = parsed
                        else:
                            warnings.append(f"Linha {line} ({nome}): Data Nascimento '{d_nasc_str}' inválida (use dd/mm/aaaa). Ignorada.")

                    data_adm_final = None
                    d_adm_str = str(row.get('DATA_ADMISSAO', '')).strip()
                    if d_adm_str:
                        parsed = parse_date(d_adm_str)
                        if parsed:
                            data_adm_final = parsed
                        else:
                            warnings.append(f"Linha {line} ({nome}): Data Admissão '{d_adm_str}' inválida (use dd/mm/aaaa). Ignorada.")

                    # 3. Preparação do Usuário
                    raw_password = str(row.get('SENHA', '')).strip()
                    should_update_password = False
                    if not raw_password:
                        # Se for criação, precisa de senha. Se for update, mantém a antiga se não vier nova.
                        # Para garantir, geramos senha se for criação.
                        try:
                            user_exists = User.objects.get(username=matricula)
                            should_update_password = False
                        except User.DoesNotExist:
                            import random, string
                            chars = string.ascii_letters + string.digits + "!@#"
                            raw_password = ''.join(random.choice(chars) for _ in range(8))
                            should_update_password = True
                    else:
                        should_update_password = True

                    sid = transaction.savepoint()
                    
                    try:
                        # -- USER --
                        user_defaults={
                            'first_name': nome,
                            'last_name': '',
                            'email': email,
                            'tipo_usuario': tipo_codigo,
                            'is_active': True
                        }
                        
                        user, user_created = User.objects.update_or_create(
                            username=matricula,
                            defaults=user_defaults
                        )
                        
                        if should_update_password:
                            user.set_password(raw_password)
                            user.save()

                        # -- FUNCIONARIO --
                        apelido = row.get('APELIDO', '').strip()
                        if not apelido:
                            apelido = nome.split(' ')[0]

                        # Campos opcionais simples (sem validação complexa além de trim)
                        func_defaults = {
                            'apelido': apelido,
                            'matricula': matricula,
                            'area_atuacao': row.get('AREA_ATUACAO', '').strip() or None,
                            'cin': row.get('CIN', '').strip(),
                            'nome_social': row.get('NOME_SOCIAL', '').strip(),
                            'logradouro': row.get('LOGRADOURO', '').strip(),
                            'numero': row.get('NUMERO', '').strip(),
                            'bairro': row.get('BAIRRO', '').strip(),
                            'cidade': row.get('CIDADE', '').strip() or 'Mogi Guaçu',
                            'estado': row.get('ESTADO', '').strip() or 'SP',
                            'cep': row.get('CEP', '').strip(),
                            'complemento': row.get('COMPLEMENTO', '').strip(),
                            'telefone': row.get('TELEFONE', '').strip(),
                            'cpf': cpf_final,
                            'data_nascimento': data_nasc_final,
                            'data_admissao': data_adm_final,
                        }

                        func, func_created = Funcionario.objects.update_or_create(
                            usuario=user,
                            defaults=func_defaults
                        )
                        
                        if func_created:
                            # Se tem data admissão definida, cria período de trabalho inicial
                            if data_adm_final:
                                PeriodoTrabalho.objects.create(
                                    funcionario=func,
                                    data_entrada=data_adm_final
                                )
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
                msg += f' {len(errors)} falhas.'
            if warnings:
                msg += f' {len(warnings)} alertas.'
            
            return Response({
                'message': msg,
                'errors': errors,
                'warnings': warnings,
                'created_count': created_count,
                'updated_count': updated_count
            })
            
        except Exception as e:
            return Response({'detail': f'Erro processando arquivo: {str(e)}'}, status=400)

    @action(detail=False, methods=['get'], url_path='download-modelo', permission_classes=[AllowAny])
    def download_modelo(self, request):
        buffer = io.BytesIO()
        # Modelo com todos os campos aceitos
        data = {
            'NOME_COMPLETO': ['Maria Oliveira'],
            'EMAIL': ['maria@escola.com.br'],
            'MATRICULA': ['202401'],
            'TIPO_USUARIO': ['PROFESSOR'],
            'SENHA': ['123@Mudar'], # Opcional
            'CPF': ['12345678900'],
            'APELIDO': ['Maria'],
            'AREA_ATUACAO': ['Matemática'],
            'CIN': ['12345'],
            'NOME_SOCIAL': [''],
            'DATA_NASCIMENTO': ['15/05/1980'],
            'LOGRADOURO': ['Rua Exemplo'],
            'NUMERO': ['123'],
            'BAIRRO': ['Centro'],
            'CIDADE': ['Mogi Guaçu'],
            'ESTADO': ['SP'],
            'CEP': ['13840000'],
            'COMPLEMENTO': ['Apto 1'],
            'TELEFONE': ['19999999999'],
            'DATA_ADMISSAO': ['01/02/2024']
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
            filename='modelo_funcionarios_completo.xlsx',
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
            # Ler arquivo com Pandas
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
            
            # Normalizar colunas
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
            
            # Cache de cursos para evitar queries repetidas
            cursos_map = {c.sigla: c for c in Curso.objects.all()}
            
            # Map Nomenclatura (Label -> Value)
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
                        
                    # Validar Curso
                    curso = cursos_map.get(sigla_curso)
                    if not curso:
                        errors.append(f"Linha {line}: Curso com sigla '{sigla_curso}' não encontrado.")
                        continue
                        
                    # Validar Nomenclatura
                    nomenclatura = nom_map.get(nom_raw)
                    if not nomenclatura:
                         errors.append(f"Linha {line}: Nomenclatura '{nom_raw}' inválida (Use Série, Ano ou Módulo).")
                         continue
                         
                    # Validar Inteiros
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
            
            # Cache Disciplinas
            disciplinas_map = {d.sigla: d for d in Disciplina.objects.all()}

            for idx, row in df.iterrows():
                try:
                    line = idx + 2
                    sigla = str(row['SIGLA_DISCIPLINA']).strip()
                    aulas_str = str(row.get('AULAS_SEMANAIS', '')).strip()
                    aulas = int(aulas_str) if aulas_str.isdigit() else 4 # Default 4

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

