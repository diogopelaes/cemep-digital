"""
View para Estudante
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.contrib.auth import get_user_model

from apps.academic.models import (
    Estudante, Responsavel, ResponsavelEstudante,
    MatriculaCEMEP, MatriculaTurma
)
from apps.core.models import Curso
from apps.academic.serializers import (
    EstudanteSerializer, EstudanteCreateSerializer,
    ResponsavelEstudanteSerializer, MatriculaCEMEPSerializer,
    MatriculaTurmaSerializer
)
from apps.users.permissions import GestaoSecretariaCRUMixin
from apps.users.utils import send_credentials_email


class EstudanteViewSet(GestaoSecretariaCRUMixin, viewsets.ModelViewSet):
    """ViewSet de Estudantes. CRU: Gestão/Secretaria | Delete: Bloqueado"""
    queryset = Estudante.objects.select_related('usuario').all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['bolsa_familia', 'pe_de_meia', 'usa_onibus']
    search_fields = ['usuario__first_name', 'usuario__last_name', 'cpf', 'nome_social']

    def destroy(self, request, *args, **kwargs):
        return Response({'detail': 'A exclusão de registros não é permitida.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
    
    def get_serializer_class(self):
        if self.action in ['create']:
            return EstudanteCreateSerializer
        return EstudanteSerializer
    
    @action(detail=False, methods=['post'], url_path='criar-completo')
    def criar_completo(self, request):
        """Cria usuário e estudante em uma transação atômica."""
        User = get_user_model()
        data = request.data
        
        required_fields = ['username', 'password', 'first_name', 'cpf', 
                          'data_nascimento', 'logradouro', 'numero', 'bairro', 'cep']
        for field in required_fields:
            if not data.get(field):
                return Response(
                    {'detail': f'Campo obrigatório: {field}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        student_password = data['password']
        emails_enviados = []
        
        try:
            with transaction.atomic():
                user = User(
                    username=data['username'],
                    email=data.get('email', ''),
                    first_name=data['first_name'],
                    last_name='',
                    telefone=data.get('telefone', ''),
                    tipo_usuario='ESTUDANTE'
                )
                user.set_password(student_password)
                user.save()
                
                estudante = Estudante.objects.create(
                    usuario=user,
                    cpf=data['cpf'],
                    cin=data.get('cin', ''),
                    nome_social=data.get('nome_social', ''),
                    data_nascimento=data['data_nascimento'],
                    bolsa_familia=data.get('bolsa_familia', False),
                    pe_de_meia=data.get('pe_de_meia', True),
                    usa_onibus=data.get('usa_onibus', True),
                    linha_onibus=data.get('linha_onibus', ''),
                    permissao_sair_sozinho=data.get('permissao_sair_sozinho', False),
                    logradouro=data['logradouro'],
                    numero=data['numero'],
                    bairro=data['bairro'],
                    cidade=data.get('cidade', 'Paulínia'),
                    estado=data.get('estado', 'SP'),
                    cep=data['cep'],
                    complemento=data.get('complemento', ''),
                    telefone=data.get('telefone', '')
                )
                
                if user.email:
                    result = send_credentials_email(
                        email=user.email,
                        nome=data['first_name'],
                        username=data['username'],
                        password=student_password,
                        tipo_usuario='ESTUDANTE'
                    )
                    if result['success']:
                        emails_enviados.append(f"Estudante: {user.email}")
                
                responsaveis_data = data.get('responsaveis', [])
                if data.get('responsavel'):
                    responsaveis_data.append(data['responsavel'])
                
                for resp_data in responsaveis_data:
                    if not resp_data or not resp_data.get('cpf'):
                        continue
                    
                    resp_cpf = resp_data.get('cpf')
                    resp_nome = resp_data.get('nome', '')
                    resp_telefone = resp_data.get('telefone', '')
                    resp_email = resp_data.get('email', '')
                    resp_parentesco = resp_data.get('parentesco', 'OUTRO')
                    resp_password = resp_cpf
                    is_new_user = False
                    
                    resp_user = User.objects.filter(username=resp_cpf).first()
                    if not resp_user:
                        is_new_user = True
                        resp_user = User(
                            username=resp_cpf,
                            email=resp_email,
                            first_name=resp_nome,
                            last_name='',
                            tipo_usuario='RESPONSAVEL',
                            telefone=resp_telefone
                        )
                        resp_user.set_password(resp_password)
                        resp_user.save()
                    
                    responsavel, created = Responsavel.objects.get_or_create(
                        cpf=resp_cpf,
                        defaults={
                            'usuario': resp_user,
                            'telefone': resp_telefone
                        }
                    )
                    
                    ResponsavelEstudante.objects.get_or_create(
                        responsavel=responsavel,
                        estudante=estudante,
                        defaults={
                            'parentesco': resp_parentesco,
                            'telefone': resp_telefone
                        }
                    )
                    
                    if is_new_user and resp_email:
                        result = send_credentials_email(
                            email=resp_email,
                            nome=resp_nome,
                            username=resp_cpf,
                            password=resp_password,
                            tipo_usuario='RESPONSAVEL'
                        )
                        if result['success']:
                            emails_enviados.append(f"Responsável: {resp_email}")
                
                matriculas_data = data.get('matriculas', [])
                for mat_data in matriculas_data:
                    if not mat_data or not mat_data.get('numero_matricula') or not mat_data.get('curso_id'):
                        continue
                    
                    curso = Curso.objects.get(id=mat_data['curso_id'])
                    
                    MatriculaCEMEP.objects.create(
                        numero_matricula=mat_data['numero_matricula'],
                        estudante=estudante,
                        curso=curso,
                        data_entrada=mat_data['data_entrada'],
                        data_saida=mat_data.get('data_saida') or None,
                        status=mat_data.get('status', 'MATRICULADO')
                    )
                
                response_data = EstudanteSerializer(estudante).data
                response_data['emails_enviados'] = emails_enviados
                
                return Response(response_data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
            
    @action(detail=False, methods=['post'], url_path='importar-arquivo')
    @transaction.atomic
    def importar_arquivo(self, request):
        """
        Importa estudantes via XLSX/CSV.
        Obrigatórios: NOME_COMPLETO, EMAIL, CPF.
        Opcionais: SENHA, CIN, LINHA_ONIBUS, LOGRADOURO, NUMERO, BAIRRO, 
                   CIDADE, ESTADO, CEP, COMPLEMENTO, TELEFONE.
        """
        import pandas as pd
        from django.core.exceptions import ValidationError
        from apps.core.validators import validate_cpf, clean_digits
        import secrets
        import string

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
            required = ['NOME_COMPLETO', 'EMAIL', 'CPF']
            missing = [c for c in required if c not in df.columns]
            if missing:
                return Response({'detail': f'Colunas obrigatórias faltando: {", ".join(missing)}'}, status=400)

            created_count = 0
            updated_count = 0
            errors = []
            warnings = []

            User = get_user_model()

            for idx, row in df.iterrows():
                try:
                    line = idx + 2
                    nome = row['NOME_COMPLETO'].strip()
                    email = row.get('EMAIL', '').strip()
                    cpf_raw = str(row.get('CPF', '')).strip()
                    
                    # 1. Validação Obrigatória
                    if not nome or not email or not cpf_raw:
                         errors.append(f"Linha {line} ({nome or 'Sem Nome'}): Nome, Email e CPF são obrigatórios.")
                         continue
                    
                    cpf_clean = clean_digits(cpf_raw)
                    
                    # Validação de CPF
                    try:
                        validate_cpf(cpf_clean)
                    except ValidationError:
                        errors.append(f"Linha {line} ({nome}): Atributo 'CPF' com valor '{cpf_raw}' é inválido.")
                        continue

                    # 1.1 Verificação de Unicidade Rigorosa (Email e Username/CPF)
                    # Username será o CPF
                    if User.objects.filter(email=email).exclude(username=cpf_clean).exists():
                         errors.append(f"Linha {line} ({nome}): Atributo 'Email' com valor '{email}' já está em uso por outro usuário. Ignorado.")
                         continue
                    
                    # Se usuário existe com outro username mas mesmo CPF (teoricamente username==cpf, mas...)
                    # Aqui assumimos username=cpf.

                    # 1.2 Validação de Tamanho de Campos (CEP)
                    cep_raw = str(row.get('CEP', '')).strip()
                    cep_clean = clean_digits(cep_raw)
                    if len(cep_clean) > 8:
                         errors.append(f"Linha {line} ({nome}): Atributo 'CEP' com valor '{cep_raw}' é inválido (contém {len(cep_clean)} dígitos, máximo é 8).")
                         continue

                    # 2. Preparação do Usuário
                    raw_password = str(row.get('SENHA', '')).strip()
                    should_update_password = False
                    
                    try:
                        user = User.objects.get(username=cpf_clean)
                        # Se usuário existe, não mudamos senha a menos que explícito? 
                        # Na regra do user: "senha (se estiver em branco deve ser gerada uma aleatória)"
                        # Geralmente em update se senha ta em branco mantemos a antiga.
                        if raw_password:
                             should_update_password = True
                    except User.DoesNotExist:
                        # Novo usuário
                        if not raw_password:
                            chars = string.ascii_letters + string.digits + "!@#"
                            raw_password = ''.join(secrets.choice(chars) for _ in range(8))
                        should_update_password = True

                    sid = transaction.savepoint()
                    
                    try:
                        # -- USER --
                        user_defaults={
                            'first_name': nome,
                            'last_name': '',
                            'email': email,
                            'tipo_usuario': 'ESTUDANTE',
                            'is_active': True
                        }
                        
                        user, user_created = User.objects.update_or_create(
                            username=cpf_clean,
                            defaults=user_defaults
                        )
                        
                        if should_update_password:
                            user.set_password(raw_password)
                            user.save()

                        # -- ESTUDANTE --
                        # Lógica da Linha de Ônibus
                        linha_onibus = row.get('LINHA_ONIBUS', '').strip()
                        usa_onibus = bool(linha_onibus)
                        
                        estudante_defaults = {
                            'cin': row.get('CIN', '').strip(),
                            'linha_onibus': linha_onibus,
                            'usa_onibus': usa_onibus,
                            'logradouro': row.get('LOGRADOURO', '').strip(),
                            'numero': row.get('NUMERO', '').strip(),
                            'bairro': row.get('BAIRRO', '').strip(),
                            'cidade': row.get('CIDADE', '').strip() or 'Paulínia',
                            'estado': row.get('ESTADO', '').strip() or 'SP',
                            'cep': clean_digits(row.get('CEP', '').strip()),
                            'complemento': row.get('COMPLEMENTO', '').strip(),
                            'telefone': clean_digits(row.get('TELEFONE', '').strip()),
                            # Campos obrigatórios do model que não estão no excel, precisamos de defaults
                            'data_nascimento': '2000-01-01', # Default temporário seguro ou erro?
                            # O user não pediu data de nascimento no excel. 
                            # O model define data_nascimento como obrigatório.
                            # Vou colocar um default e avisar no warning, ou falhar?
                            # O user pediu para seguir o padrao. No funcionario, data_nascimento é opcional no excel e tem soft valid.
                            # Mas aqui User não listou Data Nascimento no requirements.
                            # Vou usar um default '2000-01-01' e adicionar um warning se for criação nova.
                        }
                        
                        # Se for update, mantemos a data existente se não informada (mas não tem coluna no excel proposta pelo user)
                        # Se for create, precisamos de uma data.
                        if user_created or not Estudante.objects.filter(cpf=cpf_clean).exists():
                             # Tentando pegar data nascimento de coluna extra se existir, senão default
                             d_nasc = row.get('DATA_NASCIMENTO', '').strip()
                             if d_nasc:
                                 # Tentar parsear
                                 from datetime import datetime
                                 for fmt in ('%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y'):
                                    try:
                                        estudante_defaults['data_nascimento'] = datetime.strptime(d_nasc, fmt).date()
                                        break
                                    except ValueError:
                                        pass
                             
                             if 'data_nascimento' not in estudante_defaults or not estudante_defaults['data_nascimento']:
                                  estudante_defaults['data_nascimento'] = '2000-01-01'
                                  warnings.append(f"Linha {line} ({nome}): Data Nascimento não fornecida. Definida como 01/01/2000.")

                        estudante, est_created = Estudante.objects.update_or_create(
                            cpf=cpf_clean,
                            defaults={**estudante_defaults, 'usuario': user}
                        )
                        
                        if est_created:
                            created_count += 1
                        else:
                            updated_count += 1
                        
                        # -- MATRICULA CEMEP --
                        numero_matricula_raw = str(row.get('NUMERO_MATRICULA', '')).strip()
                        curso_sigla = str(row.get('CURSO_SIGLA', '')).strip().upper()
                        data_entrada_curso = str(row.get('DATA_ENTRADA_CURSO', '')).strip()
                        data_saida_curso = str(row.get('DATA_SAIDA_CURSO', '')).strip()
                        status_matricula = str(row.get('STATUS_MATRICULA', '')).strip().upper()

                        if numero_matricula_raw and curso_sigla and data_entrada_curso and status_matricula:
                            from apps.academic.models import MatriculaCEMEP
                            from datetime import datetime
                            import re as regex_import

                            # Limpa matricula mantendo X/x e converte para maiúsculo
                            numero_matricula_clean = regex_import.sub(r'[^0-9Xx]', '', str(numero_matricula_raw)).upper()

                            # Validar: precisa ter pelo menos 1 caractere válido
                            if not numero_matricula_clean:
                                warnings.append(f"Linha {line} ({nome}): Atributo 'NUMERO_MATRICULA' com valor '{numero_matricula_raw}' inválido. Matrícula não criada.")
                            else:
                                # Buscar curso pela sigla
                                try:
                                    curso_obj = Curso.objects.get(sigla__iexact=curso_sigla)
                                except Curso.DoesNotExist:
                                    warnings.append(f"Linha {line} ({nome}): Atributo 'CURSO_SIGLA' com valor '{curso_sigla}' não encontrado. Matrícula não criada.")
                                    curso_obj = None
                                
                                if curso_obj:
                                    # Parsear data de entrada
                                    data_entrada_parsed = None
                                    for fmt in ('%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y'):
                                        try:
                                            data_entrada_parsed = datetime.strptime(data_entrada_curso, fmt).date()
                                            break
                                        except ValueError:
                                            pass
                                    
                                    if not data_entrada_parsed:
                                        warnings.append(f"Linha {line} ({nome}): Atributo 'DATA_ENTRADA_CURSO' com valor '{data_entrada_curso}' inválido. Matrícula não criada.")
                                    else:
                                        # Parsear data de saida (opcional)
                                        data_saida_parsed = None
                                        if data_saida_curso:
                                            for fmt in ('%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y'):
                                                try:
                                                    data_saida_parsed = datetime.strptime(data_saida_curso, fmt).date()
                                                    break
                                                except ValueError:
                                                    pass
                                            if not data_saida_parsed:
                                                warnings.append(f"Linha {line} ({nome}): Atributo 'DATA_SAIDA_CURSO' com valor '{data_saida_curso}' inválido. Ignorado.")
                                        
                                        # Validar status
                                        valid_statuses = ['MATRICULADO', 'CONCLUIDO', 'ABANDONO', 'TRANSFERIDO', 'OUTRO']
                                        if status_matricula not in valid_statuses:
                                            warnings.append(f"Linha {line} ({nome}): Atributo 'STATUS_MATRICULA' com valor '{status_matricula}' inválido. Use: {', '.join(valid_statuses)}. Matrícula não criada.")
                                        else:
                                            # Criar ou atualizar matricula
                                            MatriculaCEMEP.objects.update_or_create(
                                                numero_matricula=numero_matricula_clean,
                                                defaults={
                                                    'estudante': estudante,
                                                    'curso': curso_obj,
                                                    'data_entrada': data_entrada_parsed,
                                                    'data_saida': data_saida_parsed,
                                                    'status': status_matricula
                                                }
                                            )
                        elif numero_matricula_raw or curso_sigla or data_entrada_curso or status_matricula:
                            # Se algum campo de matricula foi preenchido, mas não todos obrigatórios
                            missing_fields = []
                            if not numero_matricula_raw:
                                missing_fields.append('NUMERO_MATRICULA')
                            if not curso_sigla:
                                missing_fields.append('CURSO_SIGLA')
                            if not data_entrada_curso:
                                missing_fields.append('DATA_ENTRADA_CURSO')
                            if not status_matricula:
                                missing_fields.append('STATUS_MATRICULA')
                            warnings.append(f"Linha {line} ({nome}): Campos de matrícula incompletos. Faltando: {', '.join(missing_fields)}. Matrícula não criada.")

                        transaction.savepoint_commit(sid)

                    except Exception as ie:
                        transaction.savepoint_rollback(sid)
                        raise ie 
                        
                except Exception as e:
                    error_name = row.get('NOME_COMPLETO', 'Sem Nome') if 'row' in locals() else 'Sem Nome'
                    errors.append(f"Linha {idx + 2} ({error_name}): {str(e)}")

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

    @action(detail=False, methods=['get'], url_path='download-modelo')
    def download_modelo(self, request):
        import io
        import pandas as pd
        from django.http import FileResponse
        from openpyxl.utils import get_column_letter

        buffer = io.BytesIO()
        data = {
            # Dados do Estudante
            'NOME_COMPLETO': ['João da Silva'],
            'EMAIL': ['joao@escola.com.br'],
            'SENHA': ['123@Mudar'],
            'CPF': ['12345678900'],
            'DATA_NASCIMENTO': ['01/01/2010'],
            'CIN': ['12345'],
            'LINHA_ONIBUS': ['Linha 10'],
            'LOGRADOURO': ['Rua Exemplo'],
            'NUMERO': ['123'],
            'BAIRRO': ['Centro'],
            'CIDADE': ['Paulínia'],
            'ESTADO': ['SP'],
            'CEP': ['13840000'],
            'COMPLEMENTO': ['Casa'],
            'TELEFONE': ['19999999999'],
            # Dados da Matrícula CEMEP
            'NUMERO_MATRICULA': ['2024010001'],
            'CURSO_SIGLA': ['ADM'],
            'DATA_ENTRADA_CURSO': ['01/02/2024'],
            'DATA_SAIDA_CURSO': [''],
            'STATUS_MATRICULA': ['MATRICULADO'],
        }
        df = pd.DataFrame(data)
        
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            df.to_excel(writer, index=False)
            ws = writer.sheets['Sheet1']
            # Ajustar largura das colunas dinamicamente
            for i, col_name in enumerate(df.columns):
                col_letter = get_column_letter(i + 1)
                # Largura baseada no tamanho do header ou do valor de exemplo
                max_len = max(len(str(col_name)), len(str(df[col_name].iloc[0])) if len(df) > 0 else 0)
                ws.column_dimensions[col_letter].width = max(max_len + 2, 15)

        buffer.seek(0)
        return FileResponse(
            buffer, 
            as_attachment=True, 
            filename='modelo_estudantes.xlsx',
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    
    @action(detail=True, methods=['put'], url_path='atualizar-completo')
    def atualizar_completo(self, request, pk=None):
        """Atualiza usuário e estudante em uma transação atômica."""
        estudante = self.get_object()
        data = request.data
        
        try:
            with transaction.atomic():
                user = estudante.usuario
                if 'first_name' in data:
                    user.first_name = data['first_name']
                    user.last_name = ''
                
                if 'email' in data:
                    user.email = data['email']
                if 'telefone' in data:
                    user.telefone = data['telefone']
                user.save()
                
                campos_estudante = [
                    'cin', 'nome_social', 'data_nascimento',
                    'bolsa_familia', 'pe_de_meia', 'usa_onibus', 'linha_onibus',
                    'permissao_sair_sozinho', 'logradouro', 'numero', 'bairro',
                    'cidade', 'estado', 'cep', 'complemento', 'telefone'
                ]
                for campo in campos_estudante:
                    if campo in data:
                        setattr(estudante, campo, data[campo])
                estudante.save()
                
                matriculas_data = data.get('matriculas', [])
                for mat_data in matriculas_data:
                    if not mat_data or not mat_data.get('numero_matricula') or not mat_data.get('curso_id'):
                        continue
                    
                    curso = Curso.objects.get(id=mat_data['curso_id'])
                    numero_matricula = mat_data['numero_matricula']
                    
                    matricula, created = MatriculaCEMEP.objects.update_or_create(
                        numero_matricula=numero_matricula,
                        defaults={
                            'estudante': estudante,
                            'curso': curso,
                            'data_entrada': mat_data['data_entrada'],
                            'data_saida': mat_data.get('data_saida') or None,
                            'status': mat_data.get('status', 'MATRICULADO')
                        }
                    )
                
                return Response(EstudanteSerializer(estudante).data)
        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'], url_path='upload-foto')
    def upload_foto(self, request, pk=None):
        """Faz upload da foto 3x4 do estudante (salva no User associado)."""
        estudante = self.get_object()
        user = estudante.usuario
        
        if 'foto' not in request.FILES:
            return Response(
                {'detail': 'Nenhuma foto enviada'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        foto = request.FILES['foto']
        
        allowed_types = ['image/jpeg', 'image/png', 'image/webp']
        if foto.content_type not in allowed_types:
            return Response(
                {'detail': 'Formato inválido. Use JPEG, PNG ou WebP.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if foto.size > 5 * 1024 * 1024:
            return Response(
                {'detail': 'A foto deve ter no máximo 5MB.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if user.foto:
            user.foto.delete(save=False)
        
        user.foto = foto
        user.save()
        
        return Response({
            'detail': 'Foto atualizada com sucesso!',
            'foto': request.build_absolute_uri(user.foto.url) if user.foto else None
        })
    
    @action(detail=True, methods=['delete'], url_path='remover-foto')
    def remover_foto(self, request, pk=None):
        """Remove a foto 3x4 do estudante."""
        estudante = self.get_object()
        user = estudante.usuario
        
        if user.foto:
            user.foto.delete(save=False)
            user.foto = None
            user.save()
        
        return Response({'detail': 'Foto removida com sucesso!'})
    
    @action(detail=True, methods=['get'])
    def prontuario(self, request, pk=None):
        """Retorna o prontuário completo do estudante."""
        from apps.core.models import DisciplinaTurma, ProfessorDisciplinaTurma
        
        estudante = self.get_object()
        
        dados = EstudanteSerializer(estudante).data
        
        matriculas_cemep = MatriculaCEMEPSerializer(
            estudante.matriculas_cemep.all(), many=True
        ).data
        
        matriculas_turma_qs = MatriculaTurma.objects.filter(
            matricula_cemep__estudante=estudante
        ).select_related('turma__curso')
        
        matriculas_turma = MatriculaTurmaSerializer(
            matriculas_turma_qs, many=True
        ).data
        
        responsaveis = ResponsavelEstudanteSerializer(
            ResponsavelEstudante.objects.filter(estudante=estudante).select_related('responsavel__usuario'),
            many=True
        ).data
        
        grade_disciplinas = []
        turmas_cursando = matriculas_turma_qs.filter(status='CURSANDO')
        
        for mat_turma in turmas_cursando:
            turma = mat_turma.turma
            disciplinas_turma = DisciplinaTurma.objects.filter(
                turma=turma
            ).select_related('disciplina').prefetch_related(
                'professores__professor__usuario'
            )
            
            disciplinas_list = []
            for dt in disciplinas_turma:
                professores_list = []
                for pdt in dt.professores.all():
                    prof = pdt.professor
                    professores_list.append({
                        'id': prof.id,
                        'nome': prof.usuario.get_full_name(),
                        'apelido': prof.apelido or prof.usuario.first_name,
                        'tipo': pdt.tipo,
                        'tipo_display': pdt.get_tipo_display(),
                    })
                
                disciplinas_list.append({
                    'id': dt.disciplina.id,
                    'nome': dt.disciplina.nome,
                    'sigla': dt.disciplina.sigla,
                    'aulas_semanais': dt.aulas_semanais,
                    'professores': professores_list,
                })
            
            grade_disciplinas.append({
                'turma_id': turma.id,
                'turma_nome': turma.nome_completo,
                'curso': turma.curso.nome if turma.curso else None,
                'ano_letivo': turma.ano_letivo,
                'disciplinas': disciplinas_list,
            })
        
        return Response({
            'estudante': dados,
            'matriculas_cemep': matriculas_cemep,
            'matriculas_turma': matriculas_turma,
            'responsaveis': responsaveis,
            'grade_disciplinas': grade_disciplinas,
        })
