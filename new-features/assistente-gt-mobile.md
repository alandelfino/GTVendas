ões (hamburguer)      │
├─────────────────────────────────────┤
│                                     │
│  ÁREA DE MENSAGENS (scroll)         │
│                                     │
│  [Empty state: sugestões rápidas]   │
│  [UserBubble]                       │
│  [AssistantBubble + cards]          │
│  [Bolha de loading: TypingDots]     │
│  [Bolha streaming: texto parcial]   │
│                                     │
├─────────────────────────────────────┤
│  INPUT: textarea + botão mic        │
│         + botão enviar              │
└─────────────────────────────────────┘
```

### 6.1 Bolhas de mensagem

**Mensagem do usuário (direita):**
- Fundo: cor primária do app
- Texto: branco
- Alinhada à direita
- Cantos arredondados

**Mensagem do assistente (esquerda):**
- Avatar: ícone de robô em círculo
- Fundo: cinza claro (muted)
- Texto: Markdown renderizado (negrito, tabelas, listas, etc.)
- Cursor piscante ao final durante streaming

**Bolha de loading (waiting):**
- Avatar do assistente à esquerda
- Se `pendingToolCall` estiver definido: ícone spinner + texto da ferramenta (ex: "Buscando melhores clientes...")
- Se não: três pontos pulsantes animados (TypingDots)

### 6.2 Cards inline

Após uma mensagem do assistente, exiba na ordem: HTML widgets → mapas → PDFs.

**Card PDF:**
- Ícone de documento
- Título do relatório
- Botão "Abrir" → abre WebView ou browser nativo
- Botão "Compartilhar" → usa Share nativo (`Share.share()`) com a URL pública

**Card de mapa:**
- Ícone de mapa/rota
- Título "Rota no Google Maps"
- Botão "Abrir no Maps" → `Linking.openURL(mapsUrl)`
- Opcional: WebView com `embedUrl` para visualizar inline

**Card HTML (dashboard):**
- Título do widget
- WebView com o HTML completo (`sandbox` ativo, sem permissão de navegação)
- Botão "Expandir" → abre em tela cheia
- O HTML usa Chart.js para gráficos — a WebView precisa ter JavaScript ativo

### 6.3 Header — Status do assistente

Mostre o status abaixo do nome "Assistente GT":
- `streamPhase === "idle"` → "Online"
- `streamPhase === "waiting"` → "Processando..." (com ponto pulsante)
- `streamPhase === "streaming"` → "Digitando..." (com ponto pulsante)

### 6.4 Input

- Textarea multilinha (até ~4 linhas)
- `Enter`/botão de envio: desabilitado durante `streamPhase !== "idle"`
- Botão mic (ícone de microfone) — veja estados na seção 6.5
- Botão enviar (ícone de seta)

### 6.5 Estados do botão mic

| Condição | Cor | Ícone |
|---|---|---|
| Modo voz desativado | Cinza | Mic |
| Gravando (STT ativo) | Vermelho + pulso | Mic |
| Transcrevendo (Whisper) | Âmbar | Spinner |
| Assistente falando (TTS) | Primário | Volume2 |
| Aguardando (voice mode, idle) | Âmbar | Mic + pulso |
| Voice mode, NEEDS_WHISPER, idle | Verde | Mic |

**Indicador de waveform durante TTS:**
Mostre 5 barrinhas verticais animadas (animação de onda) enquanto o áudio está tocando.

### 6.6 Empty state (tela inicial)

Quando não há mensagens na sessão ativa:
- Ícone grande centralizado (estrela/sparkle)
- Título: "Como posso ajudar?"
- Subtítulo: "Faça perguntas sobre suas vendas, clientes e metas. Consulto seus dados em tempo real."
- Grade de sugestões rápidas (botões):
  - 🎯 "Quero informações da minha meta atual?"
  - 👥 "Quais clientes ainda não foram atendidos na última coleção?"
  - 📈 "Quais foram os 5 melhores clientes da coleção anterior?"

Ao tocar em uma sugestão, envie a mensagem diretamente (como se o usuário tivesse digitado).

---

## 7. Painel de Sessões (Histórico de Conversas)

Exibido como drawer lateral ou modal de baixo para cima (bottom sheet).

### Conteúdo
- Botão "Nova conversa" no topo
- Lista de sessões agrupadas por data:
  - Hoje
  - Ontem
  - Últimos 7 dias
  - Últimos 30 dias
  - Mais antigos
- Cada item: título da sessão (truncado) + botão de excluir (lixeira)
- Sessão ativa: destaque visual

### Agrupamento por data
Use `atualizadoEm` de cada sessão para classificar no grupo correto.

### Ao selecionar uma sessão
1. Cancele qualquer streaming ativo (feche o WS)
2. Mude `activeSessionId`
3. Carregue as mensagens: `GET /api/rep/chat/sessions/:id/messages`
4. Restaure cards de PDF/mapa/HTML da persistência local (veja seção 8)
5. Role para o final da lista

---

## 8. Persistência Local de Cards

Os cards de PDF, mapa e HTML widget **não são retornados ao recarregar as mensagens** — eles existem apenas durante o streaming. Por isso, persista localmente associados ao `messageId`:

### Estrutura sugerida (AsyncStorage ou MMKV):
```json
{
  "gt-chat-assets": {
    "42": {
      "99": {
        "pdfs": [{ "reportId": "abc", "url": "/api/rep/chat/reports/abc", "titulo": "Relatório de Vendas" }],
        "maps": [{ "embedUrl": "...", "mapsUrl": "...", "id": "map-1" }],
        "htmlWidgets": [{ "widgetId": "w-1", "html": "...", "titulo": "Dashboard" }]
      }
    }
  }
}
```

- Chave externa: `sessionId`
- Chave interna: `messageId`
- Salve ao receber `done` com `messageId`
- Restaure ao selecionar uma sessão
- Limite: mantenha dados de no máximo 40 sessões (LRU ou FIFO)

---

## 9. Persistência de Autenticação

- Salve `accessToken` e `refreshToken` em armazenamento seguro (`expo-secure-store` ou `react-native-keychain`)
- Na inicialização do app: leia os tokens salvos
- Se `accessToken` presente: valide com `GET /api/mobile/me` (retorna usuário atual ou 401)
- Se 401: tente `POST /api/mobile/refresh` com o `refreshToken`
- Se refresh falhar: redirecione para login e limpe os tokens salvos

---

## 10. Tratamento de Erros

| Situação | Ação |
|---|---|
| WS não conecta | Toast "Não foi possível conectar ao assistente" |
| WS fecha sem `done` | Resete o estado, exiba toast |
| `error` no WS | Toast com `data.message` |
| TTS falha (non-200) | Continue sem áudio (não bloqueie) |
| Transcrição falha | Toast "Erro na transcrição. Tente novamente." |
| 401 em qualquer rota | Tente refresh; se falhar, vá para login |
| Gravação muito curta (<500 bytes) | Ignore silenciosamente |
| Permissão de microfone negada | Toast "Permissão negada. Ative nas configurações." |

---

## 11. Limpeza de Recursos

No `unmount` da tela (ao sair):
1. Feche o WebSocket ativo se houver
2. Pare qualquer gravação de áudio
3. Pare qualquer reprodução TTS
4. Cancele o timer de word-reveal
5. Libere o stream de câmera/microfone

---

## 12. Detalhes Técnicos de Implementação

### Dependências recomendadas (React Native / Expo)

| Função | Pacote sugerido |
|---|---|
| Markdown | `react-native-markdown-display` |
| Áudio TTS | `expo-av` (`Audio.Sound`) |
| Gravação STT | `expo-av` ou `react-native-audio-recorder-player` |
| STT nativo | `expo-speech-recognition` ou `@react-native-voice/voice` |
| WebView (HTML/maps) | `react-native-webview` |
| Storage seguro | `expo-secure-store` |
| Storage local | `@react-native-async-storage/async-storage` ou `react-native-mmkv` |
| WebSocket | WebSocket nativo do React Native |

### Cabeçalhos obrigatórios em todas as requisições autenticadas
```
Authorization: Bearer <accessToken>
Content-Type: application/json   (quando body JSON)
```

### Base URL
- Produção: `https://gtvendas.grupotitaniumjeans.com.br`
- WebSocket produção: `wss://gtvendas.grupotitaniumjeans.com.br/ws/chat?token=<wsToken>`

