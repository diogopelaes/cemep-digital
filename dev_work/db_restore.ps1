# ============================================================
# CEMEP Digital - Restauração do Banco de Dados
# ============================================================
# Este script restaura o banco PostgreSQL a partir do backup
# mais recente. Ele EXCLUI completamente o banco atual,
# recria-o e depois restaura os dados do arquivo .sql
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
Write-Host " CEMEP Digital - Restauração do Banco" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Verificar se o diretório de backup existe
if (-not (Test-Path $BACKUP_DIR)) {
    Write-Host "ERRO: Diretório de backup não encontrado: $BACKUP_DIR" -ForegroundColor Red
    exit 1
}

# Pegar o backup mais recente automaticamente
$selectedBackup = Get-ChildItem -Path $BACKUP_DIR -Filter "*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if ($null -eq $selectedBackup) {
    Write-Host "ERRO: Nenhum arquivo de backup encontrado em: $BACKUP_DIR" -ForegroundColor Red
    exit 1
}

$backupFilePath = $selectedBackup.FullName

Write-Host "Backup selecionado (mais recente):" -ForegroundColor Cyan
Write-Host "  Arquivo: $($selectedBackup.Name)" -ForegroundColor White
Write-Host "  Data: $($selectedBackup.LastWriteTime.ToString('dd/MM/yyyy HH:mm:ss'))" -ForegroundColor White
Write-Host ""

# Passo 1: Forçar desconexão de clientes
Write-Host "1. Desconectando clientes do banco..." -ForegroundColor Cyan
$terminateQuery = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();"
psql -d postgres -c $terminateQuery 2>&1 | Out-Null
Write-Host "   Clientes desconectados." -ForegroundColor Green

# Passo 2: Excluir o banco de dados existente
Write-Host "2. Excluindo banco de dados atual..." -ForegroundColor Cyan
dropdb --if-exists $DB_NAME 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "   Aviso: Problema ao excluir (pode não existir)." -ForegroundColor Yellow
}
Write-Host "   Banco de dados excluído." -ForegroundColor Green

# Passo 3: Recriar o banco de dados
Write-Host "3. Recriando banco de dados..." -ForegroundColor Cyan
createdb $DB_NAME --encoding=UTF8

if ($LASTEXITCODE -ne 0) {
    Write-Host "   ERRO: Não foi possível criar o banco de dados." -ForegroundColor Red
    exit 1
}
Write-Host "   Banco de dados criado." -ForegroundColor Green

# Passo 4: Restaurar o backup
Write-Host "4. Restaurando backup..." -ForegroundColor Cyan
Write-Host "   Isso pode levar alguns segundos..." -ForegroundColor Gray

psql -d $DB_NAME -f $backupFilePath 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host " Restauração concluída com sucesso!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "`nBanco restaurado de: $($selectedBackup.Name)" -ForegroundColor White
}
else {
    Write-Host "`n========================================" -ForegroundColor Red
    Write-Host " ERRO: Falha na restauração!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    exit 1
}
