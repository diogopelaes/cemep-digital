Clear-Host

# ============================================================
# ATENÇÃO – EXECUÇÃO DE SCRIPTS NO POWERSHELL
# ============================================================
# Para que este arquivo .ps1 possa ser executado, o PowerShell
# precisa permitir a execução de scripts.
#
# Caso este script não execute, abra o PowerShell COMO USUÁRIO
# NORMAL (não precisa ser administrador) e execute:
#
#   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
#
# Explicação:
# - Scope CurrentUser : altera apenas para o usuário atual
# - RemoteSigned     : permite scripts locais sem assinatura
#
# Para verificar a política atual:
#   Get-ExecutionPolicy -List
#
# ============================================================


# ============================================================
# CONFIGURAÇÕES DO PROJETO (AJUSTE CONFORME O SEU COMPUTADOR)
# ============================================================

# Caminho raiz do projeto (onde estão as pastas backend e frontend)
# Caminho de onde vc clonou o repo
$PROJECT_ROOT = "C:\Projects\cemep-digital"

# Caminho do backend (Django)
$BACKEND_PATH = Join-Path $PROJECT_ROOT "backend"

# Caminho do frontend (React / Vite / etc.)
$FRONTEND_PATH = Join-Path $PROJECT_ROOT "frontend"

# Caminho do script de ativação do ambiente virtual Python
# O ambiente virtual (.venv) deve existir nesse caminho
$VENV_ACTIVATE = Join-Path $PROJECT_ROOT ".venv\Scripts\Activate.ps1"

# Comando para iniciar o backend
# Pode alterar a porta ou parâmetros se necessário
$BACKEND_COMMAND = "py manage.py runserver"

# Comando para iniciar o frontend
# Ajuste conforme o script definido no package.json
$FRONTEND_COMMAND = "npm run dev"


# ============================================================
# CARREGAR VARIÁVEIS DE AMBIENTE (.env)
# ============================================================
$DOTENV_PATH = Join-Path $BACKEND_PATH ".env"

if (-not (Test-Path $DOTENV_PATH)) {
    Write-Host "Arquivo .env não encontrado. Executando setup-env-dev.ps1..." -ForegroundColor Yellow
    $SETUP_SCRIPT = Join-Path $PROJECT_ROOT "setup-env-dev.ps1"
    if (Test-Path $SETUP_SCRIPT) {
        & $SETUP_SCRIPT
    }
    else {
        Write-Host "ERRO: Script de setup não encontrado em $SETUP_SCRIPT. O backend pode falhar ao iniciar." -ForegroundColor Red
    }
}

if (Test-Path $DOTENV_PATH) {
    Get-Content $DOTENV_PATH | Where-Object { $_ -match '=' -and $_ -notmatch '^#' } | ForEach-Object {
        $name, $value = $_.Split('=', 2)
        $name = $name.Trim()
        $value = $value.Trim()
        if ($name) {
            [System.Environment]::SetEnvironmentVariable($name, $value)
        }
    }
}



# ============================================================
# INICIAR BACKEND (NOVA JANELA DO POWERSHELL)
# ============================================================
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd `"$BACKEND_PATH`"; " +
    "& `"$VENV_ACTIVATE`"; " +
    "$BACKEND_COMMAND"
)


# ============================================================
# INICIAR FRONTEND (NOVA JANELA DO POWERSHELL)
# ============================================================
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd `"$FRONTEND_PATH`"; " +
    "$FRONTEND_COMMAND"
)
