# Especificação da API — BetManager

**Base URL (local):** `http://localhost:8000/api`  
**Formato:** JSON  
**Documentação interativa:** `http://localhost:8000/docs` (Swagger UI)

---

## Convenções

### Formato de datas
- Datas: `YYYY-MM-DD` (ex: `"2024-09-06"`)
- Timestamps: ISO 8601 (ex: `"2024-09-06T14:30:00"`)

### Formato de valores monetários
- Todos os valores são números decimais com 2 casas (ex: `20.00`, `-15.50`)

### Resultados de apostas (`result`)
- `"won"` — ganhou
- `"lost"` — perdeu
- `"void"` — nula/cancelada
- `"pending"` — sem resultado ainda

### Tipos de aposta (`bet_type`)
- `"simple"` — aposta simples
- `"combined"` — aposta combinada

### Códigos de resposta HTTP
| Código | Significado                        |
|--------|------------------------------------|
| 200    | OK                                 |
| 201    | Criado com sucesso                 |
| 400    | Dados inválidos                    |
| 404    | Recurso não encontrado             |
| 422    | Erro de validação (Pydantic)       |
| 500    | Erro interno do servidor           |

---

## Apostas (`/bets`)

### `GET /bets` — Listar apostas

**Query parameters:**

| Parâmetro     | Tipo    | Padrão | Descrição                          |
|---------------|---------|--------|------------------------------------|
| `page`        | int     | 1      | Página atual                       |
| `per_page`    | int     | 25     | Itens por página (máx: 100)        |
| `date_from`   | date    | —      | Data inicial (YYYY-MM-DD)          |
| `date_to`     | date    | —      | Data final (YYYY-MM-DD)            |
| `result`      | string  | —      | Filtrar por resultado              |
| `sport_id`    | int     | —      | Filtrar por esporte                |
| `bookmaker_id`| int     | —      | Filtrar por casa                   |
| `bet_type`    | string  | —      | `simple` ou `combined`             |
| `search`      | string  | —      | Busca na descrição                 |
| `order_by`    | string  | `date` | Campo de ordenação                 |
| `order_dir`   | string  | `desc` | `asc` ou `desc`                    |

**Response `200`:**
```json
{
  "data": [
    {
      "id": 1,
      "date": "2024-09-06",
      "description": "Nneka O17.5P",
      "sport": { "id": 2, "name": "Basquete", "icon": "🏀" },
      "bookmaker": { "id": 1, "name": "Bet365", "color": "#007B5E" },
      "bet_type": "simple",
      "amount_wagered": 20.00,
      "odds": 1.77,
      "payout": 35.39,
      "profit": 15.39,
      "result": "won",
      "notes": null,
      "source": "ai_extract",
      "created_at": "2024-09-06T10:00:00"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 25,
    "total": 87,
    "total_pages": 4
  },
  "summary": {
    "total_wagered": 1740.00,
    "total_profit": 245.80,
    "hit_rate_pct": 58.6,
    "total_bets": 87
  }
}
```

---

### `POST /bets` — Criar aposta

**Body:**
```json
{
  "date": "2024-09-06",
  "description": "Brasil O2.5 HT",
  "sport_id": 1,
  "bookmaker_id": 2,
  "bet_type": "simple",
  "amount_wagered": 20.00,
  "odds": 1.75,
  "payout": 35.00,
  "result": "won",
  "notes": "opcional",
  "combined_id": null
}
```

**Response `201`:**
```json
{
  "id": 42,
  "date": "2024-09-06",
  "description": "Brasil O2.5 HT",
  "sport": { "id": 1, "name": "Futebol", "icon": "⚽" },
  "bookmaker": { "id": 2, "name": "Superbet", "color": "#E63946" },
  "bet_type": "simple",
  "amount_wagered": 20.00,
  "odds": 1.75,
  "payout": 35.00,
  "profit": 15.00,
  "result": "won",
  "notes": null,
  "source": "manual",
  "created_at": "2024-09-06T14:32:00"
}
```

---

### `POST /bets/batch` — Criar múltiplas apostas (retorno do extrator IA)

