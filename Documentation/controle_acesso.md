# Política de Controle de Acesso - CEMEP Digital

Este documento descreve como o controle de acesso é implementado e gerenciado no sistema.

## Arquitetura Centralizada

O sistema utiliza uma abordagem centralizada em `backend/apps/users/permissions.py`. Esta centralização evita que regras de negócio de segurança fiquem espalhadas pelo código, facilitando auditorias e alterações globais.

### Níveis de Acesso (Perfis)

Os perfis de usuário definidos no sistema são:
1. **GESTAO**: Acesso total ao sistema (admin).
2. **SECRETARIA**: Acesso a cadastros de alunos, turmas e cursos.
3. **PROFESSOR**: Acesso a diários, notas, faltas e planos de aula.
4. **MONITOR/FUNCIONARIO**: Acesso básico de visualização.
5. **ESTUDANTE/RESPONSAVEL**: Acesso ao boletim e ocorrências específicas.

---

## Implementação no Backend (Django Rest Framework)

Utilizamos **Mixins** que automatizam a lógica de `get_permissions` baseado na ação da API (Leitura vs. Escrita).

### Mixins Disponíveis

| Mixin | Escrita (POST/PUT/DELETE) | Leitura (GET) |
| :--- | :--- | :--- |
| `GestaoOnlyMixin` | Gestão | Gestão |
| `GestaoSecretariaMixin` | Gestão/Secretaria | Gestão/Secretaria |
| `GestaoWriteFuncionarioReadMixin` | Gestão | Todos Funcionários |
| `GestaoSecretariaWriteFuncionarioReadMixin` | Gestão/Secretaria | Todos Funcionários |
| `ProfessorWriteFuncionarioReadMixin` | Professores/Gestão | Todos Funcionários |
| `GestaoWritePublicReadMixin` | Gestão | Qualquer Autenticado |

### Exemplo de Uso

```python
from apps.users.permissions import GestaoSecretariaMixin

class TurmaViewSet(GestaoSecretariaMixin, viewsets.ModelViewSet):
    # O Mixin cuida de bloquear Professores/Alunos automaticamente
    queryset = Turma.objects.all()
```

---

## Implementação no Frontend (React)

O controle no frontend é feito de duas formas:

1. **Menu Dinâmico**: O `MainLayout.jsx` renderiza apenas as rotas permitidas para o perfil do usuário logado através da variável `menuItems`.
2. **ProtectedRoute** (Em implementação): Componente que impede o acesso via URL direta para páginas não autorizadas.

---

## Como Alterar uma Permissão

Para alterar quem pode acessar uma funcionalidade:
1. Localize a ViewSet no backend.
2. Altere o Mixin na declaração da classe.
3. Se for uma regra nova, crie a classe de permissão base ou um novo mixin em `apps/users/permissions.py`.

> **Nota de Segurança**: Nunca confie apenas no frontend para esconder botões. A validação real deve sempre ocorrer no backend através dos mixins de permissão.
