# Requisitos do Sistema (Ambiente VPS)

## Ambiente de Desenvolvimento Local (Windows)
Para garantir a paridade com o servidor, o ambiente local utiliza:

1. **PostgreSQL 18.1**
   - **Path:** `C:\Program Files\PostgreSQL\18\bin`
   - **Binários:** `psql`, `pg_dump`, etc.
2. **Node.js v24.12.0**
3. **NPM 11.6.2**
4. **Python 3.14 (Ambiente Virtual)**
   - **Ativação (PowerShell):** `C:\Projects\cemep-digital\.venv\Scripts\Activate.ps1`

## Especificações da Máquina VPS (Hostinger)
- **Hostname:** srv1175442.hstgr.cloud
- **IP:** 72.61.223.71
- **OS:** Ubuntu 25.10
- **CPU:** 1 Core
- **RAM:** 4 GB
- **Disco:** 50 GB

## Softwares Necessários
1. **Python 3.14.2+** (Compilado ou via deadsnakes PPA se disponível).
2. **PostgreSQL 18** (Verificar disponibilidade no repositório oficial do Postgres para Ubuntu 25.10; caso contrário, usar versão stable 17).
3. **Node.js + NPM** (Apenas para build do Frontend no deploy, ou buildar local e subir artefatos).
4. **Caddy Server** (Instalação via repositório oficial).
5. **Git**.
6. **Supervisor** ou **Systemd** (Para gerenciar o processo do Uvicorn e manter o site online após reiniciar).

## Estrutura de Diretórios Sugerida na VPS
```
/var/www/cemep_digital/
├── backend/       # Código Django
├── frontend/      # Código React (ou build em /dist)
├── media/         # Uploads (Protegido)
├── static/        # Static files coletados (Django)
└── .env           # Variáveis de ambiente (Segredo)
```

## Procedimento de Deploy (Simplificado)
1. Clone do repositório.
2. Setup Backend:
   - Criar venv.
   - Instalar requirements.
   - `collectstatic`.
   - `migrate`.
3. Setup Frontend:
   - `npm install` && `npm run build`.
   - Mover arquivos de `dist/` para pasta servida pelo Caddy (ou configurar Caddy para ler `dist/`).
4. Configurar Systemd Service para Uvicorn.
5. Configurar Caddyfile (Reverse Proxy para porta 8000 do Uvicorn + Servir estáticos).
