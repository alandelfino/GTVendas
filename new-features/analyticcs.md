# Especificação — Página de Analytics do Representante

## Objetivo

Página de análise de desempenho de vendas do representante. O usuário deve conseguir entender rapidamente sua performance comercial: quanto vendeu, para quem, o que vendeu, e qual a penetração na carteira de clientes.

---

## Rota e Acesso

- **Rota:** `/rep/analytics`
- **Autenticação:** obrigatória (role `user` com `representanteId` vinculado)
- **Navegação:** item "Analytics" na sidebar do representante

---

## Fonte de Dados

Todos os dados vêm de um único endpoint:

### `GET /api/rep/analytics`

**Query params:**
| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `colecaoId` | string | — | Filtra por coleção (`id_externo`). Se omitido, retorna todos os dados. |
| `groupBy` | `"day"` \| `"week"` \| `"month"` | `"day"` | Granularidade do gráfico de tendência |

**Resposta 200:**
```json
{
  "clientesAtivos": 120,
  "clientesAtendidos": 87,
  "summary": {
    "totalValor": 4850000,
    "totalPedidos": 43,
    "totalQuantidade": 1280,
    "ticketMedio": 112790
  },
  "chart": [
    { "periodo": "2025-03-01", "valor": 320000, "quantidade": 95 }
  ],
  "topProdutos": [
    { "produtoId": "PROD001", "nome": "Calça Skinny", "quantidade": 120, "valor": 840000 }
  ],
  "topCategorias": [
    { "categoriaId": "CAT001", "nome": "Calças", "quantidade": 300, "valor": 2100000 }
  ],
  "topClientes": [
    { "clienteId": "CLI001", "nome": "Loja Exemplo", "quantidade": 80, "valor": 560000 }
  ],
  "topCidades": [
    { "cidade": "São Paulo", "uf": "SP", "quantidade": 200, "valor": 1400000 }
  ]
}
```

> Valores monetários estão em **centavos**. Converter dividindo por 100 para exibição.

### `GET /api/erp/colecoes`

Retorna a lista de coleções disponíveis para popular o filtro.

```json
[{ "idExterno": "COL001", "nome": "Verão 2025", "ativo": true }]
```

---

## Filtros

Localizado no topo da página, antes de qualquer card ou gráfico.

### 1. Filtro por Coleção
- **Tipo:** Select dropdown com busca/pesquisa
- **Opções:** lista de coleções do endpoint `GET /api/erp/colecoes` + opção "Todas as coleções"
- **Comportamento:** ao selecionar uma coleção, todos os dados da página são recarregados com `colecaoId` na query
- **Estado padrão:** "Todas as coleções" (sem filtro)

### 2. Agrupamento do Gráfico (`groupBy`)
- **Tipo:** Toggle/SegmentedControl com 3 opções: **Dia / Semana / Mês**
- **Escopo:** afeta apenas o gráfico de tendência, não os cards de resumo nem os rankings
- **Estado padrão:** "Dia"

---

## Seções da Página

### Seção 1 — Cards de Resumo (KPIs)

Grid de 4 cards exibindo os principais indicadores do período/coleção selecionada.

| Card | Dado | Formatação |
|------|------|-----------|
| Total em Vendas | `summary.totalValor` | Moeda (R$ 48.500,00) |
| Pedidos Realizados | `summary.totalPedidos` | Número inteiro |
| Peças Vendidas | `summary.totalQuantidade` | Número inteiro |
| Ticket Médio | `summary.ticketMedio` | Moeda (R$ 1.127,90) |

- Layout: `grid 2 colunas (mobile) → 4 colunas (desktop)`
- Cada card tem: ícone + label + valor em destaque + subtexto opcional
- Exibir skeleton durante carregamento

---

### Seção 2 — Penetração de Carteira

Card dedicado mostrando quantos clientes ativos foram atendidos.

**Dados:**
- `clientesAtivos` — total de clientes ativos na carteira do representante
- `clientesAtendidos` — quantos compraram na coleção selecionada (ou no geral)

**Exibição:**
- Número grande centralizado: `"87 de 120 clientes atendidos"`
- Barra de progresso horizontal: percentual = `Math.floor((atendidos / ativos) * 100)`
- Badge ou texto abaixo com o percentual: ex. `"72% da carteira"`
- Subtexto: "nesta coleção" (se filtro de coleção ativo) ou "no total"

> Quando nenhuma coleção está selecionada, `clientesAtendidos` representa todos que fizeram algum pedido.

