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
                    cidade=data.get('cidade', 'Mogi Guaçu'),
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
