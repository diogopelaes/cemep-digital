# CEMEP Digital - Documentação do Backend

**Última atualização:** 27/12/2024  
**Tecnologias:** Django 4, Django REST Framework, PostgreSQL, Simple JWT, django-filter, django-ckeditor

---

## 📁 Estrutura de Diretórios

```
backend/
├── core_project/            # Configuração principal do Django
│   ├── settings.py          # Configurações (DB, JWT, CORS, etc.)
│   ├── urls.py               # Roteamento raiz da API
│   ├── wsgi.py / asgi.py     # Entry points para deploy
│
├── apps/                     # Aplicações Django modulares
│   ├── users/               # Autenticação e perfis de usuário
│   ├── core/                # Cadastros base (Funcionários, Turmas, Disciplinas)
│   ├── academic/            # Vida escolar (Estudantes, Matrículas)
│   ├── pedagogical/         # Aulas, Faltas, Notas, Ocorrências
│   ├── management/          # Tarefas, Avisos, HTPC
│   └── permanent/           # Dados permanentes, Histórico escolar
│
├── media/                   # Uploads (fotos, atestados)
├── static/                  # Arquivos estáticos
├── requirements.txt         # Dependências Python
└── manage.py                # CLI do Django
```

---

## 🏗️ Arquitetura por App

Cada app Django segue a estrutura modular:

```
apps/<nome_app>/
├── models.py                # Modelos do banco de dados
├── views/                   # Pacote de ViewSets (modularizado)
│   ├── __init__.py          # Re-exporta todos os ViewSets
│   ├── <entidade>.py        # ViewSet individual
│   └── ...
├── serializers/             # Pacote de Serializers (modularizado)
│   ├── __init__.py          # Re-exporta todos os Serializers
│   ├── <entidade>.py        # Serializer individual
│   └── ...
├── urls.py                  # Rotas do app (via DefaultRouter)
├── admin.py                 # Configuração do Django Admin
├── permissions.py           # Permissões (apenas em users/)
└── validators.py            # Validadores customizados
```

---

## 👤 App Users - Autenticação e Perfis

### Modelo Principal: `User`

```python
class User(AbstractUser):
    class TipoUsuario(models.TextChoices):
        GESTAO = 'GESTAO'           # Acesso total
        SECRETARIA = 'SECRETARIA'   # Cadastros, leitura ampla
        PROFESSOR = 'PROFESSOR'     # Aulas, notas, faltas
        MONITOR = 'MONITOR'         # Leitura limitada
        ESTUDANTE = 'ESTUDANTE'     # Acesso próprio
        RESPONSAVEL = 'RESPONSAVEL' # Acesso aos filhos

    tipo_usuario = CharField(choices=TipoUsuario.choices)
    telefone = CharField()
    foto = ImageField()
    dark_mode = BooleanField()
```

### Sistema de Permissões (`permissions.py`)

| Classe Base | Perfis Permitidos |
|-------------|-------------------|
| `IsGestao` | GESTAO |
| `IsGestaoOrSecretaria` | GESTAO, SECRETARIA |
| `IsFuncionario` | GESTAO, SECRETARIA, PROFESSOR, MONITOR |
| `IsProfessor` | GESTAO, PROFESSOR |
| `IsOwnerOrGestao` | Dono do objeto OU GESTAO |

### Mixins para ViewSets

| Mixin | Escrita | Leitura |
|-------|---------|---------|
| `GestaoOnlyMixin` | GESTAO | GESTAO |
| `GestaoSecretariaMixin` | GESTAO, SECRETARIA | GESTAO, SECRETARIA |
| `GestaoSecretariaCRUMixin` | GESTAO, SECRETARIA | GESTAO, SECRETARIA (sem delete) |
| `GestaoWriteFuncionarioReadMixin` | GESTAO | Todos funcionários |
| `GestaoSecretariaWriteFuncionarioReadMixin` | GESTAO, SECRETARIA | Todos funcionários |
| `ProfessorWriteFuncionarioReadMixin` | GESTAO, PROFESSOR | Todos funcionários |
| `GestaoWritePublicReadMixin` | GESTAO | Qualquer autenticado |

**Uso em ViewSet:**
```python
from apps.users.permissions import GestaoWriteFuncionarioReadMixin

class FuncionarioViewSet(GestaoWriteFuncionarioReadMixin, viewsets.ModelViewSet):
    # Herda permissões automaticamente
    ...
```

---

## 🏢 App Core - Cadastros Base

### Modelos Principais