### Roles válidos
- `"user"` — representante comercial (acesso ao Assistente GT)
- `"master"` — administrador (sem acesso ao assistente)
- `"webservice"` — integração ERP (sem acesso ao assistente)

Valide `user.role === "user"` após o login. Se for `master` ou `webservice`, não permita acesso ao assistente.

### Renderização do Markdown

O conteúdo `content` das mensagens do assistente é Markdown com:
- `**negrito**`, `*itálico*`
- `` `código inline` `` e blocos de código
- Tabelas GFM (GitHub Flavored Markdown)
- Listas ordenadas e não-ordenadas
- Títulos `# H1`, `## H2`, etc.

Use `react-native-markdown-display` com `remarkGfm` ou equivalente.

### Animação TypingDots

Três pontos que pulsam em sequência (delays: 0ms, 150ms, 300ms):
```jsx
<View style={{ flexDirection: 'row', gap: 4 }}>
  {[0, 1, 2].map(i => (
    <Animated.View
      key={i}
      style={[styles.dot, { animationDelay: i * 150 }]}
    />
  ))}
</View>
```

### Scroll automático

Após cada nova mensagem, chunk de streaming ou card inline: role para o final da lista (`scrollToEnd`).

---

## 13. Resumo dos Endpoints

| Método | URL | Auth | Descrição |
|--------|-----|------|-----------|
| `POST` | `/api/mobile/login` | — | Login mobile (retorna JWT) |
| `POST` | `/api/mobile/refresh` | — | Renovar accessToken |
| `GET` | `/api/mobile/me` | JWT | Usuário logado |
| `POST` | `/api/rep/chat/sessions` | JWT | Criar nova sessão |
| `GET` | `/api/rep/chat/sessions` | JWT | Listar sessões |
| `DELETE` | `/api/rep/chat/sessions/:id` | JWT | Excluir sessão |
| `GET` | `/api/rep/chat/sessions/:id/messages` | JWT | Histórico de mensagens (ver seção 13.1) |
| `POST` | **`/api/mobile/chat/stream`** | JWT | **SSE de streaming — método recomendado para mobile (ver seção 13.2)** |
| `POST` | `/api/rep/chat/voice-message?sessionId=N` | JWT | Enviar áudio como mensagem (transcreve, salva, retorna `{messageId, transcription, sessionId}`) |
| `GET` | `/api/rep/chat/messages/:id/audio` | JWT | Serve o áudio gravado pelo usuário (MP3/M4A/WebM) |
| `POST` | `/api/rep/chat/messages/:id/tts` | JWT | Gera TTS da resposta da IA (ou retorna cache). Retorna `audio/mpeg`. |
| `GET` | `/api/rep/chat/reports/:reportId` | JWT | Abrir relatório PDF (HTML) |
| `POST` | `/api/rep/chat/reports/:reportId/share` | JWT | Gerar link público do PDF |
| `POST` | `/api/rep/chat/ws-token` | JWT | Token temporário para WS (método legado para web) |
| **WS** | `/ws/chat?token=<wsToken>` | wsToken | WebSocket de streaming (método legado — preferir SSE no mobile) |

