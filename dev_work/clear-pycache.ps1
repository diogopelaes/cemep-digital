# ============================================================================
# LIMPA CACHE PYTHON
# Remove todos os diretórios __pycache__ e arquivos .pyc do projeto
# ============================================================================

param(
    [string]$Path = "$PSScriptRoot\.."
)

Write-Host "`n🧹 Limpando cache Python..." -ForegroundColor Cyan
Write-Host "   Diretório: $Path`n" -ForegroundColor Gray

# Conta e remove diretórios __pycache__
$pycacheDirs = Get-ChildItem -Path $Path -Filter "__pycache__" -Recurse -Directory -ErrorAction SilentlyContinue
$pycacheCount = ($pycacheDirs | Measure-Object).Count

if ($pycacheCount -gt 0) {
    $pycacheDirs | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   ✓ Removidos $pycacheCount diretórios __pycache__" -ForegroundColor Green
}
else {
    Write-Host "   • Nenhum diretório __pycache__ encontrado" -ForegroundColor Yellow
}

# Conta e remove arquivos .pyc avulsos (caso existam fora de __pycache__)
$pycFiles = Get-ChildItem -Path $Path -Filter "*.pyc" -Recurse -File -ErrorAction SilentlyContinue
$pycCount = ($pycFiles | Measure-Object).Count

if ($pycCount -gt 0) {
    $pycFiles | Remove-Item -Force -ErrorAction SilentlyContinue
    Write-Host "   ✓ Removidos $pycCount arquivos .pyc" -ForegroundColor Green
}

# Conta e remove arquivos .pyo
$pyoFiles = Get-ChildItem -Path $Path -Filter "*.pyo" -Recurse -File -ErrorAction SilentlyContinue
$pyoCount = ($pyoFiles | Measure-Object).Count

if ($pyoCount -gt 0) {
    $pyoFiles | Remove-Item -Force -ErrorAction SilentlyContinue
    Write-Host "   ✓ Removidos $pyoCount arquivos .pyo" -ForegroundColor Green
}

Write-Host "`n✨ Cache limpo com sucesso!`n" -ForegroundColor Cyan
