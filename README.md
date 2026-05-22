# BetManager — Sistema de Gerenciamento de Apostas

Sistema web completo para registro, análise e acompanhamento de apostas esportivas. Integra IA via Claude Vision para extração automática de apostas a partir de prints de tela.

---

## Visão Geral

O BetManager resolve o problema de apostadores que perdem tempo registrando apostas manualmente. Com Claude Vision, o usuário tira um print da sua lista de apostas e o sistema extrai, estrutura e salva tudo automaticamente.

### Funcionalidades

- **Extração por IA** — upload de print → Claude Vision extrai apostas em JSON
- **Dashboard** — lucro acumulado, win rate, ROI, banca atual com animações
- **Planilha** — histórico completo com filtros, paginação e edição inline
- **Analytics avançado** — calibração de odds, drawdown, heatmap semanal
- **Metas mensais** — progresso por mês/ano com ring de progresso visual
- **Perfis de apostas** — segmente e compare diferentes estratégias
- **Multi-unidade** — alterne entre R$ e unidades (U) globalmente
- **Tema dark** — design system com CSS custom properties

---

## Stack

| Camada      | Tecnologia                        |
|-------------|-----------------------------------|
| Frontend    | React 18 + Vite + TypeScript      |
| Backend     | Node.js + Express + TypeScript    |
| Banco       | PostgreSQL 15                     |
| ORM         | Prisma                            |
| IA          | Claude API (Haiku / Sonnet)       |
| Container   | Docker + Docker Compose           |
| Charts      | Recharts                          |
| Data fetch  | React Query (TanStack Query v5)   |

---

## Estrutura do Projeto

```
BetManager/
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.tsx      # KPIs, gráfico de lucro, bets recentes
│       │   ├── Spreadsheet.tsx    # Planilha completa por perfil
│       │   ├── Analytics.tsx      # Calibração odds, drawdown, heatmap
│       │   ├── Goals.tsx          # Metas mensais com progresso
│       │   ├── NewBet.tsx         # Registro manual + upload IA
│       │   ├── History.tsx        # Histórico com filtros avançados
│       │   ├── Statistics.tsx     # Estatísticas por sport/bookmaker
│       │   └── Settings.tsx       # Configurações de perfis e unidade
│       ├── hooks/
│       │   ├── useDashboard.ts    # Dashboard, heatmap, analytics
│       │   ├── useGoals.ts        # CRUD metas
│       │   ├── useBets.ts         # CRUD apostas
│       │   └── useConfig.ts       # Configurações globais
│       ├── contexts/
│       │   └── UnitContext.tsx    # Toggle R$ / U global
│       ├── services/
│       │   └── dashboardService.ts
│       └── types/
│           └── dashboard.types.ts
│
├── backend/
│   └── src/
│       ├── routes/
│       │   ├── bets.ts
│       │   ├── dashboard.ts
│       │   ├── statistics.ts      # /heatmap, /profile-detail, etc.
│       │   ├── goals.ts
│       │   ├── config.ts
│       │   └── ai.ts              # Extração via Claude Vision
│       ├── services/
│       │   ├── statisticsService.ts
│       │   └── aiService.ts
│       └── controllers/
│           └── statisticsController.ts
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── docs/
│   ├── architecture.md
│   ├── database-schema.md
│   ├── api-spec.md
│   └── roadmap.md
│
└── docker-compose.yml
```

---

## Como Rodar

### Pré-requisitos

- Docker Desktop
- Chave da API da Anthropic

```bash
# 1. Clonar
git clone <repo-url>
cd BetManager

# 2. Configurar env
cp .env.example .env
# Editar .env com ANTHROPIC_API_KEY

# 3. Subir
docker-compose up -d

# Frontend: http://localhost:5173
# Backend:  http://localhost:3000
```

### Variáveis de ambiente

```env
ANTHROPIC_API_KEY=sk-ant-...
POSTGRES_DB=betmanager
POSTGRES_USER=betuser
POSTGRES_PASSWORD=betpass
DATABASE_URL=postgresql://betuser:betpass@db:5432/betmanager
PORT=3000
```

---

## Endpoints da API

| Método | Rota                          | Descrição                         |
|--------|-------------------------------|-----------------------------------|
| GET    | /api/dashboard                | KPIs, gráfico de lucro, recentes  |
| GET    | /api/stats/profile-detail     | Detalhes por perfil + odds        |
| GET    | /api/stats/heatmap            | Lucro por dia da semana           |
| GET    | /api/goals                    | Lista de metas                    |
| POST   | /api/goals                    | Criar meta                        |
| PATCH  | /api/goals/:id                | Atualizar meta                    |
| DELETE | /api/goals/:id                | Remover meta                      |
| GET    | /api/bets                     | Listar apostas (com filtros)      |
| POST   | /api/bets                     | Criar aposta                      |
| PATCH  | /api/bets/:id                 | Atualizar aposta                  |
| DELETE | /api/bets/:id                 | Remover aposta                    |
| POST   | /api/ai/extract               | Extrair apostas de print via IA   |
| GET    | /api/config                   | Configurações (perfis, unidade)   |
| PATCH  | /api/config                   | Atualizar configurações           |

---

## Fluxo: Registro via Print

```
1. Usuário clica em "Enviar Print" em Nova Aposta
2. Upload da imagem (screenshot da casa de apostas)
3. Backend envia para Claude Vision API
4. IA retorna JSON com apostas detectadas
5. Frontend exibe formulário pré-preenchido para revisão
6. Usuário confirma → apostas salvas no banco
```

---

## Páginas

### Dashboard
KPIs em tempo real (lucro total, ROI, win rate, streak), gráfico de lucro acumulado interativo, apostas recentes. FAB flutuante para nova aposta.

### Analytics
Três painéis com layout sidebar + gráfico:
- **Calibração de Odds** — hit rate real vs breakeven por bucket de odds
- **Drawdown** — pico de banca vs lucro acumulado, área de risco visualizada
- **Heatmap Semanal** — lucro, hit rate e ROI por dia da semana (Seg → Dom)

### Planilha
Tabela paginada com todas as apostas filtradas por perfil. Edição inline, ordenação, indicadores de resultado coloridos.

### Metas
Cards mensais com anel de progresso SVG, KPIs de acompanhamento e histórico anual. Modal para criar/editar metas.

### Configurações
Gestão de perfis de aposta (criar, renomear, excluir), toggle de unidade monetária (R$ / U), configuração de banca inicial.

---

## Status do Desenvolvimento

| Funcionalidade               | Status       |
|------------------------------|--------------|
| CRUD de apostas              | ✅ Completo  |
| Extração por IA              | ✅ Completo  |
| Dashboard + gráficos         | ✅ Completo  |
| Planilha com perfis          | ✅ Completo  |
| Metas mensais                | ✅ Completo  |
| Analytics (odds/drawdown)    | ✅ Completo  |
| Heatmap semanal              | ✅ Completo  |
| Toggle R$ / Unidades         | ✅ Completo  |
| Autenticação multi-usuário   | 🔲 Pendente  |
| Deploy em nuvem              | 🔲 Pendente  |

---

## Documentação

- [Arquitetura Técnica](docs/architecture.md)
- [Schema do Banco de Dados](docs/database-schema.md)
- [Especificação da API](docs/api-spec.md)
- [Roadmap](docs/roadmap.md)
