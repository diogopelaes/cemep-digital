# Requisitos Não Funcionais — CEMEP Digital

## 1. Infraestrutura e Deploy
- **RNF001 - Servidor:** VPS Hostinger com Ubuntu 25.10 (ou versão LTS estável mais recente suportada).
- **RNF002 - Web Server:** Caddy (Reverse Proxy e Gestão automática de SSL) + Uvicorn (ASGI Server).
- **RNF003 - Banco de Dados:** PostgreSQL (Versão 18 ou latest stable disponível no Ubuntu 25.10).
- **RNF004 - Linguagem:** Python 3.14.2 (ou latest stable).
- **RNF005 - Localização:** Servidor, Timezone e Locale configurados para 'America/Sao_Paulo' (pt-BR).

## 2. Segurança
- **RNF006 - Autenticação API:** JWT (JSON Web Tokens) com `Rosedojo` ou `SimpleJWT`.
- **RNF007 - Restrição de Acesso Backend:** O Backend deve possuir middleware ou configuração de firewall/Caddy para restringir requisições administrativas sensíveis ou garantir que requisições frontend venham da origem permitida (CORS restritivo).
- **RNF008 - Proteção de Arquivos:** Arquivos de mídia (uploads, documentos médicos) não devem ter URL pública direta adivinhável. Devem ser servidos através de uma view protegida do Django (`X-Sendfile` ou leitura de stream com verificação de permissão).

## 3. Armazenamento e Retenção de Dados
- **RNF009 - Storage:** Armazenamento local (filesystem da VPS).
- **RNF010 - Política de Dados Mínimos:**
    - Tabelas vitais permantentes: `HistoricoEscolar`, `OcorrenciaDisciplinar`, `DadosPessoaisAluno`.
    - Tabelas transitórias: Notas diárias, Frequência detalhada, Planejamentos, etc.
- **RNF011 - Expurgo de Dados (Data Retention):**
    - Trigger ou Job Cron programado.
    - Critério: `Data Saída do Aluno` + 1 Ano.
    - Ação: Apagar todos os dados transitórios vinculados ao aluno, mantendo apenas o registro vital (Histórico e Disciplinar).

## 4. Comunicação
- **RNF012 - E-mail:** Envio via SMTP Google.
    - Host: `smtp.gmail.com`
    - Port: `587`
    - TLS: `True`

## 5. Interface
- **RNF013 - Responsividade:** O sistema deve ser totalmente funcional em Mobile, Tablet e Desktop.
- **RNF014 - Temas:** Suporte nativo a Light Mode e Dark Mode (respeitando preferência do sistema ou seleção do usuário).
