"""
Views para o App Academic
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.contrib.auth import get_user_model

from .models import (
    Estudante, Responsavel, ResponsavelEstudante,
    MatriculaCEMEP, MatriculaTurma, Atestado
)
from apps.core.models import Curso
from .serializers import (
    EstudanteSerializer, EstudanteCreateSerializer,
    ResponsavelSerializer, ResponsavelCreateSerializer,
    ResponsavelEstudanteSerializer,
    MatriculaCEMEPSerializer, MatriculaTurmaSerializer,
    AtestadoSerializer
)
from apps.users.permissions import (
    GestaoSecretariaCRUMixin, 
    GestaoSecretariaWriteFuncionarioReadMixin
)
from apps.users.utils import send_credentials_email


class EstudanteViewSet(GestaoSecretariaCRUMixin, viewsets.ModelViewSet):
    """ViewSet de Estudantes. CRU: Gestão/Secretaria | Delete: Bloqueado"""
    queryset = Estudante.objects.select_related('usuario').all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['bolsa_familia', 'pe_de_meia', 'usa_onibus']
    search_fields = ['usuario__first_name', 'usuario__last_name', 'cpf', 'nome_social']
    
    def get_serializer_class(self):
        if self.action in ['create']:
            return EstudanteCreateSerializer
        return EstudanteSerializer
    
    @action(detail=False, methods=['post'], url_path='criar-completo')
    def criar_completo(self, request):
        """Cria usuário e estudante em uma transação atômica."""
        User = get_user_model()
        data = request.data
        
        # Validações básicas
        required_fields = ['username', 'password', 'first_name', 'cpf', 
                          'data_nascimento', 'logradouro', 'numero', 'bairro', 'cep']
        for field in required_fields:
            if not data.get(field):
                return Response(
                    {'detail': f'Campo obrigatório: {field}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Guarda senha antes de hash para enviar por email
        student_password = data['password']
        emails_enviados = []
        
        try:
            with transaction.atomic():
                # Cria o usuário do estudante
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
                
                # Cria o estudante
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
                    cidade=data.get('cidade', 'Mogi Guaçu'),
                    estado=data.get('estado', 'SP'),
                    cep=data['cep'],
                    complemento=data.get('complemento', ''),
                    telefone=data.get('telefone', '')
                )
                
                # Envia email para o estudante
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
                
                # Processa Responsáveis (pode ser lista ou objeto único)
                responsaveis_data = data.get('responsaveis', [])
                
                # Suporte para formato antigo (objeto único)
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
                    
                    # Senha padrão para responsável = CPF
                    resp_password = resp_cpf
                    is_new_user = False
                    
                    # Verifica/Cria Usuário do Responsável
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
                    
                    # Verifica/Cria Perfil Responsável
                    responsavel, created = Responsavel.objects.get_or_create(
                        cpf=resp_cpf,
                        defaults={
                            'usuario': resp_user,
                            'telefone': resp_telefone
                        }
                    )
                    
                    # Vincula ao Estudante (evita duplicata)
                    ResponsavelEstudante.objects.get_or_create(
                        responsavel=responsavel,
                        estudante=estudante,
                        defaults={
                            'parentesco': resp_parentesco,
                            'telefone': resp_telefone
                        }
                    )
                    
                    # Envia email apenas para novos usuários
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
                
                # Processa Matrículas
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
    
    @action(detail=True, methods=['put'], url_path='atualizar-completo')
    def atualizar_completo(self, request, pk=None):
        """Atualiza usuário e estudante em uma transação atômica."""
        estudante = self.get_object()
        data = request.data
        
        try:
            with transaction.atomic():
                # Atualiza o usuário
                user = estudante.usuario
                if 'first_name' in data:
                    user.first_name = data['first_name']
                    user.last_name = '' # Garante que last_name fique vazio se alguém mexer direto
                
                if 'email' in data:
                    user.email = data['email']
                if 'telefone' in data:
                    user.telefone = data['telefone']
                user.save()
                
                # Atualiza o estudante
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
                
                # Processa Matrículas (cria novas ou atualiza existentes)
                matriculas_data = data.get('matriculas', [])
                for mat_data in matriculas_data:
                    if not mat_data or not mat_data.get('numero_matricula') or not mat_data.get('curso_id'):
                        continue
                    
                    curso = Curso.objects.get(id=mat_data['curso_id'])
                    numero_matricula = mat_data['numero_matricula']
                    
                    # Tenta atualizar se já existe, ou cria nova
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
        
        # Valida tipo de arquivo
        allowed_types = ['image/jpeg', 'image/png', 'image/webp']
        if foto.content_type not in allowed_types:
            return Response(
                {'detail': 'Formato inválido. Use JPEG, PNG ou WebP.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Limita tamanho a 5MB
        if foto.size > 5 * 1024 * 1024:
            return Response(
                {'detail': 'A foto deve ter no máximo 5MB.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Remove foto antiga se existir
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
        estudante = self.get_object()
        
        # Dados do estudante
        dados = EstudanteSerializer(estudante).data
        
        # Matrículas
        matriculas_cemep = MatriculaCEMEPSerializer(
            estudante.matriculas_cemep.all(), many=True
        ).data
        
        # Buscar matrículas turma através do caminho correto
        matriculas_turma = MatriculaTurmaSerializer(
            MatriculaTurma.objects.filter(
                matricula_cemep__estudante=estudante
            ).select_related('turma__curso'), many=True
        ).data
        
        # Responsáveis
        responsaveis = ResponsavelEstudanteSerializer(
            ResponsavelEstudante.objects.filter(estudante=estudante).select_related('responsavel__usuario'),
            many=True
        ).data
        
        return Response({
            'estudante': dados,
            'matriculas_cemep': matriculas_cemep,
            'matriculas_turma': matriculas_turma,
            'responsaveis': responsaveis
        })


class ResponsavelViewSet(GestaoSecretariaWriteFuncionarioReadMixin, viewsets.ModelViewSet):
    """ViewSet de Responsáveis. Leitura: Funcionários | Escrita: Gestão/Secretaria"""
    queryset = Responsavel.objects.select_related('usuario').all()
    filter_backends = [DjangoFilterBackend]
    search_fields = ['usuario__first_name', 'usuario__last_name', 'usuario__email']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ResponsavelCreateSerializer
        return ResponsavelSerializer
    
    @action(detail=True, methods=['post'])
    def vincular_estudante(self, request, pk=None):
        """Vincula um estudante ao responsável."""
        responsavel = self.get_object()
        estudante_id = request.data.get('estudante_id')
        parentesco = request.data.get('parentesco')
        
        if not estudante_id or not parentesco:
            return Response(
                {'error': 'estudante_id e parentesco são obrigatórios'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        estudante = get_object_or_404(Estudante, id=estudante_id)
        
        vinculo, created = ResponsavelEstudante.objects.get_or_create(
            responsavel=responsavel,
            estudante=estudante,
            defaults={'parentesco': parentesco}
        )
        
        if not created:
            vinculo.parentesco = parentesco
            vinculo.save()
        
        return Response(ResponsavelSerializer(responsavel).data)


class MatriculaCEMEPViewSet(GestaoSecretariaWriteFuncionarioReadMixin, viewsets.ModelViewSet):
    """ViewSet de Matrículas CEMEP. Leitura: Funcionários | Escrita: Gestão/Secretaria"""
    queryset = MatriculaCEMEP.objects.select_related('estudante__usuario', 'curso').all()
    serializer_class = MatriculaCEMEPSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'curso', 'estudante']
    search_fields = ['numero_matricula', 'estudante__usuario__first_name']


class MatriculaTurmaViewSet(GestaoSecretariaWriteFuncionarioReadMixin, viewsets.ModelViewSet):
    """ViewSet de Matrículas Turma. Leitura: Funcionários | Escrita: Gestão/Secretaria"""
    queryset = MatriculaTurma.objects.select_related(
        'matricula_cemep__estudante__usuario', 'turma__curso'
    ).all()
    serializer_class = MatriculaTurmaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'turma', 'matricula_cemep', 'turma__ano_letivo']
    search_fields = ['matricula_cemep__estudante__usuario__first_name', 'matricula_cemep__numero_matricula']


class AtestadoViewSet(GestaoSecretariaWriteFuncionarioReadMixin, viewsets.ModelViewSet):
    """ViewSet de Atestados. Leitura: Funcionários | Escrita: Gestão/Secretaria"""
    queryset = Atestado.objects.select_related('usuario_alvo', 'criado_por').all()
    serializer_class = AtestadoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['usuario_alvo']
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download protegido do arquivo do atestado."""
        atestado = self.get_object()
        
        # Verifica permissões adicionais
        user = request.user
        if user.tipo_usuario not in ['GESTAO', 'SECRETARIA']:
            # Estudante só vê próprios atestados
            if hasattr(user, 'estudante') and atestado.usuario_alvo != user:
                return Response(
                    {'error': 'Acesso não autorizado'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        return FileResponse(
            atestado.arquivo.open('rb'),
            as_attachment=True,
            filename=atestado.arquivo.name.split('/')[-1]
        )

