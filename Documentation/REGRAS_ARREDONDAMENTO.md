# Regras de Arredondamento

## 1. Arredondamento matemático clássico

- Seja `N` o valor a ser arredondado.
- O número de casas decimais mantidas é definido pela variável `numero_casas_decimais`.
- Observa-se a `(numero_casas_decimais + 1)`-ésima casa decimal:
  - se o dígito for menor que 5, o valor é mantido;
  - se o dígito for maior ou igual a 5, incrementa-se a última casa mantida.

**Exemplo** (`numero_casas_decimais = 1`):

- `6,24 → 6,2`
- `6,25 → 6,3`


## 2. Arredondamento por faixas em múltiplos de 0,5

- Seja `N` o valor a ser arredondado.
- Seja `i(N)` a parte inteira de `N`.
- Seja `d(N)` a parte decimal de `N`.

### Regras

- Se `d(N) = 0,0` ou `d(N) = 0,5`, então `N` permanece inalterado.
- Se `d(N) < 0,25`, então `N = i(N)`.
- Se `0,25 ≤ d(N) < 0,75`, então `N = i(N) + 0,5`.
- Se `0,75 ≤ d(N) < 1`, então `N = i(N) + 1`.

### Observação

- O valor final pertence ao conjunto dos múltiplos de `0,5`.


## 3. Arredondamento sempre para cima (base decimal)

- Seja `N` o valor a ser arredondado.
- O número de casas decimais mantidas é definido por `numero_casas_decimais`.
- Observa-se a `(numero_casas_decimais + 1)`-ésima casa decimal:
  - se existir qualquer valor diferente de zero, incrementa-se a última casa mantida.
- Não há exceção para o dígito 5.

**Exemplo** (`numero_casas_decimais = 1`):

- `6,21 → 6,3`
- `6,20 → 6,2`


## 4. Arredondamento sempre para cima em múltiplos de 0,5

- Seja `N` o valor a ser arredondado.
- Seja `i(N)` a parte inteira de `N`.
- Seja `d(N)` a parte decimal de `N`.

### Regras

- Se `d(N) = 0,0` ou `d(N) = 0,5`, então `N` permanece inalterado.
- Se `d(N) < 0,5`, então `N = i(N) + 0,5`.
- Se `d(N) > 0,5`, então `N = i(N) + 1`.

### Observação

- O valor final é sempre o menor múltiplo de `0,5` estritamente maior ou igual a `N`.
