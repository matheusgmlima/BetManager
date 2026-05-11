# BetManager — Sistema de Gerenciamento de Apostas

Sistema web para registro, análise e acompanhamento de apostas esportivas, com entrada de dados via IA (upload de print) e dashboard analítico completo.

---

## Visão Geral

O BetManager resolve o principal problema de apostadores: o trabalho manual de registrar cada aposta individualmente. Com integração à IA (Claude Vision), o usuário tira um print da sua lista de apostas e o sistema extrai e salva tudo automaticamente.

### Funcionalidades principais

- Upload de print → IA extrai apostas automaticamente
- Dashboard com lucro por dia, semana, mês e ano
- Estatísticas por esporte, casa de apostas e tipo de aposta
- Metas mensais com acompanhamento de progresso
- Histórico completo com filtros avançados
- Registro manual como fallback

---

## Stack Tecnológica

| Camada      | Tecnologia                   |
|-------------|-------------------------------|
| Frontend    | React 18 + Vite + TypeScript  |
| Backend     | Node.js + Express + TypeScript|
| Banco       | PostgreSQL 15                 |
| IA          | Claude API (Haiku / Sonnet)   |
| Container   | Docker + Docker Compose       |
| ORM         | Prisma                        |
| Autenticação| JWT (fase 5 — nuvem)          |

---

## Estrutura do Projeto

```
betmanager/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard/
│   │   │   ├── BetForm/
│   │   │   ├── BetUpload/       # Upload de prints via IA
│   │   │   ├── Statistics/
│   │   │   ├── History/
│   │   │   └── Goals/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/            # Chamadas à API
│   │   └── types/
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── src/
│   │   ├── server.ts
│   │   ├── routes/
│   │   │   ├── bets.ts
│   │   │   ├── dashboard.ts
│   │   │   ├── statistics.ts
│   │   │   ├── goals.ts
│   │   │   └── aiExtract.ts
│   │   ├── services/
│   │   │   ├── aiService.ts     # Integração Claude API
│   │   │   └── statsService.ts
│   │   ├── middlewares/
│   │   └── prisma/              # Prisma client
│   ├── prisma/
│   │   ├── schema.prisma        # Schema do banco
│   │   └── migrations/         # Migrations geradas
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── docs/
│   ├── architecture.md
│   ├── database-schema.md
│   ├── use-cases.md
│   ├── api-spec.md
│   ├── test-cases.md
│   └── roadmap.md
│
├── docker-compose.yml
└── README.md
```

---

## Como Rodar Localmente

### Pré-requisitos

- Docker Desktop instalado
- Chave da API da Anthropic (Claude)

### Subir o ambiente

```bash
# 1. Clonar o repositório
git clone <repo-url>
cd betmanager

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com sua ANTHROPIC_API_KEY

# 3. Subir todos os serviços
docker-compose up -d

# 4. Acessar
# Frontend: http://localhost:5173
# Backend:  http://localhost:8000
# API:      http://localhost:3000
```

### Variáveis de ambiente (.env)

```env
ANTHROPIC_API_KEY=sk-ant-...
POSTGRES_DB=betmanager
POSTGRES_USER=betuser
POSTGRES_PASSWORD=betpass
DATABASE_URL=postgresql://betuser:betpass@db:5432/betmanager
PORT=3000
```

---

## Fluxo Principal: Registro via Print

```
1. Usuário acessa "Nova Aposta" → clica em "Enviar Print"
2. Faz upload da imagem (screenshot da casa de apostas)
3. Backend envia imagem para Claude Vision API
4. IA retorna JSON estruturado com as apostas detectadas
5. Frontend exibe formulário pré-preenchido para revisão
6. Usuário confirma ou ajusta os dados
7. Apostas salvas no banco de dados
```

---

## Roadmap Resumido

| Fase | Descrição                        | Status  |
|------|----------------------------------|---------|
| 1    | Backend + banco + CRUD básico    | Pendente|
| 2    | Integração IA (extração de print)| Pendente|
| 3    | Dashboard e estatísticas         | Pendente|
| 4    | Metas e alertas                  | Pendente|
| 5    | Deploy em nuvem                  | Pendente|

Ver detalhes em [docs/roadmap.md](docs/roadmap.md)

---

## Documentação

- [Arquitetura Técnica](docs/architecture.md)
- [Schema do Banco de Dados](docs/database-schema.md)
- [Casos de Uso](docs/use-cases.md)
- [Especificação da API](docs/api-spec.md)
- [Casos de Teste](docs/test-cases.md)
- [Roadmap](docs/roadmap.md)
