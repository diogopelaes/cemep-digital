# setup-frontend.ps1
# Instala dependências em um projeto React já existente
# Caminho: C:\Projects\cemep-digital\frontend

$FRONTEND_PATH = "C:\Projects\cemep-digital\frontend"

# Verificações básicas
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js não encontrado."
    exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "npm não encontrado."
    exit 1
}

if (-not (Test-Path $FRONTEND_PATH)) {
    Write-Error "Diretório $FRONTEND_PATH não existe."
    exit 1
}

Set-Location $FRONTEND_PATH

Write-Host "Instalando dependências do projeto (package.json)..."
npm install --yes

Write-Host "Instalando dependências solicitadas..."
npm install vite react-router-dom axios --yes

Write-Host "Instalando TailwindCSS..."
npm install -D tailwindcss postcss autoprefixer --yes

# Inicializa Tailwind apenas se não existir
if (-not (Test-Path "tailwind.config.js")) {
    npx tailwindcss init -p
}

Write-Host "Setup concluído."
Write-Host "Para rodar o projeto:"
Write-Host "npm run dev"
