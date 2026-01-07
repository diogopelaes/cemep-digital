"""
Controle de Acesso Centralizado - CEMEP Digital

Este módulo centraliza TODA a lógica de controle de acesso do sistema.
Organizado em:
1. Classes de Permissão (BasePermission): Verificam o tipo de usuário.
2. Mixins para ViewSets: Aplicam permissões automaticamente baseado na 'action'.

Siglas CRUD:
- C: Create (Criar)
- R: Read (Ler - List/Retrieve)
- U: Update (Atualizar - Update/Partial Update)
- D: Delete (Excluir)
"""
from rest_framework.permissions import BasePermission, IsAuthenticated


# =============================================================================
# CLASSES DE PERMISSÃO BASE (Verificam o Perfil)
# =============================================================================

class IsGestao(BasePermission):
    """
    PERFIL: GESTAO.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.tipo_usuario == 'GESTAO'


class IsGestaoOrSecretaria(BasePermission):
    """
    PERFIS: GESTAO e SECRETARIA.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.tipo_usuario in ['GESTAO', 'SECRETARIA']


class IsFuncionario(BasePermission):
    """
    PERFIS: GESTAO, SECRETARIA, PROFESSOR e MONITOR.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.tipo_usuario in [
            'GESTAO', 'SECRETARIA', 'PROFESSOR', 'MONITOR'
        ]


class IsProfessor(BasePermission):
    """
    PERFIS: GESTAO e PROFESSOR.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.tipo_usuario in ['GESTAO', 'PROFESSOR']


class IsEstudanteOrResponsavel(BasePermission):
    """
    PERFIS: ESTUDANTE e RESPONSAVEL.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.tipo_usuario in ['ESTUDANTE', 'RESPONSAVEL']


class IsOwnerOrGestao(BasePermission):
    """
    REGRA: O próprio usuário dono do dado OU alguém do perfil GESTAO.
    
    Verifica ownership em ordem:
    1. obj.usuario (Funcionario, Estudante, etc.)
    2. obj.professor.usuario (PlanoAula, onde professor é Funcionario)
    3. obj == request.user (Se o objeto for o próprio User)
    """
    def has_object_permission(self, request, view, obj):
        if request.user.tipo_usuario == 'GESTAO':
            return True
        # Check direct usuario attribute
        if hasattr(obj, 'usuario'):
            return obj.usuario == request.user
        # Check professor.usuario (for PlanoAula)
        if hasattr(obj, 'professor') and hasattr(obj.professor, 'usuario'):
            return obj.professor.usuario == request.user
        return obj == request.user


class IsOwnerProfessorStrict(BasePermission):
    """
    Permissão RESTRITA para recursos de Professor (Aula, Faltas).
    
    Regras:
    - Create: Apenas PROFESSOR
    - Read (list/retrieve): Qualquer funcionário (GESTAO, SECRETARIA, PROFESSOR, MONITOR)
    - Update/Delete: APENAS o professor proprietário — nem GESTAO pode alterar
    
    Para objetos com 'professor_disciplina_turma' (Aula):
        Verifica obj.professor_disciplina_turma.professor.usuario
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Create: apenas PROFESSOR
        if view.action == 'create':
            return request.user.tipo_usuario == 'PROFESSOR'
        
        # Read (list, retrieve e ações customizadas GET): qualquer funcionário
        if view.action in ['list', 'retrieve'] or request.method == 'GET':
            return request.user.tipo_usuario in ['GESTAO', 'SECRETARIA', 'PROFESSOR', 'MONITOR']
        
        # Update/Delete: somente professor (verificação de ownership em has_object_permission)
        return request.user.tipo_usuario == 'PROFESSOR'
    
    def has_object_permission(self, request, view, obj):
        # Read: qualquer funcionário pode ler
        if view.action == 'retrieve' or request.method == 'GET':
            return True
        
        # Update/Delete: verifica ownership estrita (sem exceção para GESTAO)
        if hasattr(obj, 'professor_disciplina_turma'):
            pdt = obj.professor_disciplina_turma
            if hasattr(pdt, 'professor') and hasattr(pdt.professor, 'usuario'):
                return pdt.professor.usuario == request.user
        
        return False


