# Padrões de UI/UX e Componentes - CEMEP Digital

Este documento serve como guia de referência para manutenção e criação de novas interfaces no CEMEP Digital, garantindo consistência visual e funcional entre os modos mobile e desktop.

---

## 1. Sistema de Badges (Sinalização)

Todos os badges seguem uma base rigorosa definida no `index.css`. **Regra de Ouro:** Altura fixa, fonte pequena e peso em negrito para escaneabilidade.

### Classes Base (`index.css`)
- **`.badge`**: Altura `h-5` (20px), padding `px-2`, font-size `text-[10px]`, font-weight `font-bold`, uppercase e `tracking-wider`.
- **`.badge-disciplina`**: Fundo slate leve, texto slate escuro. Identifica a disciplina.
- **`.badge-bimestre`**: Borda sutil, fonte preta. Usado para identificar o período letivo.
- **`.badge-date`**: Fundo violeta/indigo leve, texto escuro. Para datas DD/MM.
- **`.badge-turma`**: Quadrado `w-6 h-6` com gradiente violeta/primary. Identifica o par Número+Letra (ex: 3Y).

### Componentes Especializados (`SpecializedBadges.jsx`)
Sempre prefira usar os componentes em vez de classes manuais:
- `<DisciplinaBadge sigla="LPC" />`
- `<BimestreBadge bimestre={1} />` -> **Lógica**: Só exibir se o filtro global de bimestre estiver em "Todos".
- `<TurmaBadge numero="3" letra="Y" />`
- `<DateDisplay date={data} />`
- `<TurmaPrimaryBadge ... />` -> Usado como identificador principal em tabelas desktop.

---

## 2. Arquitetura de Cards Mobile

Os cards mobile devem ser densos e evitar "white space" (espaços vazios) desnecessários.

### Estrutura Padrão
1. **Header (Topo)**:
   - Contém o Ícone Contextual (40x40px, gradiente).
   - Título da entidade principal (ex: Nome da Avaliação ou Turma) em `text-sm font-bold`.
   - **Sub-row (mt-1.5)**: Agrupamento de metadados fixos: `DisciplinaBadge`, `BimestreBadge` (condicional) e `DateDisplay`.
2. **Body (Corpo)**:
   - Separador: `mt-3 pt-3 border-t border-slate-50`.
   - **Turmas**: Todos os `TurmaBadge` devem estar agrupados nesta seção, em uma única linha com `flex-wrap`.
   - **Status/Ações**: Badges de valor, tipo de avaliação ou contagem de faltas.
3. **Actions (Rodapé)**:
   - Uso de `<MobileActionRow>` e `<MobileActionButton>`.

---

## 3. Diretrizes para Desktop (Tabelas)

O modo desktop utiliza tabelas tradicionais para aproveitar o espaço horizontal.

### Regras de Células (`TableCell`)
- **Respeito ao Tamanho**: Nunca deixe um Badge preencher toda a largura da célula.
  - **Solução**: Envolva o Badge em uma `<div className="flex">` para que ele respeite sua largura intrínseca.
- **Identificadores**: Use `TurmaPrimaryBadge` na primeira coluna para dar peso visual à turma.
- **Ações**: Use o componente `<ActionSelect>` para agrupar ações de linha e evitar poluição visual.

---

## 4. Spacing & UX Patterns

- **Separadores**: Use `mt-3 pt-3 border-t` para divisões internas de cards e `mt-4` para separações de blocos maiores.
- **Gaps**: Use `gap-x-3 gap-y-1` em containers de badges com `flex-wrap` para garantir que, se quebrarem de linha, não fiquem "grudados" verticalmente.
- **Hierarquia Visual**:
  - Títulos em `slate-800` (Light) / `white` (Dark).
  - Subtítulos e labels em `slate-400/500`.
  - Links e interações principais em `primary-600`.

---

## 5. Checklist de "Cagadas" a Evitar (Anti-patterns)

- [ ] **Não** misturar badges de turma com o título da entidade no mobile (deixe-os no corpo do card).
- [ ] **Não** exibir o badge de Bimestre se o usuário já filtrou por um bimestre específico.
- [ ] **Não** usar `mt-6` ou espaços grandes dentro de cards mobile; mantenha o layout compacto.
- [ ] **Não** deixar badges de texto (Tipo, Valor) sem um wrapper funcional no desktop (eles esticam e ficam feios).
- [ ] **Não** exibir conteúdo de texto longo (como observações ou conteúdos de aulas) nos cards de listagem mobile; deixe para a tela de detalhes/edição.

---
*Ultima atualização: 15/01/2026*
