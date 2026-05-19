#!/bin/bash
# deploy.sh — Atualiza o BetManager no VPS
# Uso: ./deploy.sh

set -e

echo "🔄 Puxando últimas alterações..."
git pull origin main

echo "🏗️  Buildando imagens de produção..."
docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache

echo "🚀 Subindo containers..."
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

echo "🧹 Limpando imagens antigas..."
docker image prune -f

echo "✅ Deploy concluído!"
echo "   App rodando em: http://$(curl -s ifconfig.me)"
