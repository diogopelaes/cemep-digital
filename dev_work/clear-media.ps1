# ============================================================================
# LIMPA DIRETÓRIO DE MEDIA
# Remove todos os subdiretórios e arquivos dentro de backend/media
# ============================================================================

$MEDIA_PATH = "$PSScriptRoot\..\backend\media"

Write-Host "`n📁 Limpando diretório de media..." -ForegroundColor Cyan
Write-Host "   Caminho: $MEDIA_PATH`n" -ForegroundColor Gray

if (Test-Path $MEDIA_PATH) {
    # Lista os itens dentro de media
    $items = Get-ChildItem -Path $MEDIA_PATH -ErrorAction SilentlyContinue
    $count = ($items | Measure-Object).Count

    if ($count -gt 0) {
        Write-Host "   Removendo $count itens..." -ForegroundColor Gray
        $items | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "   ✓ Diretório media limpo com sucesso!" -ForegroundColor Green
    }
    else {
        Write-Host "   • O diretório media já está vazio." -ForegroundColor Yellow
    }
}
else {
    Write-Host "   ⚠ Erro: O diretório $MEDIA_PATH não foi encontrado." -ForegroundColor Red
}

Write-Host ""