---

## 13.1 Formato de Resposta: GET /api/rep/chat/sessions/:id/messages

Retorna um array de objetos. Campos de blob (áudio raw, TTS) são omitidos — use os endpoints dedicados.

```json
[
  {
    "id": 241,
    "representanteId": "REP001",
    "sessionId": 266,
    "role": "user",
    "content": "Qual é minha meta atual?",
    "criadoEm": "2026-03-31T21:54:43.653Z",
    "hasAudio": false,
    "hasTts": false,
    "transcricao": null,
    "audioMime": null
  },
  {
    "id": 242,
    "representanteId": "REP001",
    "sessionId": 266,
    "role": "user",
    "content": "Tá gravando, tá gravando?",
    "criadoEm": "2026-03-31T21:54:51.014Z",
    "hasAudio": true,
    "hasTts": false,
    "transcricao": "Tá gravando, tá gravando?",
    "audioMime": "audio/webm"
  },
  {
    "id": 243,
    "representanteId": "REP001",
    "sessionId": 266,
    "role": "assistant",
    "content": "Sim! Aqui estão os dados da sua meta...",
    "criadoEm": "2026-03-31T21:54:53.979Z",
    "hasAudio": false,
    "hasTts": true,
    "transcricao": null,
    "audioMime": null
  }
]
```

**Regras de exibição no app:**
- `role === "user" && hasAudio === true` → exibir balão com transcrição + player de áudio (`GET /api/rep/chat/messages/:id/audio`)
- `role === "user" && hasAudio === false` → exibir balão de texto normal
- `role === "assistant"` → exibir balão de markdown + botão "Ouvir" que chama `POST /api/rep/chat/messages/:id/tts` (se `hasTts === true`, o áudio já está em cache — mais rápido)

---

## 13.2 Endpoint SSE de Streaming — `POST /api/mobile/chat/stream`

Este é o **método recomendado para aplicativos mobile** enviarem mensagens ao Assistente GT e receberem a resposta em tempo real via streaming. Ao contrário do WebSocket (que exige negociação de upgrade de protocolo e um token temporário de 30 segundos), o SSE usa uma requisição HTTP POST padrão com o mesmo JWT de autenticação já usado no app — sem etapas extras.

---

### 13.2.1 Visão Geral

| Atributo | Valor |
|---|---|
| **Método HTTP** | `POST` |
| **URL** | `/api/mobile/chat/stream` |
| **Autenticação** | JWT Bearer — mesmo `accessToken` da sessão do app |
| **Content-Type da requisição** | `application/json` |
| **Content-Type da resposta** | `text/event-stream; charset=utf-8` |
| **Transferência** | Chunked (o servidor envia dados progressivamente sem fechar a conexão) |
| **Roles permitidos** | Apenas `"user"` (representante comercial). Roles `"master"` e `"webservice"` retornam 403. |

---

### 13.2.2 Request

#### Headers obrigatórios