---

### Seção 3 — Gráfico de Tendência de Vendas

Gráfico combinado (linha + barras) mostrando a evolução de vendas ao longo do tempo.

**Dados:** array `chart` — cada item tem `periodo` (data), `valor`, `quantidade`

**Tipo de gráfico:** ComposedChart (Recharts)
- **Barras:** `quantidade` (peças vendidas) — eixo Y secundário à direita
- **Linha/Área:** `valor` (R$) — eixo Y principal à esquerda

**Eixo X:**
- Agrupamento por `groupBy`:
  - `day` → exibir como `DD/MM`
  - `week` → exibir como `Sem DD/MM`
  - `month` → exibir como `mês abreviado + ano` (ex: "mar/25")

**Tooltip:** ao passar o mouse, exibir data formatada + valor em R$ + quantidade em peças

**Estado vazio:** texto "Nenhum dado no período selecionado"

---

### Seção 4 — Rankings (4 cards lado a lado em desktop, empilhados em mobile)

Cada ranking exibe uma lista ordenada com barra de progresso relativa ao primeiro colocado.

**Controle de ordenação (por card):**
- Toggle interno ao card: **Valor (R$)** | **Quantidade (peças)**
- Ordenação aplicada localmente no frontend (os dados já chegam completos da API)

#### 4.1 Top Produtos
- Dados: `topProdutos`
- Campos: `produtoId` (código), `nome`, `valor`, `quantidade`
- Exibir código do produto como badge secundário

#### 4.2 Top Categorias
- Dados: `topCategorias`
- Campos: `categoriaId`, `nome`, `valor`, `quantidade`

#### 4.3 Top Clientes
- Dados: `topClientes`
- Campos: `clienteId`, `nome`, `valor`, `quantidade`

#### 4.4 Top Cidades
- Dados: `topCidades`
- Campos: `cidade`, `uf`, `valor`, `quantidade`
- Exibir como `"São Paulo - SP"`

**Layout de cada item no ranking:**
```
[nº] [nome/label          ████████░░░░░░░  ]  [R$ valor]
                                                [999 un.]
```

- Número de posição (1, 2, 3...) em destaque
- Nome com barra de progresso relativa (100% = primeiro colocado)
- Valor em R$ + quantidade em peças alinhados à direita
- Máximo de 10 itens por ranking
- Skeleton durante carregamento

---

## Estados de Loading

- Todos os cards, o gráfico e os rankings devem exibir **skeletons** enquanto a query está em andamento (`isLoading`)
- Os filtros ficam desabilitados durante o carregamento

---

## Estados Vazios

- Se `summary.totalPedidos === 0`: exibir mensagem central "Nenhuma venda registrada no período" com sugestão de alterar os filtros
- Rankings com array vazio: exibir "Nenhum dado disponível" dentro do próprio card

---

## Comportamento dos Filtros

- **Mudança de coleção:** refaz a query completa (invalida cache e rebusca)
- **Mudança de `groupBy`:** pode ser feita localmente apenas para o gráfico, ou refazendo a query (ambos funcionam)
- Os filtros selecionados devem persistir enquanto o usuário estiver na página (state local)
- Não é necessário sincronizar os filtros na URL (sem `URLSearchParams`)

---

## Considerações Técnicas

- Usar `useQuery` do TanStack Query v5 com `queryKey: ['/api/rep/analytics', { colecaoId, groupBy }]`
- Usar `useQuery` separado para coleções: `queryKey: ['/api/erp/colecoes']`
- Valores monetários: sempre dividir por 100 antes de exibir, usar `toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })`
- Percentuais: usar `Math.floor()` para arredondar para baixo
- Todos os elementos interativos devem ter `data-testid` descritivo
- Responsividade: a página deve funcionar bem em mobile (320px+) e desktop

---

## Arquivos de Referência

Ao implementar, consultar os seguintes arquivos do projeto para manter consistência de padrões:

| Arquivo | O que observar |
|---------|---------------|
| `client/src/pages/rep/rep-dashboard.tsx` | Layout geral, cards de meta, padrão de loading |
| `client/src/pages/rep/rep-clientes.tsx` | Filtros, grid de stats, paginação |
| `client/src/pages/rep/rep-pedidos.tsx` | Tabelas, badges de status, filtro por select |
| `client/src/components/rep-sidebar.tsx` | Sidebar e estrutura de navegação |
| `client/src/pages/rep/rep-analytics.tsx` | Página atual — referência direta para componentes já implementados |