| Modelo | Descrição | Campos Chave |
|--------|-----------|--------------|
| `Funcionario` | Funcionário vinculado a User | `usuario`, `matricula`, `cpf`, `area_atuacao` |
| `PeriodoTrabalho` | Períodos de vínculo | `funcionario`, `data_entrada`, `data_saida` |
| `Disciplina` | Disciplina curricular | `nome`, `sigla`, `area_conhecimento`, `is_active` |
| `Curso` | Curso oferecido | `nome`, `sigla`, `is_active` |
| `Turma` | Turma de estudantes | `numero`, `letra`, `ano_letivo`, `curso`, `nomenclatura` |
| `DisciplinaTurma` | Vínculo disciplina-turma | `disciplina`, `turma`, `aulas_semanais` |
| `ProfessorDisciplinaTurma` | Atribuição de professor | `professor`, `disciplina_turma`, `tipo` |
| `Bimestre` | Período bimestral | `numero`, `data_inicio`, `data_fim`, `ano_letivo` |
| `CalendarioEscolar` | Dias letivos/não letivos | `data`, `letivo`, `tipo`, `descricao` |
| `Habilidade` | Habilidades BNCC | `codigo`, `descricao`, `disciplina` |

### Relacionamentos Importantes

```
User 1:1 Funcionario
Funcionario 1:N PeriodoTrabalho
Curso 1:N Turma
Turma N:M Disciplina (via DisciplinaTurma)
DisciplinaTurma 1:N ProfessorDisciplinaTurma
Disciplina 1:N Habilidade
```

### ViewSets Disponíveis (`views/`)

| ViewSet | Arquivo | Ações Customizadas |
|---------|---------|-------------------|
| `FuncionarioViewSet` | `funcionario.py` | `criar_completo`, `atualizar_completo`, `toggle_ativo`, `importar_arquivo`, `resetar_senha` |
| `DisciplinaViewSet` | `disciplina.py` | `toggle_active`, `importar_arquivo`, `download_modelo` |
| `CursoViewSet` | `curso.py` | `toggle_active`, `importar_arquivo`, `download_modelo` |
| `TurmaViewSet` | `turma.py` | `toggle_active`, `importar_arquivo`, `download_modelo` |
| `DisciplinaTurmaViewSet` | `disciplina_turma.py` | `importar_arquivo`, `download_modelo` |
| `ProfessorDisciplinaTurmaViewSet` | `professor_disciplina_turma.py` | - |
| `BimestreViewSet` | `bimestre.py` | - |
| `CalendarioEscolarViewSet` | `calendario.py` | - |
| `HabilidadeViewSet` | `habilidade.py` | - |

---

## 🎓 App Academic - Vida Escolar

### Modelos Principais

| Modelo | PK | Descrição |
|--------|----|-----------|
| `Estudante` | `cpf` | Estudante vinculado a User |
| `Responsavel` | `cpf` | Responsável por estudantes |
| `ResponsavelEstudante` | auto | Vínculo com parentesco |
| `MatriculaCEMEP` | `numero_matricula` | Matrícula central (10 dígitos) |
| `MatriculaTurma` | auto | Enturmação por ano letivo |
| `Atestado` | auto | Atestados médicos |

### Fluxo de Matrícula

```
Estudante → MatriculaCEMEP (1:N) → MatriculaTurma (1:N por matrícula)
                  ↓                        ↓
                Curso                    Turma
```

### ViewSets Disponíveis (`views/`)

| ViewSet | Ações Customizadas |
|---------|--------------------|
| `EstudanteViewSet` | `criar_completo`, `atualizar_completo`, `upload_foto`, `remover_foto`, `prontuario` |
| `ResponsavelViewSet` | `vincular_estudante` |
| `MatriculaCEMEPViewSet` | - |
| `MatriculaTurmaViewSet` | - |
| `AtestadoViewSet` | `download` |

---

## 📚 App Pedagogical - Ensino

### Modelos Principais

| Modelo | Descrição |
|--------|-----------|
| `PlanoAula` | Planejamento de aulas |
| `Aula` | Registro de aula dada |
| `Faltas` | Faltas por aula/estudante |
| `DescritorOcorrenciaPedagogica` | Tipos de ocorrência |
| `OcorrenciaPedagogica` | Registro de ocorrência |
| `OcorrenciaResponsavelCiente` | Ciência dos responsáveis |
| `NotaBimestral` | Notas por bimestre |
| `NotificacaoRecuperacao` | Alertas de recuperação |

### ViewSets Disponíveis (`views/`)

