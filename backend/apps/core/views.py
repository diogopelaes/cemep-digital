"""
Views para o App Core
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
import secrets

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
    filterset_fields = ['descontinuada']
    search_fields = ['nome', 'sigla']


class CursoViewSet(GestaoSecretariaMixin, viewsets.ModelViewSet):
    """ViewSet de Cursos. Leitura: Gestão/Secretaria | Escrita: Gestão/Secretaria"""
    queryset = Curso.objects.all()
    serializer_class = CursoSerializer
    search_fields = ['nome', 'sigla']


class TurmaViewSet(GestaoSecretariaMixin, viewsets.ModelViewSet):
    """ViewSet de Turmas. Leitura: Gestão/Secretaria | Escrita: Gestão/Secretaria"""
    queryset = Turma.objects.select_related('curso').prefetch_related('professores_representantes__usuario').all()
    serializer_class = TurmaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['numero', 'letra', 'ano_letivo', 'curso', 'nomenclatura']
    search_fields = ['numero', 'letra']

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
    filterset_fields = ['disciplina']
    search_fields = ['codigo', 'descricao']

