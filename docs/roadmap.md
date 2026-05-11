# Roadmap de Desenvolvimento — BetManager

## Visão Geral das Fases

```
Fase 1 ──► Fase 2 ──► Fase 3 ──► Fase 4 ──► Fase 5
Backend    IA e       Dashboard  Metas e    Deploy
+ CRUD     Upload     Completo   Analytics  Nuvem
```

---

## Fase 1 — Fundação (Backend + CRUD)

**Objetivo:** Sistema funcional com registro manual e histórico básico.  
**Estimativa:** 2–3 semanas

### Tarefas

#### Infraestrutura
- [ ] Configurar repositório Git com `.gitignore` e `.env.example`
- [ ] Criar `docker-compose.yml` com PostgreSQL + Backend + Frontend
- [ ] Configurar Prisma e rodar migration inicial com todas as tabelas
- [ ] Popular tabelas `sports` e `bookmakers` com seed data (Prisma seed)

#### Backend (Node.js + Express)
- [ ] Estrutura base do projeto (`src/server.ts`, routes, services)
- [ ] Configurar Prisma Client e conexão com PostgreSQL
- [ ] Configurar TypeScript + tsconfig + ts-node-dev
- [ ] Implementar CRUD completo de apostas (`/api/bets`)
- [ ] Implementar `POST /bets/batch` (criação em lote)
- [ ] Implementar `PATCH /bets/:id/result` (atualização rápida)
- [ ] Implementar CRUD de metas (`/api/goals`)
- [ ] Implementar endpoints de configuração (`/api/config`)
- [ ] Configurar Jest + Supertest para testes
- [ ] Escrever testes unitários (TU-01 a TU-04)
- [ ] Escrever testes de integração (TI-01 a TI-06)

#### Frontend (React)
- [ ] Setup Vite + TypeScript + TailwindCSS + shadcn/ui
- [ ] Configurar React Router com as páginas principais
- [ ] Configurar React Query para gerenciamento de estado
- [ ] Implementar página de histórico (`/apostas`) com tabela e paginação
- [ ] Implementar formulário de registro manual
- [ ] Implementar filtros do histórico
- [ ] Implementar página de configurações (casas e esportes)

**Entrega da Fase 1:** é possível registrar apostas manualmente e visualizar o histórico.

---

## Fase 2 — Integração com IA

**Objetivo:** Upload de prints para extração automática de apostas.  
**Estimativa:** 1–2 semanas

### Tarefas

#### Backend
- [ ] Criar conta na Anthropic e configurar API key
- [ ] Implementar `ai_service.py` com integração ao Claude API
- [ ] Escrever prompt de extração otimizado e testado
- [ ] Implementar endpoint `POST /api/ai/extract`
- [ ] Implementar lógica de seleção de modelo (haiku vs sonnet)
- [ ] Implementar tabela e logging de `ai_extraction_logs`
- [ ] Escrever testes de integração com mock (TI-03)

#### Frontend
- [ ] Implementar componente de upload (`react-dropzone`)
- [ ] Implementar tela de revisão das apostas extraídas
- [ ] Exibir campo `confidence` com indicador visual (alto/médio/baixo)
- [ ] Permitir edição, remoção e adição de apostas antes de confirmar
- [ ] Tratamento de erros da IA com mensagens claras

**Entrega da Fase 2:** usuário faz upload de print → revisa → salva. Fluxo completo funcionando.

---

## Fase 3 — Dashboard e Estatísticas

**Objetivo:** Dashboard analítico completo com gráficos.  
**Estimativa:** 2 semanas

### Tarefas

#### Backend
- [ ] Implementar `GET /api/dashboard` com todos os aggregados
- [ ] Implementar `GET /api/stats/sports`
- [ ] Implementar `GET /api/stats/bookmakers`
- [ ] Implementar `GET /api/stats/bet-types` com recommendation
- [ ] Implementar `GET /api/stats/monthly`
- [ ] Criar views SQL analíticas (`v_dashboard_monthly`, etc.)
- [ ] Otimizar queries com índices adequados
- [ ] Escrever testes (TI-04, TI-05)

