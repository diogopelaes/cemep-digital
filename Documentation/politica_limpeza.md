# Política de Limpeza de Dados - CEMEP Digital

## Objetivo

Definir regras para exclusão automática de dados de estudantes e responsáveis após **1 ano** da saída do CEMEP, visando economia de armazenamento no VPS.

---

## Escopo

### Dados a serem excluídos (Apps operacionais)

| App | Models | Dados |
|-----|--------|-------|
| `users` | `User` | Conta de acesso (estudante/responsável) |
| `academic` | `Estudante`, `Responsavel`, `MatriculaCEMEP`, `MatriculaTurma`, `Atestado` | Dados pessoais e vínculos |
| `pedagogical` | `Faltas`, `OcorrenciaPedagogica`, `NotaBimestral`, `NotificacaoRecuperacao` | Registros do dia a dia |

### Dados a serem preservados (App `permanent`)

| Model | Propósito |
|-------|-----------|
| `DadosPermanenteEstudante` | Dados pessoais básicos (CPF, nome, endereço) |
| `DadosPermanenteResponsavel` | Dados do responsável vinculado |
| `HistoricoEscolar` | Histórico acadêmico resumido |
| `HistoricoEscolarAnoLetivo` | Detalhes por ano letivo |
| `HistoricoEscolarNotas` | Notas finais por disciplina |
| `OcorrenciaDisciplinar` | Ocorrências disciplinares relevantes |

---

## Gatilho de Limpeza

```
data_saida (em MatriculaCEMEP) + 365 dias < data_atual
```

### Condições para exclusão

1. `MatriculaCEMEP.data_saida` preenchida
2. `MatriculaCEMEP.status` ∈ {`CONCLUIDO`, `ABANDONO`, `TRANSFERIDO`}
3. Passaram-se **365 dias** desde `data_saida`
4. Dados já foram copiados para app `permanent`

---

## Fluxo de Execução

```
┌─────────────────────────────────────────────────────────────┐
│  1. IDENTIFICAR estudantes elegíveis para limpeza          │
│     (data_saida + 365 dias < hoje)                         │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  2. VERIFICAR se dados já existem no app 'permanent'       │
│     - Se não existem: copiar antes de deletar              │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  3. COPIAR dados para 'permanent' (se necessário)          │
│     - DadosPermanenteEstudante (CPF, nome, endereço)       │
│     - DadosPermanenteResponsavel (para cada responsável)   │
│     - HistoricoEscolar + AnoLetivo + Notas                 │
│     - OcorrenciaDisciplinar (ocorrências graves)           │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  4. DELETAR arquivos de mídia                              │
│     - Fotos de perfil (profile_pics/)                      │
│     - Atestados médicos (atestados/)                       │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  5. DELETAR User (cascade deleta Estudante, Responsavel)   │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementação Técnica

### Management Command

Criar arquivo: `management/commands/limpar_dados_expirados.py`

```python
from django.core.management.base import BaseCommand
from datetime import date, timedelta
from django.db import transaction

class Command(BaseCommand):
    help = 'Remove dados de estudantes após 1 ano da saída do CEMEP'

    def handle(self, *args, **options):
        from academic.models import MatriculaCEMEP, Estudante
        from permanent.models import DadosPermanenteEstudante
        
        cutoff = date.today() - timedelta(days=365)
        status_saida = ['CONCLUIDO', 'ABANDONO', 'TRANSFERIDO']
        
        matriculas = MatriculaCEMEP.objects.filter(
            data_saida__lte=cutoff,
            status__in=status_saida
        ).select_related('estudante__usuario')
        
        for m in matriculas:
            estudante = m.estudante
            with transaction.atomic():
                # 1. Copiar para permanent (se não existir)
                if not DadosPermanenteEstudante.objects.filter(cpf=estudante.cpf).exists():
                    self._copiar_para_permanent(estudante, m)
                
                # 2. Deletar mídia
                self._deletar_midias(estudante)
                
                # 3. Deletar User (cascade)
                estudante.usuario.delete()
                
            self.stdout.write(f'Removido: {estudante.cpf}')

    def _copiar_para_permanent(self, estudante, matricula):
        # Implementar cópia de dados
        pass

    def _deletar_midias(self, estudante):
        # Deletar arquivos físicos
        pass
```

### Agendamento (Cron)

Executar **toda segunda-feira de julho** (4-5 execuções para garantir sucesso):

```bash
# Executa às 03:00 toda segunda-feira durante julho
0 3 * 7 1 cd /path/to/cemep-digital && python manage.py limpar_dados_expirados >> /var/log/cemep_limpeza.log 2>&1
```

> **Justificativa:** Entradas e saídas de estudantes ocorrem no início/fim do ano letivo. Executar em julho (recesso) garante que o sistema não seja impactado durante período letivo, e múltiplas execuções evitam falhas pontuais.

---

## Retenção no App `permanent`

Os dados no app `permanent` **não têm prazo de exclusão automática**. Eles são mantidos indefinidamente para:

- Emissão de segunda via de histórico escolar
- Consulta a ocorrências disciplinares passadas
- Atendimento a solicitações legais

### Exclusão manual

Dados do app `permanent` só podem ser excluídos:
- Por solicitação formal do titular (LGPD)
- Por ordem judicial
- Após prazo legal de guarda documental (verificar legislação educacional)

---

## Considerações LGPD

> **Nota:** Esta política visa atender ao princípio de minimização de dados da LGPD. Os dados mantidos no app `permanent` são justificados pela necessidade de manutenção de registros históricos escolares.
