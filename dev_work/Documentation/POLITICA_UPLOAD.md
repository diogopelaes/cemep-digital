# 📁 Política de Upload de Arquivos Escolares

Esta documentação descreve a **política oficial de upload de arquivos** da aplicação, voltada para o envio de **trabalhos escolares, relatórios, atividades e apresentações**, com foco em **segurança**, **padronização** e **economia de espaço de armazenamento**.

---

## 🎯 Objetivo

Permitir apenas uploads de arquivos **necessários ao contexto educacional**, evitando riscos de segurança, desperdício de armazenamento e formatos inadequados.

---

## ✅ Categorias de Arquivos Permitidos

### 📄 Textos

Arquivos destinados a trabalhos escritos, relatórios, listas de exercícios e TCC.

- **Extensões permitidas**
  - `pdf` *(formato preferencial)*
  - `docx`
  - `odt`
  - `txt`
  - `md`
- **Tamanho máximo**
  - `10 MB`

---

### 📊 Planilhas

Arquivos utilizados para tabelas, pesquisas, dados estatísticos e cálculos.

- **Extensões permitidas**
  - `csv`
  - `xlsx`
  - `ods`
- **Tamanho máximo**
  - `5 MB`

---

### 🖼️ Imagens

Imagens utilizadas como anexos, ilustrações ou evidências visuais.

- **Extensões permitidas**
  - `jpg`
  - `jpeg`
  - `png`
- **Tamanho máximo**
  - `5 MB`
- **Restrições adicionais**
  - Largura máxima: `3000 px`
  - Altura máxima: `3000 px`

---

### 📽️ Slides (Apresentações)

Arquivos de apresentações utilizadas em seminários e exposições de trabalhos.

- **Extensões permitidas**
  - `pptx`
  - `odp`
  - `pdf` *(formato preferencial)*
- **Tamanho máximo**
  - `10 MB`

---

## ❌ Arquivos Não Permitidos

### 🚫 Executáveis e Scripts

Não são permitidos por representarem risco de execução de código malicioso.

- **Extensões bloqueadas**
  - `exe`, `bat`, `cmd`, `msi`, `dll`
  - `sh`, `ps1`
  - `php`, `js`, `py`

---

### 🚫 Arquivos Compactados

Não permitidos por dificultarem inspeção e poderem conter múltiplos arquivos proibidos.

- **Extensões bloqueadas**
  - `zip`, `rar`, `7z`
  - `tar`, `gz`, `tgz`

---

### 🚫 Vídeos e Áudios

Bloqueados por alto consumo de armazenamento e não serem essenciais ao objetivo pedagógico da aplicação.

- **Extensões bloqueadas**
  - Vídeo: `mp4`, `avi`, `mkv`, `mov`
  - Áudio: `mp3`, `wav`, `ogg`

---

## 🛡️ Regras de Validação

Todo upload deve atender **obrigatoriamente** às seguintes regras:

- ✔️ Validação por **whitelist de extensões**
- ✔️ Verificação de **MIME type**
- ✔️ Limite máximo de tamanho por categoria
- ✔️ Nenhum arquivo pode ser executado automaticamente
- ✔️ Arquivos armazenados fora de acesso público direto

---

## 📌 Regras Gerais

- Apenas arquivos de **texto, planilhas, imagens e slides** são permitidos.
- **PDF é o formato padrão recomendado** para textos e apresentações.
- Arquivos compactados **não são aceitos**.
- Todo arquivo deve ser **legível diretamente**, sem necessidade de execução.

---

## 🧠 Princípio Norteador

> **Se o arquivo não pode ser lido, visualizado ou impresso diretamente, ele não deve ser enviado.**

---

## 📄 Versão da Política

- **Identificador:** `upload_escolar_restrito`
- **Aplicação:** Sistema educacional / escolar
- **Escopo:** Upload de arquivos por usuários finais