| ViewSet | Ações Customizadas |
|---------|--------------------|
| `PlanoAulaViewSet` | - |
| `AulaViewSet` | `lista_chamada` |
| `FaltasViewSet` | `registrar_lote` |
| `OcorrenciaPedagogicaViewSet` | - (cria notificações automaticamente) |
| `OcorrenciaResponsavelCienteViewSet` | `marcar_ciente` |
| `NotaBimestralViewSet` | `boletim` |
| `NotificacaoRecuperacaoViewSet` | `marcar_visualizado` |

---

## 📋 App Management - Gestão

### Modelos Principais

| Modelo | Descrição |
|--------|-----------|
| `Tarefa` | Tarefa atribuída a funcionários |
| `NotificacaoTarefa` | Notificação de tarefa |
| `ReuniaoHTPC` | Registro de HTPC |
| `NotificacaoHTPC` | Notificação de HTPC |
| `Aviso` | Aviso para usuários |
| `AvisoVisualizacao` | Controle de leitura |

### ViewSets com Ações Customizadas

| ViewSet | Ações |
|---------|-------|
| `TarefaViewSet` | `concluir`, `minhas_tarefas`, `relatorio` |
| `NotificacaoTarefaViewSet` | `marcar_visualizado`, `minhas_notificacoes` |
| `ReuniaoHTPCViewSet` | `registrar_presenca` |
| `AvisoViewSet` | `meus_avisos` |

---

## 📁 App Permanent - Dados Permanentes

### Modelos Principais

| Modelo | Descrição |
|--------|-----------|
| `DadosPermanenteEstudante` | Dados imutáveis do estudante |
| `DadosPermanenteResponsavel` | Dados imutáveis do responsável |
| `HistoricoEscolar` | Histórico completo |
| `HistoricoEscolarAnoLetivo` | Ano letivo do histórico |
| `HistoricoEscolarNotas` | Notas do histórico |
| `RegistroProntuario` | Registros permanentes |

---

## 🔗 Estrutura de URLs

### Roteamento Principal (`core_project/urls.py`)

```python
urlpatterns = [
    path('admin/', admin.site.urls),
    
    # JWT
    path('api/token/', TokenObtainPairView.as_view()),
    path('api/token/refresh/', TokenRefreshView.as_view()),
    
    # APIs
    path('api/v1/users/', include('apps.users.urls')),
    path('api/v1/core/', include('apps.core.urls')),
    path('api/v1/academic/', include('apps.academic.urls')),
    path('api/v1/pedagogical/', include('apps.pedagogical.urls')),
    path('api/v1/management/', include('apps.management.urls')),
    path('api/v1/permanent/', include('apps.permanent.urls')),
]
```

### Padrão de URLs por App (`apps/<app>/urls.py`)

```python
from rest_framework.routers import DefaultRouter
from .views import FuncionarioViewSet, DisciplinaViewSet, ...

router = DefaultRouter()
router.register('funcionarios', FuncionarioViewSet)
router.register('disciplinas', DisciplinaViewSet)
# ...

urlpatterns = router.urls
```

### Endpoints Base

| Prefixo | App | Exemplos |
|---------|-----|----------|
| `/api/v1/users/` | users | `/users/me/`, `/users/{id}/` |
| `/api/v1/core/` | core | `/funcionarios/`, `/turmas/`, `/disciplinas/` |
| `/api/v1/academic/` | academic | `/estudantes/`, `/matriculas-cemep/` |
| `/api/v1/pedagogical/` | pedagogical | `/aulas/`, `/notas/`, `/faltas/` |
| `/api/v1/management/` | management | `/tarefas/`, `/avisos/` |
| `/api/v1/permanent/` | permanent | `/historicos/`, `/prontuarios/` |

---

## 🔄 Fluxo de Dados

### Padrão Request → View → Serializer → Model

```
┌─────────────────┐
│    Request      │  ← HTTP Request com JWT
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    ViewSet      │  ← Permissões (via Mixin) + Lógica de negócio
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Serializer    │  ← Validação + Transformação de dados
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     Model       │  ← ORM Django → PostgreSQL
└─────────────────┘
```

### Importação de Arquivos (Padrão)

```python
@action(detail=False, methods=['post'], url_path='importar-arquivo')
@transaction.atomic
def importar_arquivo(self, request):
    file = request.FILES.get('file')
    
    # Lê CSV ou XLSX com pandas
    if file.name.endswith('.csv'):
        df = pd.read_csv(file, sep=';', dtype=str)
    else:
        df = pd.read_excel(file, dtype=str)
    
    # Processa linhas
    for idx, row in df.iterrows():
        # Cria/atualiza objetos
        obj, created = Model.objects.update_or_create(...)
    
    return Response({'created': N, 'updated': M, 'errors': [...]})
```

