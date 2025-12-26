# reset_db.ps1
# RESET COMPLETO DO BANCO DE DADOS LOCAL (PostgreSQL + Django)
# ⚠️ ESTE SCRIPT APAGA O BANCO cemep_digital E TODAS AS MIGRATIONS (EXCETO __init__.py)

# ============================================================
# CONFIGURAÇÕES
# ============================================================
$PROJECT_ROOT = "C:\Projects\cemep-digital"
$BACKEND_PATH = "$PROJECT_ROOT\backend"
$APPS_PATH = "$BACKEND_PATH\apps"
$VENV_ACTIVATE = "$PROJECT_ROOT\.venv\Scripts\Activate.ps1"

$DB_NAME = "cemep_digital"
$DB_USER = "postgres"
$DB_PASSWORD = "f&0(iO1F,15w"
$DB_HOST = "localhost"
$DB_PORT = "5432"

$SUPERUSER_NAME = "diogo"
$SUPERUSER_EMAIL = "diogopelaes@gmail.com"
$SUPERUSER_PASSWORD = "123"
Clear-Host
# ============================================================
# SEGURANÇA E CONTROLE DE ERROS
# ============================================================
$ErrorActionPreference = "Stop"

Write-Host "==============================================="
Write-Host " RESET COMPLETO DO BANCO DE DADOS - CEMEP "
Write-Host "==============================================="

# ============================================================
# ATIVAR AMBIENTE VIRTUAL
# ============================================================
Write-Host "[1/8] Ativando ambiente virtual..."
& $VENV_ACTIVATE

# ============================================================
# IR PARA BACKEND
# ============================================================
Set-Location $BACKEND_PATH

# ============================================================
# SETAR SENHA DO POSTGRES
# ============================================================
$env:PGPASSWORD = $DB_PASSWORD

# ============================================================
# ENCERRAR CONEXÕES ATIVAS
# ============================================================
Write-Host "[2/8] Encerrando conexões ativas no banco..."
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d postgres -c `
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME';"

# ============================================================
# DROP DATABASE
# ============================================================
Write-Host "[3/8] Excluindo banco de dados $DB_NAME..."
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d postgres -c `
    "DROP DATABASE IF EXISTS $DB_NAME;"

# ============================================================
# LIMPAR MIGRATIONS (EXCETO __init__.py)
# ============================================================
Write-Host "[4/8] Limpando migrations (exceto __init__.py)..."

Get-ChildItem -Path $APPS_PATH -Recurse -Directory -Filter "migrations" | ForEach-Object {
    Get-ChildItem -Path $_.FullName -File | Where-Object {
        $_.Name -ne "__init__.py"
    } | Remove-Item -Force
}

# ============================================================
# CREATE DATABASE
# ============================================================
Write-Host "[5/8] Criando banco de dados $DB_NAME..."
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d postgres -c `
    "CREATE DATABASE $DB_NAME;"

# ============================================================
# DJANGO MIGRATIONS
# ============================================================
Write-Host "[6/8] Gerando migrações..."
py manage.py makemigrations

Write-Host "[7/8] Aplicando migrações..."
py manage.py migrate

# ============================================================
# CRIAR SUPERUSUÁRIO AUTOMÁTICO (SEM REPL)
# ============================================================
Write-Host "[8/8] Criando superusuário automaticamente..."

py manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()

username = '$SUPERUSER_NAME'
email = '$SUPERUSER_EMAIL'
password = '$SUPERUSER_PASSWORD'

user, created = User.objects.get_or_create(
    username=username,
    defaults={
        'email': email,
        'is_staff': True,
        'is_superuser': True,
    }
)

if created:
    user.set_password(password)
    print('Superusuário criado.')
else:
    print('Superusuário já existia.')

user.is_staff = True
user.is_superuser = True
user.tipo_usuario = User.TipoUsuario.GESTAO
user.save()
"

# ============================================================
# LIMPEZA
# ============================================================
Remove-Item Env:\PGPASSWORD

Write-Host "==============================================="
Write-Host " RESET FINALIZADO COM SUCESSO "
Write-Host " Admin: http://localhost:8000/admin/"
Write-Host " Usuário: diogo | Senha: 123"
Write-Host "==============================================="
