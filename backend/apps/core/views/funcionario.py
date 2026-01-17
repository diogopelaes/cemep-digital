"""
View para Funcionário
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
import secrets
import io
import pandas as pd
from django.http import FileResponse

from apps.core.models import Funcionario, PeriodoTrabalho
from apps.core.serializers import (
    FuncionarioSerializer, FuncionarioCreateSerializer, 
    FuncionarioCompletoSerializer, FuncionarioUpdateSerializer
)

from apps.users.models import User
from apps.users.utils import send_credentials_email


class FuncionarioViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Funcionario.
    Leitura: Gestão, Secretaria, Professor, Monitor | Escrita: Gestão
    """
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
            from apps.core.validators import validate_cpf
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
                    if email and User.objects.filter(email=email).exclude(username=matricula).exists():
                         errors.append(f"Linha {line}: Email '{email}' já está em uso por outro usuário. Ignorado.")
                         continue
                    
                    if User.objects.filter(first_name__iexact=nome).exclude(username=matricula).exists():
                         errors.append(f"Linha {line}: Nome '{nome}' já existe no sistema. Ignorado.")
                         continue

                    # 2. Dados Opcionais com Soft Validation
                    campo_cpf = str(row.get('CPF', '')).strip().replace('.', '').replace('-', '')
                    cpf_final = None
                    if campo_cpf:
                        try:
                            validate_cpf(campo_cpf)
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

                        func_defaults = {
                            'apelido': apelido,
                            'matricula': matricula,
                            'area_atuacao': row.get('AREA_ATUACAO', '').strip() or None,
                            'cin': row.get('CIN', '').strip(),
                            'nome_social': row.get('NOME_SOCIAL', '').strip(),
                            'logradouro': row.get('LOGRADOURO', '').strip(),
                            'numero': row.get('NUMERO', '').strip(),
                            'bairro': row.get('BAIRRO', '').strip(),
                            'cidade': row.get('CIDADE', '').strip() or 'Paulínia',
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
        data = {
            'NOME_COMPLETO': ['Maria Oliveira'],
            'EMAIL': ['maria@escola.com.br'],
            'MATRICULA': ['202401'],
            'TIPO_USUARIO': ['PROFESSOR'],
            'SENHA': ['123@Mudar'],
            'CPF': ['12345678900'],
            'APELIDO': ['Maria'],
            'AREA_ATUACAO': ['Matemática'],
            'CIN': ['12345'],
            'NOME_SOCIAL': [''],
            'DATA_NASCIMENTO': ['15/05/1980'],
            'LOGRADOURO': ['Rua Exemplo'],
            'NUMERO': ['123'],
            'BAIRRO': ['Centro'],
            'CIDADE': ['Paulínia'],
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
        password_plain = data['password']
        
        user = User.objects.create_user(
            username=data['username'],
            email=data.get('email', ''),
            password=password_plain,
            first_name=data['nome'],
            tipo_usuario=data['tipo_usuario'],
        )
        
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
            cidade=data.get('cidade') or 'Paulínia',
            estado=data.get('estado') or 'SP',
            cep=data.get('cep') or '',
            complemento=data.get('complemento') or '',
            telefone=data.get('telefone') or '',
            data_admissao=data.get('data_admissao'),
        )
        
        PeriodoTrabalho.objects.create(
            funcionario=funcionario,
            data_entrada=data['data_entrada'],
            data_saida=None,
        )
        
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
        
        user = funcionario.usuario
        user.first_name = data['nome']
        user.email = data.get('email', '')
        user.tipo_usuario = data['tipo_usuario']
        user.save()
        
        funcionario.matricula = data['matricula']
        funcionario.area_atuacao = data.get('area_atuacao') or None
        funcionario.apelido = data.get('apelido') or None
        funcionario.cpf = data.get('cpf') or None
        funcionario.cin = data.get('cin') or ''
        funcionario.nome_social = data.get('nome_social') or ''
        funcionario.data_nascimento = data.get('data_nascimento')
        funcionario.logradouro = data.get('logradouro') or ''
        funcionario.numero = data.get('numero') or ''
        funcionario.bairro = data.get('bairro') or ''
        funcionario.cidade = data.get('cidade') or 'Paulínia'
        funcionario.estado = data.get('estado') or 'SP'
        funcionario.cep = data.get('cep') or ''
        funcionario.complemento = data.get('complemento') or ''
        if 'telefone' in data:
            funcionario.telefone = data['telefone']
        funcionario.data_admissao = data.get('data_admissao')
        funcionario.save()
        
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
    
