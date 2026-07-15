# BetManager — Convenções para o Claude Code

## Commits (padrão do projeto)
Sempre que fizermos **alterações leves e funcionais** no sistema, **commitar e dar push na `main` automaticamente** (sem esperar ser pedido), usando a conta do dono do repositório (o git user já está configurado como Matheus).

- Usar **Conventional Commits** em português como prefixo do título:
  - `feat:` — nova funcionalidade
  - `fix:` — correção de bug
  - `refactor:` — reestruturação sem mudar comportamento
  - `perf:` — melhoria de performance
  - `chore:` — build, config, dependências, infra
  - `docs:` — documentação
  - `style:` — formatação/estilo sem lógica
  - `test:` — testes
- Título curto e descritivo; corpo com o "porquê" quando ajudar.
- **Exceções (confirmar antes de commitar):** mudanças grandes/arriscadas, migrações de banco, ou trabalho claramente incompleto.
- Antes de commitar, garantir que o typecheck passa (`npx tsc --noEmit` em `backend/` e `frontend/`) e não introduzir novos erros.

## Stack (referência rápida)
- **Backend**: Node + Express + Prisma (PostgreSQL) — pasta `backend/` (dev: `npm run dev`, porta 3000).
- **Frontend**: React + Vite — pasta `frontend/` (dev: `npm run dev`, porta 5173).
- **Banco de dev**: sobe via `docker compose up -d db` (Postgres em `localhost:5432`).
