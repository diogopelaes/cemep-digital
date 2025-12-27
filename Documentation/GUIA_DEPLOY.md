# Guia de Deploy - CEMEP Digital

Este guia descreve o processo completo de deploy do sistema **CEMEP Digital** em uma VPS Hostinger utilizando **PuTTY**.

As versões abaixo foram ajustadas para refletir exatamente o ambiente de desenvolvimento atual:

- Python: 3.14.0
- Node.js: v24.12.0
- npm: 11.6.2

---

## Informações do Servidor

- IP: 72.61.223.71
- Hostname: srv1175442.hstgr.cloud
- OS: Ubuntu 25.10
- Usuário SSH: root

---

## 1. Conectando via PuTTY

1. Abra o PuTTY
2. Host Name: 72.61.223.71
3. Porta: 22
4. Login: root

---

## 2. Preparação do Servidor

```bash
apt update && apt upgrade -y
apt install -y build-essential git curl wget software-properties-common \
    libpq-dev libssl-dev libffi-dev python3-dev
timedatectl set-timezone America/Sao_Paulo
```

---

## 3. PostgreSQL 17

```bash
apt install -y postgresql-17 postgresql-contrib-17
systemctl enable postgresql
systemctl start postgresql
```

---

## 4. Python 3.14

```bash
add-apt-repository ppa:deadsnakes/ppa -y
apt update
apt install -y python3.14 python3.14-venv python3.14-dev python3-pip
python3.14 --version
```

---

## 5. Node.js 24 + npm 11

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install -y nodejs
node --version
npm --version
```

---

## 6. Clonar Projeto

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/diogopelaes/cemep-digital.git
```

---

## Última atualização

Dezembro de 2025
