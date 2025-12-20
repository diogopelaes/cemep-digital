# GUIA MESTRE DO PROJETO - CEMEP DIGITAL

Este arquivo serve como ponto central de verdade para orientação de LLMs (Assistentes de IA) no desenvolvimento deste projeto.

## Contexto do Projeto
O **CEMEP Digital** é um sistema de gestão escolar desenvolvido sob medida para as necessidades específicas da instituição. O sistema visa modernizar o controle de notas, frequências, ocorrências e comunicação.

## Mapa da Documentação Técnica
Para entender detalhadamente cada aspecto, consulte os arquivos abaixo na pasta `Documentação/`:

1. **[Requisitos Funcionais](requisitos_funcionais.md)**: O QUE o sistema faz. Regras de negócio de Gestão, Professores, Avaliações (Recuperação, Vistos) e Conselho de Classe.
2. **[Banco de Dados](banco_de_dados.md)**: COMO os dados são salvos. Estrutura completa dos Models Django.
3. **[Frontend](requisitos_frontend.md)**: Stack React + Vite + Tailwind. Diretrizes de UI "Premium".
4. **[Backend](requisitos_backend.md)**: Stack Django REST + JWT + Email SMTP.
5. **[Infraestrutura](requisitos_sistema.md)**: VPS Hostinger, Ubuntu 25.10, Deploy direto (Sem Docker) com Caddy e Uvicorn.
6. **[Requisitos Não Funcionais](requisitos_nao_funcionais.md)**: Segurança, Política de Retenção de Dados (1 ano), Performance.

## Regras de Ouro para o Desenvolvimento (LLM Instructions)

### 1. Stack Tecnológica Estrita
- **NÃO** utilize Docker a menos que solicitado para testes locais. O deploy é direto na VPS.
- **NÃO** utilize Bootstrap ou CSS puro. Use **TailwindCSS**.
- **Use** Componentes Funcionais React e Hooks. Nada de Class Components.
- **Use** Django Rest Framework com Serializers explícitos.

### 2. Atenção aos Detalhes Críticos
- **Regra da Recuperação:** A nota de recuperação SUBSTITUI a nota final se for maior. Isso deve estar hardcoded na lógica de cálculo (property ou signal no Django).
- **Faltas:** O sistema registra apenas as faltas. A frequência é calculada com base nos dias letivos do calendário. Se houver múltiplas aulas no dia, o registro da falta é por aula individual.
- **Design:** Sempre que gerar código frontend, foque na **estética**. Use sombras, `rounded-lg` ou `xl`, espaçamentos generosos (`p-6`, `gap-4`) e cores harmoniosas. Interface feia é considerada erro.
- **Banco Permanente:** Dados vitais (Histórico e Ocorrências Disciplinares) nunca são excluídos. Ao "expurgar" um aluno, os dados são migrados ou mantidos no App `permanent` identificados pelo CPF.

### 3. Segurança e Privacidade
- Dados médicos e documentos anexados são privados. Nunca exponha URLs de `media/` publicamente sem verificação de token/sessão.
- Implemente a rotina de limpeza de dados (Data Retention) assim que configurar o backend básico.

---
**Inicie qualquer tarefa lendo este arquivo e os arquivos linkados relevantes para a solicitação do usuário.**

## Identidade Visual
- **Logo Oficial:** `Documentation/img/CEMEP.jpeg`
