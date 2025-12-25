# reset_db.ps1
# Automates the database reset, restore, and migration process for CEMEP Digital

# --- Configuration ---
$DB_NAME = "cemep_digital"
$DB_USER = "postgres"
$DB_PASS = "f&0(iO1F,15w"
$DB_HOST = "localhost"
$DB_PORT = "5432"

# --- Hardcoded Paths ---
$PROJECT_ROOT = "C:\Projects\cemep-digital"
$BACKEND_DIR = "$PROJECT_ROOT\backend"
$BACKUPS_DIR = "$BACKEND_DIR\db_backups"
$VENV_ACTIVATE = "$PROJECT_ROOT\.venv\Scripts\Activate.ps1"
$MANAGE_PY = "$BACKEND_DIR\manage.py"
$PYTHON_EXE = "$PROJECT_ROOT\.venv\Scripts\python.exe"
$PG_BIN = "C:\Program Files\PostgreSQL\18\bin"
$PSQL_EXE = "$PG_BIN\psql.exe"

# --- Environment Setup ---
$env:PGPASSWORD = $DB_PASS
$env:Path = "$PG_BIN;$env:Path"

Write-Host "=== Starting Database Reset Process ===" -ForegroundColor Cyan

# 1. Terminate connections and Drop Database
Write-Host "`n[1/6] Dropping existing database..." -ForegroundColor Yellow
$terminate_sql = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();"
& $PSQL_EXE -h $DB_HOST -p $DB_PORT -U $DB_USER -c $terminate_sql | Out-Null
& $PSQL_EXE -h $DB_HOST -p $DB_PORT -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error dropping database. Exiting." -ForegroundColor Red
    exit 1
}

# 2. Create Database
Write-Host "`n[2/6] Creating new database..." -ForegroundColor Yellow
& $PSQL_EXE -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error creating database. Exiting." -ForegroundColor Red
    exit 1
}

# 3. Restore Backup
Write-Host "`n[3/6] Searching for latest backup..." -ForegroundColor Yellow
# Get latest .sql file from backups directory
$latest_backup = Get-ChildItem -Path "$BACKUPS_DIR\backup_db_*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if ($latest_backup) {
    Write-Host "Found latest backup: $($latest_backup.Name)" -ForegroundColor Green
    Write-Host "Restoring database from backup..." -ForegroundColor Cyan
    
    & $PSQL_EXE -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $latest_backup.FullName
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Backup restored successfully." -ForegroundColor Green
        
        # Optimize migration history cleaning
        Write-Host "Fixing migration history inconsistency..." -ForegroundColor Yellow
        # Only delete admin to fix dependency error, preserve others like contenttypes to avoid unnecessary re-runs
        & $PSQL_EXE -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "DELETE FROM django_migrations WHERE app = 'admin';"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Successfully cleaned admin migration history." -ForegroundColor Green
        } else {
             Write-Host "CRITICAL WARNING: Failed to clean django_migrations." -ForegroundColor Red
        }
    } else {
        Write-Host "Error restoring backup." -ForegroundColor Red
        # We continue even if restore fails, effectively starting with empty DB
    }
} else {
    Write-Host "No backup files found in: $BACKUPS_DIR" -ForegroundColor Red
    Write-Host "Skipping restore step." -ForegroundColor Yellow
}

# 4. Activate Venv and Run Migrations
Write-Host "`n[4/6] Running makemigrations..." -ForegroundColor Yellow

# Execute python directly using the venv executable to avoid scope issues with Activate.ps1 in subprocess
& $PYTHON_EXE $MANAGE_PY makemigrations

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error running makemigrations." -ForegroundColor Red
    exit 1
}

Write-Host "`n[5/6] Running migrate (fake-initial)..." -ForegroundColor Yellow
& $PYTHON_EXE $MANAGE_PY migrate --fake-initial

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error running migrate." -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Database Reset Complete ===" -ForegroundColor Green