**Body:**
```json
{
  "bets": [
    {
      "date": "2024-09-06",
      "description": "Nneka O17.5P",
      "bookmaker_id": 1,
      "bet_type": "simple",
      "amount_wagered": 20.00,
      "odds": 1.77,
      "payout": 35.39,
      "result": "won"
    },
    {
      "date": "2024-09-06",
      "description": "Toth Ofin",
      "bookmaker_id": 1,
      "bet_type": "simple",
      "amount_wagered": 32.00,
      "odds": null,
      "payout": 0.00,
      "result": "lost"
    }
  ]
}
```

**Response `201`:**
```json
{
  "created": 2,
  "bets": [ { ... }, { ... } ]
}
```

---

### `GET /bets/{id}` — Buscar aposta por ID

**Response `200`:** objeto de aposta completo (mesmo formato do POST response)

---

### `PUT /bets/{id}` — Atualizar aposta

**Body:** mesmo formato do POST (todos os campos, incluindo os não alterados)

**Response `200`:** aposta atualizada

---

### `PATCH /bets/{id}/result` — Atualizar apenas o resultado (atalho rápido)

**Body:**
```json
{
  "result": "won",
  "payout": 35.00
}
```

**Response `200`:**
```json
{
  "id": 42,
  "result": "won",
  "payout": 35.00,
  "profit": 15.00
}
```

---

### `DELETE /bets/{id}` — Excluir aposta

**Response `200`:**
```json
{ "message": "Aposta excluída com sucesso", "id": 42 }
```

---

## IA — Extração de Prints (`/ai`)

### `POST /ai/extract` — Extrair apostas de imagem

**Content-Type:** `multipart/form-data`

**Form fields:**
- `file` (obrigatório): arquivo de imagem (PNG, JPG, JPEG, WEBP, máx 10MB)
- `model` (opcional): `"haiku"` (padrão) ou `"sonnet"`

**Response `200`:**
```json
{
  "extraction_id": 15,
  "model_used": "claude-haiku-3",
  "bets_detected": 3,
  "bets": [
    {
      "date": "06/09",
      "description": "Nneka O17.5P",
      "bookmaker": "Bet365",
      "bookmaker_id": 1,
      "amount_wagered": 20.00,
      "odds": 1.77,
      "payout": 35.39,
      "result": "won",
      "confidence": "high"
    },
    {
      "date": "06/09",
      "description": "Toth Ofin",
      "bookmaker": "Bet365",
      "bookmaker_id": 1,
      "amount_wagered": 32.00,
      "odds": null,
      "payout": 0.00,
      "result": "lost",
      "confidence": "medium"
    }
  ],
  "warnings": ["Campo 'odds' não identificado em 1 aposta"]
}
```

**Campo `confidence`:**
- `"high"` — todos os campos identificados com certeza
- `"medium"` — alguns campos incertos ou estimados
- `"low"` — dados incompletos, revisão obrigatória

**Response `422` — Arquivo inválido:**
```json
{ "detail": "Formato de arquivo não suportado. Use PNG, JPG, JPEG ou WEBP." }
```

**Response `500` — Falha na API da IA:**
```json
{
  "detail": "Falha ao processar imagem com IA",
  "error_code": "AI_API_ERROR",
  "suggestion": "Tente novamente ou use o registro manual"
}
```

---

## Dashboard (`/dashboard`)

### `GET /dashboard` — Dados do dashboard principal

**Query parameters:**

| Parâmetro | Tipo   | Padrão  | Descrição                                    |
|-----------|--------|---------|----------------------------------------------|
| `period`  | string | `month` | `day`, `week`, `month`, `year`, `all`        |

**Response `200`:**
```json
{
  "period": "month",
  "summary": {
    "total_bets": 47,
    "won": 28,
    "lost": 17,
    "void": 2,
    "pending": 3,
    "hit_rate_pct": 62.2,
    "total_wagered": 940.00,
    "total_payout": 1185.60,
    "total_profit": 245.60,
    "avg_odds": 1.84
  },
  "profit_chart": [
    { "date": "2024-09-01", "daily_profit": 35.00, "cumulative_profit": 35.00 },
    { "date": "2024-09-02", "daily_profit": -20.00, "cumulative_profit": 15.00 },
    { "date": "2024-09-06", "daily_profit": 68.19, "cumulative_profit": 83.19 }
  ],
  "pending_bets": [
    {
      "id": 41,
      "date": "2024-09-08",
      "description": "Escócia Ofin",
      "bookmaker": "Bet365",
      "amount_wagered": 50.00
    }
  ],
  "goal": {
    "month": 9,
    "year": 2024,
    "target_profit": 500.00,
    "current_profit": 245.60,
    "progress_pct": 49.1,
    "days_remaining": 24,
    "daily_needed": 10.60
  },
  "recent_bets": [ { ... } ]
}
```

