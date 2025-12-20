# Estrutura de Diretórios e Arquivos - CEMEP Digital

Esta é a estrutura ideal sugerida para o projeto, separando claramente o Backend (Django) do Frontend (React).

```text
cemep-digital/
├── .venv/                      # Ambiente virtual Python (ignorado pelo git)
├── .gitignore                  # Configurações de exclusão do Git
├── README.md                   # Instruções gerais do projeto
├── Documentation/              # Documentação técnica completa
│   ├── Frameworks/             # Instaladores (ignorado pelo git)
│   ├── img/                    # Logos e capturas de tela
│   ├── PROJETO_MASTER.md       # Guia mestre
│   ├── banco_de_dados.md       # Definição dos Models Django
│   ├── requisitos_funcionais.md
│   ├── requisitos_backend.md
│   ├── requisitos_frontend.md
│   └── ESTRUTURA_PROJETO.md    # Este arquivo
│
├── backend/                    # Projeto Django
│   ├── core_project/           # Configurações do projeto (settings.py, urls.py)
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── asgi.py             # Configuração para Uvicorn
│   ├── apps/                   # Aplicativos do sistema
│   │   ├── users/              # Gestão de acesso e perfis
│   │   ├── core/               # Cadastros base (Cursos, Turmas, Disciplinas)
│   │   ├── academic/           # Vida escolar (Estudantes, Matrículas)
│   │   ├── pedagogical/        # Diário, Notas, Faltas, Planejamento
│   │   ├── management/         # Tarefas, HTPC, Avisos
│   │   └── permanent/          # Arquivo morto e histórico (Base CPF)
│   ├── manage.py
│   ├── requirements.txt        # Dependências Python
│   └── .env                    # Variáveis de ambiente (Segredos)
│
└── frontend/                   # Projeto React (Vite)
    ├── public/                 # Arquivos estáticos públicos
    ├── src/
    │   ├── assets/             # Imagens e estilos globais
    │   ├── components/         # Componentes de UI (Botões, Cards, Tabelas)
    │   ├── contexts/           # Context API (Auth, Theme)
    │   ├── hooks/              # Custom Hooks
    │   ├── layouts/            # Templates de página (Main, Auth)
    │   ├── pages/              # Telas da aplicação
    │   ├── services/           # Chamadas de API (Axios)
    │   ├── utils/              # Formatadores e validadores
    │   ├── App.jsx
    │   └── main.jsx
    ├── index.html
    ├── package.json            # Dependências e scripts Node
    ├── tailwind.config.js      # Configuração do Tailwind CSS
    └── vite.config.js          # Configuração do Vite
```

## Notas sobre a Estrutura:

1.  **Apps Django:** A pasta `backend/apps/` ajuda a manter a raiz do projeto limpa, agrupando todos os módulos de negócio.
2.  **Frontend:** A estrutura segue o padrão de **Feature-based Architecture**, facilitando a escalabilidade.
3.  **Segurança:** Arquivos `.env` e pastas `.venv` ou `node_modules` **não devem** ser versionados no Git (conforme configurado no `.gitignore`).
4.  **Backend Permanente:** O app `permanent` terá uma lógica de banco de dados que impede exclusões, conforme definido no `banco_de_dados.md`.

