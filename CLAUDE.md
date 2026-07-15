# BetManager

> Commit conventions are defined globally in `~/.claude/CLAUDE.md` (English messages, Conventional Commits, no AI-attribution trailer, auto-commit light changes).

## Stack
- **Backend**: Node + Express + Prisma (PostgreSQL) — `backend/` (dev: `npm run dev`, port 3000).
- **Frontend**: React + Vite — `frontend/` (dev: `npm run dev`, port 5173).
- **Dev database**: `docker compose up -d db` (Postgres on `localhost:5432`).
