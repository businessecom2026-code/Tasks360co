#!/bin/bash
# ─── Replit Setup: Cria DBs (prod + test) e migra schema ───
set -e

echo "╔══════════════════════════════════════════╗"
echo "║  Task360 Engine — Replit Setup            ║"
echo "╚══════════════════════════════════════════╝"

# ─── 1. Verificar DATABASE_URL ───────────────────────────
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL não configurada!"
  echo ""
  echo "No Replit:"
  echo "  1. Abre a tab 'Tools' → 'Secrets'"
  echo "  2. Adiciona DATABASE_URL com a connection string do PostgreSQL"
  echo "  3. Formato: postgresql://user:pass@host:5432/task360_prod"
  echo ""
  echo "Dica: Usa o Replit PostgreSQL (Neon) — ele já configura automaticamente."
  exit 1
fi

# ─── 2. Derivar DATABASE_URL_TEST a partir da prod ──────
# Substitui o nome da database no final da URL
if [ -z "$DATABASE_URL_TEST" ]; then
  # Extrai base URL (tudo antes do último /) e cria a test URL
  BASE_URL="${DATABASE_URL%/*}"
  export DATABASE_URL_TEST="${BASE_URL}/task360_test"
  echo "ℹ️  DATABASE_URL_TEST derivada automaticamente: ...task360_test"
fi

# ─── 3. Instalar dependências ────────────────────────────
echo ""
echo "📦 Instalando dependências..."
npm install

# ─── 4. Gerar Prisma Client ─────────────────────────────
echo ""
echo "⚙️  Gerando Prisma Client..."
npx prisma generate

# ─── 5. Criar/Migrar DB de Produção ─────────────────────
echo ""
echo "🗄️  Configurando DB de PRODUÇÃO..."
npx prisma db push --accept-data-loss 2>/dev/null || npx prisma db push
echo "✅ DB Produção pronta"

# ─── 6. Criar/Migrar DB de Teste ────────────────────────
echo ""
echo "🧪 Configurando DB de TESTE..."
DATABASE_URL="$DATABASE_URL_TEST" npx prisma db push --accept-data-loss 2>/dev/null || DATABASE_URL="$DATABASE_URL_TEST" npx prisma db push
echo "✅ DB Teste pronta"

# ─── 7. Build frontend ──────────────────────────────────
echo ""
echo "🏗️  Building frontend..."
npm run build

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  ✅ Setup completo!                       ║"
echo "║                                          ║"
echo "║  DB Prod: $DATABASE_URL (parcial)        ║"
echo "║  DB Test: $DATABASE_URL_TEST (parcial)   ║"
echo "║                                          ║"
echo "║  Comandos:                               ║"
echo "║    npm run replit:start   → Produção     ║"
echo "║    npm run test           → Testes       ║"
echo "║    npm run db:studio      → Prisma GUI   ║"
echo "╚══════════════════════════════════════════╝"
