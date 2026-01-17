Clear-Host

# Database Configuration
$DB_NAME = "cemep_digital"
$DB_USER = "postgres"
$DB_PASSWORD = "f&0(iO1F,15w"
$DB_HOST = "localhost"
$DB_PORT = "5432"

# Set environment variables for PostgreSQL commands
$env:PGUSER = $DB_USER
$env:PGPASSWORD = $DB_PASSWORD
$env:PGHOST = $DB_HOST
$env:PGPORT = $DB_PORT

Write-Host "1. Excluindo banco de dados local..." -ForegroundColor Cyan
dropdb --if-exists $DB_NAME
if ($LASTEXITCODE -ne 0) {
    Write-Host "Falha ao excluir o banco de dados. Verifique se ele está sendo usado." -ForegroundColor Red
    # Continue anyway as createdb might fail if it exists, or succeed if drop failed because it didn't exist
}

Write-Host "2. Limpando migrações antigas e __pycache__..." -ForegroundColor Cyan
$appsdata = "C:\Projects\cemep-digital\backend\apps"
Get-ChildItem -Path $appsdata -Recurse -Directory -Filter "migrations" | ForEach-Object {
    $migrationDir = $_.FullName
    Write-Host "Limpando $migrationDir" -ForegroundColor Gray
    Get-ChildItem -Path $migrationDir -File | Where-Object { $_.Name -ne "__init__.py" } | Remove-Item -Force
    
    # Garante que o __init__.py exista para o Django reconhecer como pacote de migrações
    $initFile = Join-Path $migrationDir "__init__.py"
    if (-not (Test-Path $initFile)) {
        Write-Host "Criando __init__.py em $migrationDir" -ForegroundColor Gray
        New-Item -ItemType File -Path $initFile -Force | Out-Null
    }
}

Write-Host "Limpando subdiretórios __pycache__..." -ForegroundColor Gray
Get-ChildItem -Path "C:\Projects\cemep-digital" -Recurse -Directory -Filter "__pycache__" | Remove-Item -Force -Recurse


Write-Host "3. Recriando o Banco de dados..." -ForegroundColor Cyan
createdb $DB_NAME
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro ao criar o banco de dados. Pode ser que ele já exista." -ForegroundColor Yellow
}

Write-Host "4. Acessando ambiente virtual e executando migrações..." -ForegroundColor Cyan
# We can't really "enter" the venv in a running script and stay there for subsequent commands easily in same scope if simply dot sourcing, 
# but we can rely on using the python executable from the venv or assuming the user runs this from a shell.
# However, the user explicitly asked to "Acessar ambiente virtual".
# The best way in a script is to call the Activate script, but changes to env vars stay in the process.
. "C:\Projects\cemep-digital\.venv\Scripts\Activate.ps1"

# Coloque o caminho do backend
Write-Host "5. Diretório do backend..." -ForegroundColor Cyan
Set-Location C:\Projects\cemep-digital\backend

# Cria as migrações globais
python manage.py makemigrations
if ($LASTEXITCODE -ne 0) { Write-Error "Falha em makemigrations"; exit }

python manage.py migrate
if ($LASTEXITCODE -ne 0) { Write-Error "Falha em migrate"; exit }

Write-Host "7. Criando superuser..." -ForegroundColor Cyan
$create_superuser_script = @"
import os
import django
from django.contrib.auth import get_user_model

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core_project.settings')
django.setup()


User = get_user_model()
# seu superuser aqui
username = 'diogo'
email = 'diogopelaes@gmail.com'
password = '123'
tipo = 'GESTAO'

if not User.objects.filter(username=username).exists():
    print(f'Criando superuser {username}...')
    user = User.objects.create_superuser(username=username, email=email, password=password)
    user.tipo_usuario = tipo
    user.save()
    print('Superuser criado com sucesso.')
else:
    print('Superuser já existe.')
"@

python -c "$create_superuser_script"

Write-Host "Procedimento concluído!" -ForegroundColor Green
