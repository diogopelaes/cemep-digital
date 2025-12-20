# 📐 Padrões de Desenvolvimento - CEMEP Digital

Este documento estabelece os padrões obrigatórios para o desenvolvimento do sistema. **Consulte sempre antes de implementar novas funcionalidades.**

---

## 🎨 Frontend - Padrões de Interface

### 1. Formulários NÃO devem usar Modal

❌ **ERRADO:**
```jsx
<Modal isOpen={modalOpen} title="Novo Item">
  <form>...</form>
</Modal>
```

✅ **CORRETO:**
```jsx
// Criar página dedicada: ItemForm.jsx
// Rota: /items/novo e /items/:id/editar
<Route path="/items/novo" element={<ItemForm />} />
<Route path="/items/:id/editar" element={<ItemForm />} />
```

**Motivo:** Formulários em modais prejudicam a usabilidade, navegação por URL e acessibilidade.

---

### 2. Inputs Numéricos: SEMPRE usar `type="text"` com controle JS

❌ **ERRADO:**
```jsx
<Input
  type="number"
  min={1}
  max={9}
  value={valor}
  onChange={(e) => setValor(e.target.value)}
/>
```

✅ **CORRETO:**
```jsx
<Input
  type="text"
  maxLength={1}
  value={valor}
  onChange={(e) => {
    const val = e.target.value.replace(/\D/g, '') // Remove não-dígitos
    if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 9)) {
      setValor(val)
    }
  }}
  onKeyDown={(e) => {
    const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
    if (!allowed.includes(e.key) && !/^[1-9]$/.test(e.key)) {
      e.preventDefault()
    }
  }}
  onPaste={(e) => {
    e.preventDefault()
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 1)
    if (paste && parseInt(paste) >= 1 && parseInt(paste) <= 9) {
      setValor(paste)
    }
  }}
  inputMode="numeric"
  autoComplete="off"
/>
```

**Motivo:** 
- `type="number"` tem comportamento inconsistente entre navegadores
- Permite entrada de caracteres indesejados (e, +, -)
- Spinners visuais são confusos para o usuário
- Controle via JS oferece melhor experiência e validação

---

### 3. Selects: Usar prop `placeholder` ao invés de opção vazia manual

❌ **ERRADO:**
```jsx
<Select
  options={[
    { value: '', label: 'Selecione...' },
    ...items.map(i => ({ value: i.id, label: i.nome }))
  ]}
/>
```

✅ **CORRETO:**
```jsx
<Select
  placeholder="Selecione um item..."
  options={items.map(i => ({ value: i.id, label: i.nome }))}
/>
```

**Exceção:** Filtros onde "Todos" é uma opção válida:
```jsx
<Select
  options={[
    { value: '', label: 'Todos os itens' },
    ...items.map(i => ({ value: i.id, label: i.nome }))
  ]}
/>
```

---

### 4. Selects com único item: Selecionar automaticamente

Quando um Select tem apenas uma opção disponível, selecione-a automaticamente:

```jsx
const loadItems = async () => {
  const response = await api.items.list()
  const data = response.data.results || response.data
  setItems(data)
  
  // Se houver apenas um item e for novo registro, seleciona automaticamente
  if (data.length === 1 && !isEditing) {
    setFormData(prev => ({ ...prev, item_id: data[0].id }))
  }
}
```

---

### 5. Datas: Usar componente `DateInput` customizado

- Exibir datas no formato brasileiro (dd/mm/aaaa)
- Usar o componente `DateInput` para entrada
- Armazenar internamente em formato ISO (YYYY-MM-DD)

```jsx
import { DateInput } from '../components/ui'
import { formatDateBR, getCurrentDateISO } from '../utils/date'

<DateInput
  label="Data de Entrada *"
  value={formData.data_entrada}
  onChange={(e) => setFormData({ ...formData, data_entrada: e.target.value })}
/>
```

---

### 6. Telefones: Usar máscara

```jsx
const formatTelefone = (value) => {
  const numbers = value.replace(/\D/g, '').slice(0, 11)
  
  if (numbers.length <= 2) return numbers.length ? `(${numbers}` : ''
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
  if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`
}

<Input
  value={formData.telefone}
  onChange={(e) => setFormData({ ...formData, telefone: formatTelefone(e.target.value) })}
  inputMode="tel"
  maxLength={15}
/>
```

---

### 7. Prevenção de Autocomplete em Credenciais

Quando criar formulários que geram credenciais para OUTROS usuários:

```jsx
{/* Campos hidden para confundir o autocomplete */}
<input type="text" name="fakeuser" autoComplete="username" style={{ display: 'none' }} />
<input type="password" name="fakepass" autoComplete="current-password" style={{ display: 'none' }} />

<Input
  name="func_login" // Nome diferente
  data-form-type="other"
  data-lpignore="true"
  autoComplete="off"
/>
```

---

## 🔧 Backend - Padrões de API

### 1. Transações Atômicas

Operações que envolvem múltiplas tabelas devem ser atômicas:

```python
from django.db import transaction

@action(detail=False, methods=['post'])
@transaction.atomic
def criar_completo(self, request):
    # Se qualquer parte falhar, tudo é revertido
    user = User.objects.create_user(...)
    funcionario = Funcionario.objects.create(usuario=user, ...)
    PeriodoTrabalho.objects.create(funcionario=funcionario, ...)
    return Response(...)
```

---

### 2. Validações no Serializer

```python
def validate_campo(self, value):
    if SomeModel.objects.filter(campo=value).exists():
        raise serializers.ValidationError('Este valor já está em uso.')
    return value
```

---

## 📁 Estrutura de Arquivos

### Páginas de CRUD

```
pages/
├── Items.jsx           # Listagem
├── ItemForm.jsx        # Criação e Edição
├── ItemDetalhes.jsx    # Visualização com abas (se necessário)
```

### Rotas

```jsx
<Route path="/items" element={<Items />} />
<Route path="/items/novo" element={<ItemForm />} />
<Route path="/items/:id" element={<ItemDetalhes />} />
<Route path="/items/:id/editar" element={<ItemForm />} />
```

---

## ✅ Checklist Antes de Commitar

- [ ] Nenhum formulário está em modal
- [ ] Inputs numéricos usam `type="text"` com controle JS
- [ ] Selects usam prop `placeholder` (não opção vazia manual)
- [ ] Datas exibidas em formato brasileiro
- [ ] Operações multi-tabela são atômicas
- [ ] Validações existem no backend E no frontend

---

**Última atualização:** Dezembro 2024