---

## Estatísticas (`/stats`)

### `GET /stats/sports` — Por esporte

**Query parameters:** `date_from`, `date_to`

**Response `200`:**
```json
{
  "data": [
    {
      "sport": "Futebol",
      "icon": "⚽",
      "total_bets": 32,
      "won": 19,
      "lost": 13,
      "hit_rate_pct": 59.4,
      "total_wagered": 640.00,
      "total_profit": 142.30,
      "avg_profit_per_bet": 4.45
    }
  ]
}
```

### `GET /stats/bookmakers` — Por casa de apostas

Mesmo formato de `/stats/sports` com campo `bookmaker` e `color`.

### `GET /stats/bet-types` — Simples vs Combinadas

**Response `200`:**
```json
{
  "data": [
    {
      "bet_type": "simple",
      "total_bets": 38,
      "won": 24,
      "lost": 14,
      "hit_rate_pct": 63.2,
      "total_wagered": 760.00,
      "total_profit": 198.40,
      "roi_pct": 26.1
    },
    {
      "bet_type": "combined",
      "total_bets": 9,
      "won": 4,
      "lost": 5,
      "hit_rate_pct": 44.4,
      "total_wagered": 180.00,
      "total_profit": 47.20,
      "roi_pct": 26.2
    }
  ],
  "recommendation": "Suas apostas simples têm hit rate 18.8% maior. O ROI é similar, mas o risco é menor."
}
```

### `GET /stats/monthly` — Resumo mensal (últimos 12 meses)

**Response `200`:**
```json
{
  "data": [
    {
      "month": "2024-09",
      "total_bets": 47,
      "won": 28,
      "lost": 17,
      "total_profit": 245.60,
      "hit_rate_pct": 62.2
    }
  ]
}
```

---

## Metas (`/goals`)

### `GET /goals` — Listar metas

**Response `200`:**
```json
{
  "data": [
    {
      "id": 3,
      "month": 9,
      "year": 2024,
      "target_profit": 500.00,
      "actual_profit": 245.60,
      "progress_pct": 49.1,
      "achieved": false
    }
  ]
}
```

### `POST /goals` — Criar meta

**Body:**
```json
{
  "month": 10,
  "year": 2024,
  "target_profit": 500.00,
  "notes": "Foco em futebol"
}
```

### `PUT /goals/{id}` — Atualizar meta

### `DELETE /goals/{id}` — Excluir meta

---

## Configurações (`/config`)

### `GET /config/bookmakers` — Listar casas de apostas

### `POST /config/bookmakers` — Criar casa

**Body:** `{ "name": "Nova Casa", "color": "#FF5500" }`

### `PUT /config/bookmakers/{id}` — Atualizar casa

### `PATCH /config/bookmakers/{id}/toggle` — Ativar/desativar casa

### `GET /config/sports` — Listar esportes

### `POST /config/sports` — Criar esporte

### `PUT /config/sports/{id}` — Atualizar esporte

### `PATCH /config/sports/{id}/toggle` — Ativar/desativar esporte

---

## Tratamento de Erros

Todos os erros seguem o formato:

```json
{
  "detail": "Mensagem de erro legível",
  "error_code": "CODIGO_ERRO",
  "field": "campo_com_erro"
}
```

**Códigos de erro:**

| Código                  | Situação                                      |
|-------------------------|-----------------------------------------------|
| `BET_NOT_FOUND`         | Aposta com ID não encontrada                  |
| `INVALID_DATE`          | Data futura ou formato inválido               |
| `INVALID_AMOUNT`        | Valor apostado <= 0                           |
| `INVALID_ODDS`          | Odd < 1.0                                     |
| `BOOKMAKER_NOT_FOUND`   | Casa de apostas não cadastrada                |
| `BOOKMAKER_HAS_BETS`    | Tentativa de excluir casa com apostas         |
| `GOAL_DUPLICATE`        | Meta já cadastrada para o mês/ano             |
| `AI_API_ERROR`          | Falha na chamada ao Claude API                |
| `FILE_TOO_LARGE`        | Imagem acima de 10MB                          |
| `UNSUPPORTED_FILE_TYPE` | Formato de arquivo não suportado              |