#### Frontend
- [ ] Implementar dashboard principal com cards de resumo
- [ ] Implementar gráfico de lucro acumulado (Recharts LineChart)
- [ ] Implementar seletor de período (dia/semana/mês/ano)
- [ ] Implementar lista de apostas pendentes com ação rápida
- [ ] Implementar página de estatísticas com 3 abas:
  - Por esporte (BarChart)
  - Por casa de apostas (BarChart + tabela)
  - Simples vs Combinadas (comparativo)
- [ ] Implementar testes E2E (TE-04, TE-05)

**Entrega da Fase 3:** dashboard completo, estatísticas por dimensão funcionando.

---

## Fase 4 — Metas, Apostas Combinadas e Polimento

**Objetivo:** Funcionalidades de metas, apostas combinadas e UX refinada.  
**Estimativa:** 1–2 semanas

### Tarefas

#### Apostas Combinadas
- [ ] Implementar interface de registro de combinadas (múltiplas seleções)
- [ ] Implementar `combined_bet_groups` no backend
- [ ] Calcular odd total automaticamente (produto das odds)
- [ ] Trigger de sincronização de resultado (implementado no schema)
- [ ] Exibir combinadas agrupadas no histórico

#### Metas
- [ ] Implementar página `/metas`
- [ ] Barra de progresso com % da meta atingida
- [ ] Projeção: "você vai atingir a meta em X dias no ritmo atual"
- [ ] Histórico de metas com status (atingida / não atingida)
- [ ] Widget de meta no dashboard

#### Polimento de UX
- [ ] Atalhos de teclado no formulário de registro
- [ ] Modo de entrada rápida (salva e limpa para próxima aposta)
- [ ] Toast notifications para feedback de ações
- [ ] Responsividade mobile (para registrar do celular)
- [ ] Tema escuro / claro
- [ ] Loading states em todas as chamadas de API
- [ ] Empty states ilustrados

**Entrega da Fase 4:** sistema completo e polido, pronto para uso diário.

---

## Fase 5 — Deploy em Nuvem (Opcional)

**Objetivo:** Tornar o sistema acessível de qualquer dispositivo.  
**Estimativa:** 1 semana

### Tarefas

#### Infraestrutura
- [ ] Criar conta no Supabase (PostgreSQL gerenciado gratuito)
- [ ] Migrar banco de dados local para Supabase
- [ ] Deploy do backend no Railway ou Render (free tier)
- [ ] Deploy do frontend no Vercel (free tier)
- [ ] Configurar variáveis de ambiente em cada provedor

#### Segurança (obrigatório antes do deploy)
- [ ] Implementar autenticação JWT (login com email/senha)
- [ ] Implementar HTTPS (automático nos provedores acima)
- [ ] Rate limiting no endpoint `/api/ai/extract` (custo da API)
- [ ] Validação de CORS para o domínio de produção

#### Monitoramento
- [ ] Configurar logs de erro (Sentry free tier)
- [ ] Configurar alertas de custo da Anthropic API

**Entrega da Fase 5:** sistema acessível via URL pública com autenticação.

---

## Resumo do Roadmap

| Fase | Entrega Principal                        | Estimativa |
|------|------------------------------------------|------------|
| 1    | CRUD manual + histórico funcional        | 2–3 sem    |
| 2    | Upload de print + extração por IA        | 1–2 sem    |
| 3    | Dashboard + estatísticas completas       | 2 sem      |
| 4    | Metas + combinadas + polimento UX        | 1–2 sem    |
| 5    | Deploy em nuvem + autenticação           | 1 sem      |
| **Total** | **Sistema completo**                | **7–10 sem**|

---

## Próximo Passo Imediato

Iniciar pela **Fase 1, item: Infraestrutura** — configurar o repositório, Docker Compose e rodar o banco de dados local. Isso desbloqueia todo o resto do desenvolvimento.

```bash
# Primeiro comando a rodar quando iniciar:
mkdir betmanager && cd betmanager
git init
docker-compose up -d db   # Sobe apenas o PostgreSQL para começar
```