# =============================================================================
# MIXINS PARA VIEWSETS (Controle CRUD Automático)
# =============================================================================

class GestaoOnlyMixin:
    """
    Permissões:
    - GESTAO: CRUD
    - OUTROS: Sem acesso
    """
    def get_permissions(self):
        return [IsGestao()]


class GestaoSecretariaMixin:
    """
    Permissões:
    - GESTAO: CRUD
    - SECRETARIA: CRUD
    - OUTROS: Sem acesso
    """
    def get_permissions(self):
        return [IsGestaoOrSecretaria()]


class NeverAllow(BasePermission):
    """
    Permissão que sempre nega acesso.
    Usado para bloquear operações específicas (ex: delete).
    """
    def has_permission(self, request, view):
        return False


class GestaoSecretariaCRUMixin:
    """
    Permissões:
    - GESTAO/SECRETARIA: CRU (Create, Read, Update)
    - Delete: Bloqueado para TODOS
    - OUTROS: Sem acesso
    """
    def get_permissions(self):
        if self.action == 'destroy':
            return [NeverAllow()]
        return [IsGestaoOrSecretaria()]


class GestaoWriteSecretariaReadMixin:
    """
    Permissões:
    - GESTAO: CRUD
    - SECRETARIA: R (Apenas leitura)
    - OUTROS: Sem acesso
    """
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestao()]
        return [IsGestaoOrSecretaria()]


class GestaoWriteFuncionarioReadMixin:
    """
    Permissões:
    - GESTAO: CRUD
    - SECRETARIA/PROFESSOR/MONITOR: R (Apenas leitura)
    - OUTROS: Sem acesso
    """
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestao()]
        return [IsFuncionario()]


class GestaoSecretariaWriteFuncionarioReadMixin:
    """
    Permissões:
    - GESTAO/SECRETARIA: CRUD
    - PROFESSOR/MONITOR: R (Apenas leitura)
    - OUTROS: Sem acesso
    """
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestaoOrSecretaria()]
        return [IsFuncionario()]


class GestaoWritePublicReadMixin:
    """
    Permissões:
    - GESTAO: CRUD
    - QUALQUER AUTENTICADO: R (Apenas leitura)
    """
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestao()]
        return [IsAuthenticated()]


class GestaoSecretariaWritePublicReadMixin:
    """
    Permissões:
    - GESTAO/SECRETARIA: CRUD
    - QUALQUER AUTENTICADO: R (Apenas leitura)
    """
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGestaoOrSecretaria()]
        return [IsAuthenticated()]


class ProfessorWriteFuncionarioReadMixin:
    """
    Permissões:
    - GESTAO/PROFESSOR: CRUD
    - SECRETARIA/MONITOR: R (Apenas leitura)
    """
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsProfessor()]
        return [IsFuncionario()]


class FuncionarioMixin:
    """
    Permissões:
    - GESTAO/SECRETARIA/PROFESSOR/MONITOR: CRUD
    """
    def get_permissions(self):
        return [IsFuncionario()]


# =============================================================================
# MIXINS PARA FILTRO POR ANO LETIVO
# =============================================================================

class AnoLetivoFilterMixin:
    """
    Mixin para filtrar querysets pelo ano letivo selecionado do usuário.
    
    Uso: Defina `ano_letivo_field` na view para especificar o campo de filtro.
    Exemplos:
        - 'ano_letivo' para modelo Turma (campo inteiro)
        - 'turma__ano_letivo' para modelo DisciplinaTurma (via FK)
        - 'ano_letivo__ano' para modelo HorarioAula (campo FK para AnoLetivo)
    """
    ano_letivo_field = 'ano_letivo'  # Campo padrão, sobrescreva na view
    
    def get_queryset(self):
        qs = super().get_queryset()
        ano = self.request.user.get_ano_letivo_selecionado()
        if ano:
            qs = qs.filter(**{self.ano_letivo_field: ano})
        return qs
