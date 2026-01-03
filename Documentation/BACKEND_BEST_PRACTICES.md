# Guia de Boas Práticas e Padronização do Backend (Django/DRF)

Este documento estabelece os padrões de desenvolvimento para o backend do **CEMEP Digital**. O foco é segurança absoluta, eficiência de recursos (VPS Single Core) e manutenção a longo prazo.

---

## 1. Performance Crítica: O Combate ao N+1

Em um servidor de 1 Core, o banco de dados é seu melhor amigo. O Python é o gargalo.

### 1.1. Listagens e Serializers
**Regra:** O Serializer não deve disparar queries.
*   **Permitido:** Acessar campos diretos ou já carregados via `select_related`.
*   **Proibido:** `SerializerMethodField` que faz `.filter()` ou `.count()`.

**Exemplo Prático (EstudanteSerializer):**
```python
# ❌ RUIM: Mata a performance
def get_cursos(self, obj):
    return Matricula.objects.filter(estudante=obj) # Query por linha!

# ✅ CORRETO:
# Na View: queryset.prefetch_related('matriculas__curso')
def get_cursos(self, obj):
    return [m.curso.sigla for m in obj.matriculas.all()] # Memória apenas
```

### 1.2. Importações em Massa (Excel/CSV)
Importações são as operações mais pesadas do sistema.
**Anti-Pattern Encontrado (FuncionarioViewSet):**
Fazer `User.objects.get(username=row['matricula'])` dentro de um loop de 1000 linhas. Isso gera 1000 queries de leitura.

**Padrão Otimizado (Pre-fetching):**
1.  Carregue todos os identificadores existentes em memória (Dict/Set) **antes** do loop.
    ```python
    # 1. Carregar mapa de usuários existentes
    existing_users = {
        u.username: u 
        for u in User.objects.filter(username__in=df['MATRICULA'].tolist())
    }
    
    # 2. No loop, usar o dicionário (Zero DB Hits de leitura)
    for row in df:
        user = existing_users.get(row['MATRICULA'])
    ```

---

## 2. Segurança e Robustez

### 2.1. Transações Atômicas
Operações que envolvem múltiplas tabelas (ex: Criar Usuário + Funcionário + Período) **DEVEM** ser atômicas.
*   Use `@transaction.atomic` no método da View ou `with transaction.atomic():` no bloco específico.
*   Isso garante integridade: ou salva tudo, ou não salva nada (evita "usuários fantasmas" sem perfil).

### 2.2. Validadores no Model vs Serializer
*   **Model:** Validações de integridade de dados (ex: `PeriodoTrabalho.clean()` para evitar datas sobrepostas). Isso protege o dado independente de onde venha (Admin, Shell, API).
*   **Serializer:** Validação de formato e regras de negócio de entrada.
*   **Dica:** Sempre chame `.full_clean()` no `save()` do Model se quiser forçar validação do Django Admin na API.

---

## 3. Padrões de Código e Manutenibilidade

### 3.1. Fat Models, Thin Views
Views gigantes (como `importar_arquivo` com 200 linhas) são difíceis de testar e manter.
*   **Sugestão:** Extrair lógica de importação para "Services" (`apps/core/services/import_funcionarios.py`). A View apenas chama `ImportService.execute(file)`.

### 3.2. Properties (@property)
Use `@property` no Model para lógica calculada simples (ex: `Turma.nome_completo`).
*   **Cuidado:** Properties são calculadas no Python. Não dá para filtrar por elas no `.filter()`. Se precisar filtrar, use `annotate()` na View.

---

## checklist para Code Review

### Segurança
- [ ] O ViewSet tem `permission_classes` restritivas?
- [ ] Inputs de arquivo são validados (extensão, tamanho)?
- [ ] Operações de escrita múltiplas estão em `transaction.atomic`?

### Performance
- [ ] Tem query SQL dentro de loop `for`? (Se sim, refatorar com Pre-fetch).
- [ ] Tem `SerializerMethodField` fazendo query? (Se sim, usar `annotate` ou `prefetch`).
- [ ] O endpoint de listagem tem paginação ativada?

### Qualidade
- [ ] Variáveis e funções têm nomes em Português ou Inglês (Mantenha consistência, projeto atual usa misto, mas prefira Português para domínio como 'Ano Letivo').
- [ ] As strings de erro são claras para o usuário final?

---

**Lema:** Otimize a leitura (Get) para ser instantânea. A escrita (Post) pode levar alguns segundos se garantir integridade.
