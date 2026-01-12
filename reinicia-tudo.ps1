$ROOT = "C:\Projects\cemep-digital"
& "$ROOT\reset-db.ps1"
python "$ROOT\backend\importacoes\import_tudo.py"
& "$ROOT\start-dev.ps1"
