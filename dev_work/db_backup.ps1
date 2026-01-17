# ============================================================
# CEMEP Digital - Backup do Banco de Dados
# ============================================================
# Este script faz o backup do banco PostgreSQL
# O arquivo é salvo em C:\Projects\cemep-digital\db_backup
# com nome contendo data e hora para fácil identificação
# ============================================================

Clear-Host

# Database Configuration
$DB_NAME = "cemep_digital"
$DB_USER = "postgres"
$DB_PASSWORD = "f&0(iO1F,15w"
$DB_HOST = "localhost"
$DB_PORT = "5432"

# Backup Configuration
$PROJECT_ROOT = "C:\Projects\cemep-digital"
$BACKUP_DIR = "$PROJECT_ROOT\db_backup"

# Set environment variables for PostgreSQL commands
$env:PGUSER = $DB_USER
$env:PGPASSWORD = $DB_PASSWORD
$env:PGHOST = $DB_HOST
$env:PGPORT = $DB_PORT

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " CEMEP Digital - Backup do Banco" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Criar diretório de backup se não existir
if (-not (Test-Path $BACKUP_DIR)) {
    Write-Host "Criando diretório de backup: $BACKUP_DIR" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
}

# Gerar nome do arquivo com data e hora
# Formato: cemep_digital_YYYYMMDD_HHmmss.sql
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFileName = "${DB_NAME}_${timestamp}.sql"
$backupFilePath = Join-Path $BACKUP_DIR $backupFileName

Write-Host "1. Iniciando backup do banco de dados..." -ForegroundColor Cyan
Write-Host "   Banco: $DB_NAME" -ForegroundColor Gray
Write-Host "   Host: $DB_HOST`:$DB_PORT" -ForegroundColor Gray
Write-Host "   Arquivo: $backupFileName" -ForegroundColor Gray

# Executar pg_dump
Write-Host "`n2. Executando pg_dump..." -ForegroundColor Cyan
pg_dump --clean --create --if-exists --format=plain --encoding=UTF8 $DB_NAME -f $backupFilePath

if ($LASTEXITCODE -eq 0) {
    $fileInfo = Get-Item $backupFilePath
    $fileSizeKB = [math]::Round($fileInfo.Length / 1KB, 2)
    
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host " Backup concluído com sucesso!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "`nDetalhes do backup:" -ForegroundColor Cyan
    Write-Host "  Arquivo: $backupFileName" -ForegroundColor White
    Write-Host "  Caminho: $backupFilePath" -ForegroundColor White
    Write-Host "  Tamanho: $fileSizeKB KB" -ForegroundColor White
    Write-Host "  Data/Hora: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')" -ForegroundColor White
    
    # Listar últimos backups
    Write-Host "`nÚltimos backups disponíveis:" -ForegroundColor Cyan
    Get-ChildItem -Path $BACKUP_DIR -Filter "*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -First 5 | ForEach-Object {
        $size = [math]::Round($_.Length / 1KB, 2)
        Write-Host "  $($_.Name) ($size KB)" -ForegroundColor Gray
    }
}
else {
    Write-Host "`n========================================" -ForegroundColor Red
    Write-Host " ERRO: Falha ao criar backup!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Verifique:" -ForegroundColor Yellow
    Write-Host "  - Se o PostgreSQL está em execução" -ForegroundColor Yellow
    Write-Host "  - Se as credenciais estão corretas" -ForegroundColor Yellow
    Write-Host "  - Se o banco '$DB_NAME' existe" -ForegroundColor Yellow
    exit 1
}
