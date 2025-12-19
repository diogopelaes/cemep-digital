# Requisitos do Frontend

## Tecnologias Principais
- **Framework:** React 19 (via Vite).
- **Linguagem:** JavaScript (ES6+) ou TypeScript (Recomendado para segurança de tipos com os Models complexos).
- **Estilização:** TailwindCSS v4 (ou stable v3.4).
- **Ícones:** React Icons.
- **HTTP Client:** Axios (configurado com Interceptors para JWT).
- **Gerenciamento de Estado:** Context API ou Zustand (para estados globais simples como User/Theme).

## Diretrizes de Interface (UI/UX)
- **Tema:**
    - Suporte a Light/Dark mode.
    - Cores "Premium" e vibrantes, evitando o básico (azul puro/vermelho puro).
    - Uso de *Glassmorphism* em modais e cards (efeito de vidro fosco).
    - Micro-interações: Hover effects em botões, transições suaves entre rotas.
- **Componentização:**
    - `Button`, `Input`, `Card`, `Modal`, `Table` devem ser componentes reutilizáveis baseados no Design System do projeto.
    - Evitar classes utilitárias repetitivas soltas no código; encapsular em componentes.

## Estrutura de Pastas Sugerida (src/)
- `/assets`: Imagens, fontes. (Logo em `Documentation/img/CEMEP.jpeg`)
- `/components`: Componentes reutilizáveis (UI Kit).
- `/contexts`: Contextos globais (Auth, Theme).
- `/hooks`: Custom hooks (ex: `useAuth`, `useFetch`).
- `/layouts`: Layouts base (MainLayout, AuthLayout).
- `/pages`: Telas da aplicação (mapeadas nas rotas).
- `/services`: Configuração de API (axios) e endpoints.
- `/utils`: Formatadores de data, moeda, validadores.

## Features Específicas do Frontend
1. **Router:** `react-router-dom`. Rotas protegidas por verificação de Role (ex: Rota `/gestao` só acessível para admin/gestor).
2. **Feedback Visual:** Uso de "Toasts" (notificações flutuantes) para sucesso/erro de operações.
3. **Modal de Conselho de Classe:** Interface rica, carregando dados dinamicamente ao navegar entre alunos ("Salvar e Próximo").
4. **Login:** Tela visualmente impactante.