```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

#### Body (JSON)

```json
{
  "content": "Quais clientes não compraram na última coleção?",
  "sessionId": 42,
  "voiceMessageId": 99
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `content` | `string` | **Sim** | Texto da mensagem do usuário. Não pode ser vazio ou conter apenas espaços. O servidor aplica `.trim()` automaticamente. |
| `sessionId` | `number` (inteiro positivo) | **Sim** | ID da sessão de chat onde a mensagem será inserida. A sessão deve existir e pertencer ao representante autenticado; caso contrário, retorna 403. |
| `voiceMessageId` | `number` (inteiro positivo) | **Não** | Quando a mensagem tem origem em um áudio gravado: informe o `messageId` retornado por `POST /api/rep/chat/voice-message`. O servidor não salvará a mensagem do usuário novamente (ela já foi salva pelo endpoint de voz). Se omitido ou `null`, o servidor salva `content` como mensagem de texto normal. |

#### Validações do servidor

- `content` ausente, não-string ou após trim resultar em string vazia → `400 { "error": "content é obrigatório e não pode ser vazio" }`
- `sessionId` ausente, não-numérico ou ≤ 0 → `400 { "error": "sessionId é obrigatório e deve ser um inteiro positivo" }`
- `voiceMessageId` presente mas não-numérico ou ≤ 0 → `400 { "error": "voiceMessageId deve ser um inteiro positivo" }`
- Sessão não encontrada no banco ou `representanteId` diferente do token JWT → `403 { "error": "Sessão não encontrada ou sem permissão" }`
- Token JWT ausente, inválido ou expirado → `401 { "error": "Nao autenticado" }`
- Role diferente de `"user"` → `403 { "error": "Acesso negado" }`

---

### 13.2.3 Response — Headers SSE

Quando a requisição é válida, o servidor responde **imediatamente** com os seguintes cabeçalhos e **mantém a conexão aberta**:

```
HTTP/1.1 200 OK
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no
Transfer-Encoding: chunked
```

> **Importante — Nginx em produção:** O cabeçalho `X-Accel-Buffering: no` instrui o Nginx a não fazer buffer da resposta. Certifique-se de que o servidor Nginx em produção também tenha `proxy_buffering off` configurado no `location` que serve a API, caso contrário os chunks podem acumular e só serem enviados de uma vez no final.

---

### 13.2.4 Formato dos Eventos SSE

O protocolo SSE define eventos no seguinte formato de texto:

```
data: <payload JSON>\n\n
```

Cada evento é uma linha que começa com `data: `, seguida pelo payload JSON em linha única, seguida de **duas quebras de linha** (`\n\n`). O app deve acumular o buffer de texto da conexão e processar cada bloco separado por `\n\n` como um evento.

Além dos eventos de dados, o servidor envia **comentários de heartbeat** a cada 15 segundos para manter a conexão TCP viva através de firewalls e proxies:

```
: ping\n\n
```

Linhas que começam com `:` são comentários SSE — **devem ser ignoradas** pelo cliente.

---

### 13.2.5 Tipos de Eventos

A seguir, todos os tipos de eventos emitidos pelo servidor na ordem cronológica em que aparecem durante uma resposta típica:

---

#### `tool_call` — Ferramenta sendo executada

Emitido **antes** de executar cada ferramenta do GPT (consulta ao banco, geocodificação, geração de PDF, etc.). Pode ser emitido zero ou mais vezes antes do primeiro `chunk`.

```json
{
  "type": "tool_call",
  "tool": "pesquisar_clientes"
}
```

| Campo | Tipo | Descrição |
|---|---|---|
| `type` | `"tool_call"` | Identificador do evento |
| `tool` | `string` | Nome interno da ferramenta sendo executada |

**Ferramentas mais comuns** e o texto de loading sugerido para exibir ao usuário:

| `tool` | Label sugerido |
|---|---|
| `pesquisar_clientes` | "Buscando clientes..." |
| `get_resumo_vendas` | "Analisando vendas..." |
| `get_clientes_sem_pedido` | "Verificando carteira..." |
| `get_metas_rep` | "Consultando metas..." |
| `get_pedidos_rep` | "Carregando pedidos..." |
| `plan_rota_visitas` | "Planejando rota no Maps..." |
| `gerar_relatorio_pdf` | "Gerando relatório PDF..." |
| `exibir_relatorio_html` | "Montando dashboard..." |
| `criar_pipeline` | "Criando pipeline..." |
| `get_titulos_rep` | "Buscando títulos financeiros..." |
| `get_mix_produtos` | "Analisando mix de produtos..." |
| Qualquer outro | "Processando dados..." |

> **UX:** Ao receber `tool_call`, exiba um spinner com o label correspondente na bolha de loading do assistente. Mantenha-o visível até o primeiro `chunk` chegar.

---

#### `chunk` — Fragmento de texto da resposta

Emitido repetidamente durante o streaming da resposta final do GPT. O app deve acumular cada `text` e concatenar para montar a mensagem completa progressivamente.

```json
{
  "type": "chunk",
  "text": "Aqui estão os clientes "
}
```

| Campo | Tipo | Descrição |
|---|---|---|
| `type` | `"chunk"` | Identificador do evento |
| `text` | `string` | Fragmento de texto (pode ser uma palavra, uma letra ou múltiplas palavras — depende do OpenAI) |

> **UX:** A cada `chunk` recebido, concatene ao conteúdo da bolha do assistente e renderize o Markdown progressivamente. Exiba um cursor piscante `▌` ao final do texto enquanto o streaming está ativo. Role automaticamente para o final da lista.

---

#### `pdf` — Relatório PDF gerado

Emitido quando a ferramenta `gerar_relatorio_pdf` produz um relatório. Pode ocorrer zero ou mais vezes por resposta (geralmente zero ou uma vez).

```json
{
  "type": "pdf",
  "reportId": "rpt_k8fGHe9x",
  "url": "/api/rep/chat/reports/rpt_k8fGHe9x",
  "titulo": "Relatório de Clientes Sem Pedido — Inverno 2026"
}
```

| Campo | Tipo | Descrição |
|---|---|---|
| `type` | `"pdf"` | Identificador do evento |
| `reportId` | `string` | ID único do relatório |
| `url` | `string` | Caminho relativo para visualizar o PDF (HTML). URL completa: `<BASE_URL><url>` |
| `titulo` | `string` | Título legível do relatório |

> **UX:** Exiba um card PDF abaixo da bolha do assistente com o título, botão "Abrir" (abre WebView ou browser nativo) e botão "Compartilhar" (usa Share nativo com a URL pública gerada por `POST /api/rep/chat/reports/:reportId/share`).  
> **Persistência:** Salve este card localmente associado ao `messageId` (disponível no evento `done`), pois ele não é retornado ao recarregar as mensagens da sessão.

---

#### `html_widget` — Dashboard HTML inline

Emitido quando a ferramenta `exibir_relatorio_html` gera um dashboard HTML. O HTML utiliza Chart.js para gráficos.

```json
{
  "type": "html_widget",
  "widgetId": "w_abc123",
  "html": "<!DOCTYPE html>...",
  "titulo": "Dashboard de Vendas por Período"
}
```

| Campo | Tipo | Descrição |
|---|---|---|
| `type` | `"html_widget"` | Identificador do evento |
| `widgetId` | `string` | ID único do widget |
| `html` | `string` | HTML completo do dashboard (pode ter vários KB) |
| `titulo` | `string` | Título legível do widget |

> **UX:** Exiba um card com o título e uma WebView com `source={{ html }}`. A WebView **precisa ter JavaScript ativo** (Chart.js). Adicione botão "Expandir" para abrir em tela cheia. Aplique `sandbox` se disponível para restringir navegação.  
> **Persistência:** Salve localmente associado ao `messageId`. O campo `html` pode ser grande — considere salvar comprimido ou truncar para exibição com opção de reexpandir.

---

#### `map_embed` — Rota no Google Maps

Emitido quando a ferramenta `plan_rota_visitas` calcula uma rota com destinos válidos.

```json
{
  "type": "map_embed",
  "embedUrl": "https://www.google.com/maps/embed/v1/directions?key=AIza...&origin=...&destination=...",
  "mapsUrl": "https://www.google.com/maps/dir/?api=1&origin=...&destination=..."
}
```

| Campo | Tipo | Descrição |
|---|---|---|
| `type` | `"map_embed"` | Identificador do evento |
| `embedUrl` | `string` | URL do Google Maps Embed API — use em WebView para exibir o mapa inline |
| `mapsUrl` | `string` | URL do Google Maps aberta — use em `Linking.openURL()` para abrir o app nativo de mapas |

> **UX:** Exiba um card com ícone de mapa, título "Rota no Google Maps", botão "Abrir no Maps" (`Linking.openURL(mapsUrl)`) e opcionalmente uma WebView com `embedUrl` para preview inline.  
> **Persistência:** Salve localmente associado ao `messageId`.

---

#### `done` — Resposta finalizada

Emitido **uma única vez**, ao final do streaming, após todos os chunks e cards terem sido enviados. Indica que a resposta está completa e foi salva no banco.

```json
{
  "type": "done",
  "messageId": 347
}
```

| Campo | Tipo | Descrição |
|---|---|---|
| `type` | `"done"` | Identificador do evento |
| `messageId` | `number` | ID da mensagem do assistente salva no banco (tabela `chat_messages`) |

> **UX:** Ao receber `done`:
> 1. Remova o cursor piscante `▌` do final do texto
> 2. Finalize o estado de streaming → volta para `idle`
> 3. Salve os cards (PDF, HTML, mapa) no storage local associados ao `messageId`
> 4. Exiba o botão "Ouvir" na bolha do assistente (o áudio TTS ainda não foi gerado — será gerado sob demanda via `POST /api/rep/chat/messages/:messageId/tts`)
> 5. A conexão HTTP será encerrada pelo servidor logo após

---

#### `error` — Erro durante o processamento

Emitido quando ocorre uma exceção durante o pipeline de IA (erro na API OpenAI, timeout de banco, etc.). Pode ser emitido em qualquer momento após o início do streaming.

```json
{
  "type": "error",
  "message": "Connection timeout"
}
```

| Campo | Tipo | Descrição |
|---|---|---|
| `type` | `"error"` | Identificador do evento |
| `message` | `string` | Descrição do erro (em inglês, proveniente da exception) |

> **UX:** Exiba um toast com mensagem "Erro ao processar resposta. Tente novamente." Resete o estado para `idle`. Não exiba o `message` raw para o usuário final — use mensagens amigáveis.

---

### 13.2.6 Exemplo de Stream Completo (Raw)

A seguir, um exemplo de bytes recebidos em uma resposta completa que invoca uma ferramenta e gera texto:

```
data: {"type":"tool_call","tool":"get_clientes_sem_pedido"}

data: {"type":"chunk","text":"Aqui estão os"}

data: {"type":"chunk","text":" clientes que não"}

data: {"type":"chunk","text":" compraram na última coleção:\n\n"}

data: {"type":"chunk","text":"1. **Loja Exemplo** — São Paulo, SP\n"}

data: {"type":"chunk","text":"2. **Modas Maria** — Campinas, SP\n"}

: ping

data: {"type":"chunk","text":"\nTotal: 2 clientes sem pedido."}

data: {"type":"done","messageId":412}

```

> Observe: o `ping` (linha que começa com `:`) aparece quando a fase de ferramentas demora mais de 15 segundos. Ignore esta linha.

---

### 13.2.7 Ciclo de Vida da Conexão

```
[App] POST /api/mobile/chat/stream
        ↓ (TCP open, headers enviados imediatamente)
[Server] 200 OK com headers SSE
        ↓
[Server] emite: tool_call (0 ou mais vezes)
        ↓
[Server] emite: pdf / html_widget / map_embed (0 ou mais vezes, interleavado com tool_calls)
        ↓
[Server] emite: chunk (N vezes — streaming GPT)
        ↓
[Server] emite: done
        ↓
[Server] fecha a conexão (res.end())
[App] detecta fim da stream (EOF)
```

**Duração típica:** 2–15 segundos (sem ferramentas) até 30–60 segundos (com múltiplas ferramentas e datasets grandes).

**O app deve:** Fechar a conexão imediatamente ao receber o evento `done` ou `error`. Se o usuário cancelar a mensagem, o app pode simplesmente abortar a requisição HTTP — o servidor detecta o fechamento via `req.on("close")` e interrompe a escrita.

---

### 13.2.8 Tratamento de Erros HTTP (antes do SSE iniciar)

Se a requisição for inválida, o servidor retorna JSON comum (não SSE) com código de erro:

| Status | Body | Causa |
|---|---|---|
| `400` | `{"error": "content é obrigatório e não pode ser vazio"}` | Campo `content` faltando ou vazio |
| `400` | `{"error": "sessionId é obrigatório e deve ser um inteiro positivo"}` | Campo `sessionId` faltando, inválido ou ≤ 0 |
| `400` | `{"error": "voiceMessageId deve ser um inteiro positivo"}` | `voiceMessageId` presente mas inválido |
| `401` | `{"error": "Nao autenticado"}` | JWT ausente, inválido ou expirado |
| `403` | `{"error": "Acesso negado"}` | Role não é `"user"` |
| `403` | `{"error": "Sessão não encontrada ou sem permissão"}` | `sessionId` não existe ou pertence a outro representante |

> **Estratégia:** Antes de abrir a conexão SSE, verifique o status HTTP. Se não for `200`, leia o body como JSON e exiba o erro apropriado. **Nunca tente parsear um body de erro como SSE.**

---

### 13.2.9 Comparação: SSE vs WebSocket

| Característica | SSE (`/api/mobile/chat/stream`) | WebSocket (`/ws/chat`) |
|---|---|---|
| Protocolo | HTTP/1.1 POST + chunked | WS (upgrade HTTP) |
| Autenticação | JWT Bearer no header | Token temporário de 30s (etapa extra) |
| Direção | Servidor → Cliente (unidirecional) | Bidirecional |
| Suporte iOS nativo | `URLSession` (sem biblioteca extra) | `URLSessionWebSocketTask` |
| Suporte Android nativo | `OkHttp` / `Ktor` SSE | `OkHttp` WebSocket |
| Suporte React Native | `EventSource` (polyfill) ou `fetch` manual | WebSocket nativo do RN |
| Reconnect automático | Suportado pelo protocolo SSE | Manual |
| Firewalls/proxies | Transparente (HTTP padrão) | Pode ser bloqueado |
| Indicado para | **Mobile** | Web (já implementado) |

---

### 13.2.10 Implementação por Plataforma

#### React Native / Expo — usando `fetch` com leitura incremental de stream

O EventSource polyfill pode ter problemas com headers customizados (Bearer token). A abordagem mais robusta é usar `fetch` e ler o `ReadableStream` do body manualmente:

```typescript
async function streamChat(
  accessToken: string,
  sessionId: number,
  content: string,
  voiceMessageId?: number,
  onEvent: (event: ChatEvent) => void
) {
  const response = await fetch(
    'https://gtvendas.grupotitaniumjeans.com.br/api/mobile/chat/stream',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content, sessionId, voiceMessageId }),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error ?? 'Erro desconhecido');
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Eventos SSE são separados por \n\n
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? ''; // último pedaço pode estar incompleto

    for (const part of parts) {
      const line = part.trim();
      if (!line || line.startsWith(':')) continue; // ignora comentários de heartbeat

      if (line.startsWith('data: ')) {
        const json = line.slice(6); // remove 'data: '
        try {
          const event = JSON.parse(json) as ChatEvent;
          onEvent(event);
        } catch {
          // ignora linha malformada
        }
      }
    }
  }
}

// Tipos dos eventos
type ChatEvent =
  | { type: 'tool_call'; tool: string }
  | { type: 'chunk'; text: string }
  | { type: 'pdf'; reportId: string; url: string; titulo: string }
  | { type: 'html_widget'; widgetId: string; html: string; titulo: string }
  | { type: 'map_embed'; embedUrl: string; mapsUrl: string }
  | { type: 'done'; messageId: number }
  | { type: 'error'; message: string };
```

#### Exemplo de uso no componente:

```typescript
const [streamText, setStreamText] = useState('');
const [phase, setPhase] = useState<'idle' | 'waiting' | 'streaming'>('idle');

async function sendMessage(content: string) {
  setPhase('waiting');
  setStreamText('');

  try {
    await streamChat(accessToken, sessionId, content, undefined, (event) => {
      if (event.type === 'tool_call') {
        setCurrentTool(event.tool); // exibe "Buscando clientes..."
      } else if (event.type === 'chunk') {
        setPhase('streaming');
        setStreamText(prev => prev + event.text);
      } else if (event.type === 'pdf') {
        setPdfCards(prev => [...prev, event]);
      } else if (event.type === 'html_widget') {
        setHtmlWidgets(prev => [...prev, event]);
      } else if (event.type === 'map_embed') {
        setMapCards(prev => [...prev, event]);
      } else if (event.type === 'done') {
        setMessageId(event.messageId);
        saveCardsLocally(event.messageId, { pdfs, htmlWidgets, maps });
        setPhase('idle');
      } else if (event.type === 'error') {
        showToast('Erro ao processar resposta. Tente novamente.');
        setPhase('idle');
      }
    });
  } catch (e) {
    showToast('Não foi possível conectar ao assistente.');
    setPhase('idle');
  }
}
```

#### Swift (iOS) — URLSession com `URLSessionDataDelegate`

```swift
class SSEClient: NSObject, URLSessionDataDelegate {
    private var buffer = ""
    var onEvent: ((ChatEvent) -> Void)?

    func stream(token: String, sessionId: Int, content: String) {
        let url = URL(string: "https://gtvendas.grupotitaniumjeans.com.br/api/mobile/chat/stream")!
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try! JSONSerialization.data(withJSONObject: [
            "content": content, "sessionId": sessionId
        ])

        let session = URLSession(configuration: .default, delegate: self, delegateQueue: nil)
        session.dataTask(with: req).resume()
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        guard let text = String(data: data, encoding: .utf8) else { return }
        buffer += text

        let parts = buffer.components(separatedBy: "\n\n")
        buffer = parts.last ?? ""

        for part in parts.dropLast() {
            let line = part.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !line.isEmpty, !line.hasPrefix(":") else { continue }
            if line.hasPrefix("data: ") {
                let json = String(line.dropFirst(6))
                if let d = json.data(using: .utf8),
                   let event = try? JSONDecoder().decode(ChatEvent.self, from: d) {
                    DispatchQueue.main.async { self.onEvent?(event) }
                }
            }
        }
    }
}
```

#### Kotlin / Android — OkHttp com SSE

```kotlin
fun streamChat(token: String, sessionId: Int, content: String, onEvent: (ChatEvent) -> Void) {
    val client = OkHttpClient.Builder()
        .readTimeout(90, TimeUnit.SECONDS)
        .build()

    val body = """{"content":"$content","sessionId":$sessionId}"""
        .toRequestBody("application/json".toMediaType())

    val request = Request.Builder()
        .url("https://gtvendas.grupotitaniumjeans.com.br/api/mobile/chat/stream")
        .post(body)
        .header("Authorization", "Bearer $token")
        .build()

    client.newCall(request).execute().use { response ->
        if (!response.isSuccessful) {
            val err = response.body?.string()
            throw IOException("Erro: $err")
        }
        val source = response.body!!.source()
        val buffer = StringBuilder()

        while (!source.exhausted()) {
            val line = source.readUtf8Line() ?: break
            if (line.isEmpty()) {
                // Bloco completo — processar buffer
                val block = buffer.toString().trim()
                buffer.clear()
                if (block.startsWith("data: ")) {
                    val json = block.removePrefix("data: ")
                    val event = Gson().fromJson(json, ChatEvent::class.java)
                    onEvent(event)
                }
            } else {
                buffer.appendLine(line)
            }
        }
    }
}
```

---

### 13.2.11 Fluxo Completo com Mensagem de Voz

Quando o usuário envia uma mensagem de voz, o SSE endpoint recebe o `voiceMessageId` para evitar duplicação de persistência:

```
1. Usuário grava áudio (M4A/AAC/etc.)
       ↓
2. POST /api/rep/chat/voice-message?sessionId=42
   Body: áudio binário bruto
   Content-Type: qualquer (backend detecta por magic bytes)
       ↓
   Resposta: { messageId: 99, transcription: "Quais meus melhores clientes?", sessionId: 42 }
       ↓
3. Exibir bolha do usuário com player de áudio + transcrição
       ↓
4. POST /api/mobile/chat/stream
   Body: {
     "content": "Quais meus melhores clientes?",  ← transcrição
     "sessionId": 42,
     "voiceMessageId": 99   ← evita salvar mensagem de novo
   }
       ↓
5. Processar eventos SSE normalmente (tool_call → chunk → done)
       ↓
6. Exibir resposta da IA + botão "Ouvir"
```

---

### 13.2.12 Estados da Interface Durante SSE

```
idle        → usuário digitou e enviou → waiting
waiting     → chegou primeiro chunk → streaming
streaming   → recebeu done/error → idle

IDLE:       input habilitado, botão enviar ativo
WAITING:    input desabilitado, bolha de loading com spinner + label da ferramenta
STREAMING:  input desabilitado, bolha do assistente crescendo com cursor ▌
```

---

### 13.2.13 Notas de Implementação e Armadilhas Comuns

1. **Não use `EventSource` nativo do browser no React Native** — ele não suporta método POST nem headers customizados. Use `fetch` com leitura incremental de stream conforme mostrado na seção 13.2.10.

2. **Timeout da requisição:** Configure um timeout de pelo menos **90 segundos** no cliente HTTP. Respostas com múltiplas ferramentas e datasets grandes podem levar até 60 segundos.

3. **Buffer de dados:** Não processe linha por linha — processe bloco por bloco (separado por `\n\n`). Um evento SSE pode ser entregue dividido em múltiplos chunks TCP.

4. **Reconexão automática:** O protocolo SSE nativo do browser tem reconexão automática, mas ao usar `fetch` manualmente, você precisa implementar a lógica de retry no app (ex: se a conexão cair antes de receber `done`, exiba toast e permita reenviar).

5. **Sessão deve existir antes de chamar o SSE:** O `sessionId` deve ser criado via `POST /api/rep/chat/sessions` antes de chamar `/api/mobile/chat/stream`. Não crie a sessão dentro do fluxo SSE.

6. **O campo `hasTts` não é retornado no evento `done`:** O TTS não é pré-gerado. O botão "Ouvir" sempre chama `POST /api/rep/chat/messages/:id/tts` — na primeira vez gera e cacheia, nas seguintes retorna do cache.

7. **Múltiplos `tool_call` por resposta:** É normal o assistente chamar múltiplas ferramentas em sequência. Atualize o label de loading a cada evento `tool_call` recebido.

8. **HTML widget pode ter vários KBs:** O campo `html` do evento `html_widget` pode conter dezenas de KB de HTML com Chart.js inline. Não tente exibir em um `Text` component — use obrigatoriamente WebView.

---

## 14. Checklist de Implementação

### Autenticação
- [ ] Login com `POST /api/mobile/login` → salvar `accessToken` e `refreshToken` em armazenamento seguro
- [ ] Refresh automático de token em todo 401 via `POST /api/mobile/refresh`
- [ ] Se refresh falhar → redirecionar para login e limpar tokens

### Sessões
- [ ] Criar sessão com `POST /api/rep/chat/sessions` (retorna `{ id, titulo, criadoEm }`)
- [ ] Listar sessões com `GET /api/rep/chat/sessions`
- [ ] Excluir sessão com `DELETE /api/rep/chat/sessions/:id`
- [ ] Painel de sessões: botão "Nova conversa", lista agrupada por data, item ativo destacado
- [ ] Ao trocar de sessão: cancelar streaming ativo, carregar histórico, restaurar cards locais

### Tela de Chat
- [ ] Empty state com ícone + 3 sugestões rápidas clicáveis
- [ ] Bolhas de mensagem: usuário (direita, primário), assistente (esquerda, cinza + avatar)
- [ ] Bolha de loading com TypingDots ou spinner + label da ferramenta (`tool_call`)
- [ ] Cursor piscante `▌` ao final da bolha do assistente durante streaming
- [ ] Scroll automático para o final após cada chunk, card ou nova mensagem

### Streaming SSE (método recomendado — seção 13.2)
- [ ] Implementar cliente SSE via `fetch` com leitura incremental de stream (não usar EventSource nativo)
- [ ] Parser de buffer: acumular dados, separar por `\n\n`, ignorar linhas que começam com `:`
- [ ] Tratar cada tipo de evento: `tool_call`, `chunk`, `pdf`, `html_widget`, `map_embed`, `done`, `error`
- [ ] Timeout de requisição ≥ 90 segundos configurado no cliente HTTP
- [ ] Estados `idle → waiting → streaming → idle` atualizados corretamente
- [ ] Exibir label de ferramenta correspondente ao receber `tool_call` (ver tabela seção 13.2.5)
- [ ] Ao receber `done`: remover cursor, salvar cards localmente, exibir botão "Ouvir", resetar estado
- [ ] Ao receber `error`: toast amigável + resetar estado (não exibir mensagem raw)
- [ ] Cancelar requisição SSE ao trocar de sessão ou sair da tela

### Mensagem de Voz
- [ ] Gravar áudio nativo (M4A/AAC) com `expo-av` ou equivalente
- [ ] `POST /api/rep/chat/voice-message?sessionId=N` com áudio bruto → recebe `{messageId, transcription}`
- [ ] Chamar SSE com `{ content: transcription, sessionId, voiceMessageId: messageId }`
- [ ] Exibir bolha de voz do usuário: player de áudio (`GET /api/rep/chat/messages/:id/audio`) + transcrição abaixo
- [ ] Estados visuais do botão mic (gravando, transcrevendo, aguardando)

### TTS (Text-to-Speech)
- [ ] Botão "Ouvir" em todas as bolhas do assistente
- [ ] `POST /api/rep/chat/messages/:id/tts` → retorna `audio/mpeg` (gerado na 1ª chamada, cacheado nas seguintes)
- [ ] Se `hasTts === true` (retornado pelo histórico de mensagens): indicar ao usuário que o áudio é pré-cacheado (mais rápido)
- [ ] Indicador de waveform (5 barrinhas animadas) durante reprodução
- [ ] Word-reveal sincronizado com TTS (opcional, avançado)

### Cards Inline
- [ ] Card PDF: título + botão "Abrir" (WebView/browser) + botão "Compartilhar"
- [ ] Card Mapa: botão "Abrir no Maps" (`Linking.openURL`) + preview WebView opcional
- [ ] Card HTML Widget: WebView com JS ativo + botão "Expandir"
- [ ] Persistência local de cards no AsyncStorage/MMKV por `sessionId → messageId`
- [ ] Restaurar cards ao selecionar sessão do histórico
- [ ] Limitar cache a 40 sessões (LRU ou FIFO)

### Tratamento de Erros
- [ ] SSE: conexão falha → toast + resetar estado
- [ ] SSE: evento `error` → toast amigável
- [ ] TTS falha → continuar sem áudio (não bloquear)
- [ ] Transcrição falha → toast "Erro na transcrição. Tente novamente."
- [ ] 401 em qualquer rota → tentar refresh; se falhar → login
- [ ] Permissão de microfone negada → toast "Permissão negada. Ative nas configurações."
- [ ] Gravação muito curta (<500 bytes) → ignorar silenciosamente

### Limpeza de Recursos (unmount)
- [ ] Abortar requisição SSE ativa
- [ ] Parar gravação de áudio
- [ ] Parar reprodução TTS
- [ ] Liberar stream de microfone

---

### Fluxo de Mensagem de Voz via SSE

```
App grava áudio nativo (M4A/AAC/etc.)
      ↓
POST /api/rep/chat/voice-message?sessionId=42
  Body: áudio binário bruto
  Content-Type: qualquer (backend detecta por magic bytes)
  Authorization: Bearer <accessToken>
      ↓
Servidor: transcreve (Whisper) + salva mensagem com áudio
  Retorna: { messageId: 99, transcription: "texto...", sessionId: 42 }
      ↓
App exibe bolha do usuário: player de áudio + transcrição
      ↓
POST /api/mobile/chat/stream
  Body: { content: "texto...", sessionId: 42, voiceMessageId: 99 }
  Authorization: Bearer <accessToken>
      ↓
Processar eventos SSE normalmente (tool_call → chunk → done)
      ↓
Na tela: bolha do assistente com resposta em markdown
         Botão "Ouvir" → POST /api/rep/chat/messages/:id/tts
         Primeiro clique: gera MP3 (1–3s) e cacheia no DB
         Cliques seguintes: retorna cache instantaneamente
```