---

## 📋 Boas Práticas ao Desenvolver

### ✅ FAZER

1. **Usar Mixins de Permissão:**
   ```python
   class MeuViewSet(GestaoWriteFuncionarioReadMixin, viewsets.ModelViewSet):
       ...
   ```

2. **Criar ações customizadas com @action:**
   ```python
   @action(detail=True, methods=['post'], url_path='minha-acao')
   def minha_acao(self, request, pk=None):
       obj = self.get_object()
       # lógica
       return Response(...)
   ```

3. **Usar transaction.atomic para operações complexas:**
   ```python
   from django.db import transaction
   
   @transaction.atomic
   def criar_completo(self, request):
       # múltiplas operações de DB
       ...
   ```

4. **Serializers com campos read_only e write_only:**
   ```python
   class MeuSerializer(serializers.ModelSerializer):
       # Leitura (GET)
       usuario = UserSerializer(read_only=True)
       
       # Escrita (POST/PUT)
       usuario_id = serializers.PrimaryKeyRelatedField(
           queryset=User.objects.all(),
           source='usuario',
           write_only=True
       )
   ```

5. **Imports do pacote modularizado:**
   ```python
   # Ambos funcionam (graças ao __init__.py)
   from apps.core.views import FuncionarioViewSet
   from apps.core.serializers import FuncionarioSerializer
   ```

### ❌ EVITAR

1. **Permissões hard-coded em views:**
   ```python
   # ❌ NÃO FAZER
   if request.user.tipo_usuario != 'GESTAO':
       return Response({...}, status=403)
   
   # ✅ FAZER - usar Mixin
   ```

2. **Lógica de negócio em Serializers:**
   ```python
   # ❌ Serializer não deve fazer chamadas complexas
   # ✅ Mover para ViewSet ou Model
   ```

3. **Consultas N+1:**
   ```python
   # ❌ NÃO FAZER
   queryset = Model.objects.all()
   
   # ✅ FAZER
   queryset = Model.objects.select_related('usuario').prefetch_related('items')
   ```

---

## 🔧 Comandos Úteis

```bash
# Desenvolvimento
python manage.py runserver              # Inicia servidor
python manage.py check                  # Verifica erros

# Migrações
python manage.py makemigrations         # Cria migrações
python manage.py migrate                # Aplica migrações

# Shell
python manage.py shell                  # Django shell
python manage.py createsuperuser        # Criar admin
```

---

## 🗂️ Índice de Importações Rápidas

```python
# Modelos
from apps.users.models import User
from apps.core.models import Funcionario, Disciplina, Turma, Curso, DisciplinaTurma
from apps.academic.models import Estudante, Responsavel, MatriculaCEMEP, MatriculaTurma
from apps.pedagogical.models import Aula, Faltas, NotaBimestral, OcorrenciaPedagogica
from apps.management.models import Tarefa, Aviso, ReuniaoHTPC
from apps.permanent.models import HistoricoEscolar, RegistroProntuario

# Serializers
from apps.core.serializers import FuncionarioSerializer, TurmaSerializer
from apps.academic.serializers import EstudanteSerializer, MatriculaCEMEPSerializer
from apps.users.serializers import UserSerializer

# Permissões
from apps.users.permissions import (
    IsGestao, IsGestaoOrSecretaria, IsFuncionario,
    GestaoOnlyMixin, GestaoWriteFuncionarioReadMixin,
    GestaoSecretariaCRUMixin, ProfessorWriteFuncionarioReadMixin
)

# Utilitários
from apps.core.validators import validate_cpf, clean_digits
```

---

> **Nota para LLMs:** Este documento descreve a arquitetura completa do backend CEMEP Digital. Ao desenvolver novas funcionalidades:
> 1. **Models:** Defina em `apps/<app>/models.py` com validações e `clean()` methods
> 2. **Views:** Crie em `apps/<app>/views/<entidade>.py` herdando o Mixin apropriado
> 3. **Serializers:** Crie em `apps/<app>/serializers/<entidade>.py` com campos read_only e write_only
> 4. **URLs:** Registre no `apps/<app>/urls.py` via DefaultRouter
> 5. **__init__.py:** Atualize para re-exportar as novas classes
> 6. **Permissões:** Use sempre os Mixins existentes em `apps.users.permissions`
