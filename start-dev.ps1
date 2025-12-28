Clear-Host
# ===== Backend =====
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    # Coloque o caminho do backend
    "cd C:\Projects\cemep-digital\backend; " +
    # Coloque o caminho do venv
    "C:\Projects\cemep-digital\.venv\Scripts\Activate.ps1; " +
    "py manage.py runserver"
)

# ===== Frontend =====
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    # Coloque o caminho do frontend
    "cd C:\Projects\cemep-digital\frontend; npm run dev"
)
