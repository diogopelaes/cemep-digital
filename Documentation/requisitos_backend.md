# Requisitos do Backend

## Tecnologias e Frameworks
- **Linguagem:** Python 3.14.x.
- **Framework Web:** Django REST Framework (DRF).
- **ORM:** Django ORM.
- **Servidor:** Uvicorn (ASGI).
- **Proxy/Web Server:** Caddy (Gestão SSL automática e proxy reverso).

## Configurações Principais (`settings.py`)
- **E-mail:**
    ```python
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = 'smtp.gmail.com'
    EMAIL_PORT = 587
    EMAIL_USE_TLS = True
    EMAIL_HOST_USER = 'cemep-digital@gmail.com'
    EMAIL_HOST_PASSWORD = env('EMAIL_PASSWORD') # Usar variáveis de ambiente
    DEFAULT_FROM_EMAIL = 'CEMEP Digital <cemep-digital@gmail.com>'
    ```
- **Autenticação:**
    - `REST_FRAMEWORK` configurado para usar `JSON Web Token Authentication`.
    - `SimpleJWT` recomendado para gestão de tokens (Access/Refresh).

## API Design
- **Padrão:** RESTful.
- **Endpoints:** Organizados por recurso (ex: `/api/v1/students/`, `/api/v1/grades/`).
- **Permissões (DRF Permissions):**
    - Criar permissões customizadas: `IsGestor`, `IsProfessor`, `IsStudentOwner` (aluno só vê os próprios dados).
- **Validação:** Serializers devem validar regras de negócio (ex: não permitir nota > valor da avaliação).

## Segurança de Mídia e Arquivos
- **Proteção:** Arquivos enviados (Media) não devem estar na pasta `public` do servidor web diretamente se forem sensíveis.
- **Implementação:**
    - Criar uma View no Django: `get_media_file(request, path)`.
    - Esta view verifica permissões do usuário.
    - Retorna o arquivo usando `FileResponse`.
    - Arquivos permanentes (do App `permanent`) também devem seguir esta regra de proteção.

## Scripts e Comandos
- **Management Command** para expurgo de dados: `python manage.py limpar_dados_antigos`. 
- **Lógica:** Checa alunos com `data_saida < (hoje - 1 ano)` no modelo `MatriculaCEMEP`. 
- **Ação:** Garante que o `HistoricoEscolar` e `OcorrenciaDisciplinar` estejam preenchidos no App `permanent` (usando CPF) e então deleta o `User` e `Estudante` do banco principal, disparando o `on_delete=CASCADE` nas tabelas transitórias.
