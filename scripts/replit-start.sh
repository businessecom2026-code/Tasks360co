#!/bin/bash
# ─── Replit Start: Garante DB pronta e inicia servidor ───
set -e

# Se DATABASE_URL_TEST não existe, derivar
if [ -n "$DATABASE_URL" ] && [ -z "$DATABASE_URL_TEST" ]; then
  BASE_URL="${DATABASE_URL%/*}"
  export DATABASE_URL_TEST="${BASE_URL}/task360_test"
fi

# Garantir que o Prisma Client existe
if [ ! -d "node_modules/.prisma/client" ]; then
  echo "⚙️  Gerando Prisma Client..."
  npx prisma generate
fi

# Push schema (silencioso se já está OK)
echo "🗄️  Sincronizando schema..."
npx prisma db push --accept-data-loss 2>/dev/null || true

# Sync test DB too (background, não bloqueia o start)
if [ -n "$DATABASE_URL_TEST" ]; then
  (DATABASE_URL="$DATABASE_URL_TEST" npx prisma db push --accept-data-loss 2>/dev/null || true) &
fi

# Se dist/ não existe, build frontend
if [ ! -d "dist" ]; then
  echo "🏗️  Building frontend..."
  npm run build
fi

echo "🚀 Iniciando servidor..."
node server.js
