#!/bin/bash
# deploy.sh — Atualiza o BetManager no VPS
# Uso: ./deploy.sh

set -euo pipefail

ENV_FILE=".env.prod"

# Verificações iniciais
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Arquivo $ENV_FILE não encontrado!"
  exit 1
fi

echo "🔄 Puxando últimas alterações..."
git pull origin main

echo "🏗️  Buildando imagens de produção..."
docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" build

echo "🚀 Subindo containers..."
docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" up -d

echo "⏳ Aguardando healthcheck do banco..."
sleep 5

echo "🔍 Status dos containers:"
docker compose -f docker-compose.prod.yml ps

echo "🧹 Limpando imagens antigas..."
docker image prune -f

echo "✅ Deploy concluído! → https://betmanager.app.br"
