#!/bin/sh
set -e

echo "▶ Applying migrations..."
npx prisma migrate deploy

echo "▶ Seeding defaults..."
npx prisma db seed

echo "▶ Starting server..."
exec npm run dev
