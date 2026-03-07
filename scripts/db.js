/**
 * Prisma client factory — retorna instância apontando para a DB correta.
 * Uso: import { getPrisma } from './scripts/db.js'
 *
 * Em teste:  NODE_ENV=test → usa DATABASE_URL_TEST
 * Em prod:   NODE_ENV=production → usa DATABASE_URL
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export function getPrisma(env) {
  const isTest = env === 'test' || process.env.NODE_ENV === 'test';
  const url = isTest
    ? process.env.DATABASE_URL_TEST || process.env.DATABASE_URL
    : process.env.DATABASE_URL;

  const key = isTest ? '__prisma_test' : '__prisma';

  if (!globalForPrisma[key]) {
    globalForPrisma[key] = new PrismaClient({
      datasources: { db: { url } },
    });
  }

  return globalForPrisma[key];
}

/**
 * Limpa todas as tabelas da DB de teste (para reset entre test suites).
 * NUNCA chamar em produção.
 */
export async function cleanTestDb() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('cleanTestDb só pode ser chamado em NODE_ENV=test');
  }

  const prisma = getPrisma('test');

  // Ordem respeitando foreign keys (dependentes primeiro)
  await prisma.notification.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
}
