import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from './server/middleware/auth.js';
import { tenantGuard } from './server/middleware/tenantGuard.js';
import { authRoutes } from './server/routes/auth.js';
import { workspaceRoutes } from './server/routes/workspaces.js';
import { taskRoutes } from './server/routes/tasks.js';
import { meetingRoutes } from './server/routes/meetings.js';
import { billingRoutes } from './server/routes/billing.js';
import { webhookRoutes } from './server/routes/webhooks.js';
import { notificationRoutes } from './server/routes/notifications.js';
import { attachmentRoutes } from './server/routes/attachments.js';
import { recordingRoutes } from './server/routes/recordings.js';
import { calendarRoutes } from './server/routes/calendar.js';
import { processRecurringBilling } from './server/services/billing.js';
import { renewExpiringWatches } from './server/services/googleCalendar.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Singleton: evita múltiplas instâncias em hot-reload / Render restart
const globalForPrisma = globalThis;
const prisma = globalForPrisma.__prisma ?? new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});
if (process.env.NODE_ENV !== 'production') globalForPrisma.__prisma = prisma;

async function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  // ─── Validate critical env vars ──────────────────────────────
  if (!process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL not set. Server cannot start without a database.');
    process.exit(1);
  }

  // ─── Test DB connection early ────────────────────────────────
  try {
    await prisma.$connect();
    console.log('Database connected successfully.');
  } catch (err) {
    console.error('FATAL: Cannot connect to database:', err.message);
    process.exit(1);
  }

  // CORS: aceita Render production + dev local
  const allowedOrigins = [
    'http://localhost:5173',
    process.env.APP_URL,
  ].filter(Boolean);

  app.use(cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) cb(null, true);
      else cb(null, true); // permissivo em produção (mesmo domínio serve dist/)
    },
    credentials: true,
  }));
  // Parse JSON with raw body preservation for webhook signature verification
  app.use(express.json({
    limit: '50mb',
    verify: (req, _res, buf) => {
      // Store raw body for routes that need HMAC signature verification
      if (req.originalUrl?.startsWith('/api/webhooks')) {
        req.rawBody = buf.toString('utf8');
      }
    },
  }));

  // ─── Healthcheck (no auth, no DB required for liveness) ───────
  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', db: 'connected', uptime: process.uptime() });
    } catch (err) {
      console.error('[Health] DB check failed:', err.message);
      res.status(503).json({ status: 'degraded', db: 'disconnected', error: err.message });
    }
  });

  // ─── Seed: Create Super Admin if not exists ────────────────────
  const seedAdmin = async () => {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@ecom360.co';
    const adminPassword = process.env.SUPER_ADMIN;

    if (!adminPassword) {
      console.error('ERRO: Secret SUPER_ADMIN não configurado!');
      return;
    }

    try {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

      if (!existing) {
        const admin = await prisma.user.create({
          data: {
            name: 'Admin',
            email: adminEmail,
            password: hashedPassword,
            role: 'SUPER_ADMIN',
          },
        });

        // Create default workspace for admin
        await prisma.workspace.create({
          data: {
            name: 'Ecom360',
            slug: 'ecom360',
            memberships: {
              create: {
                userId: admin.id,
                roleInWorkspace: 'GESTOR',
                inviteAccepted: true,
                paymentStatus: 'PAID',
                costPerSeat: 0,
              },
            },
            subscription: {
              create: { basePrice: 5.0, seatCount: 1, totalMonthlyValue: 5.0 },
            },
            activeUsers: { connect: { id: admin.id } },
          },
        });

        console.log('Admin criado com sucesso.');
      } else {
        await prisma.user.update({
          where: { email: adminEmail },
          data: { password: hashedPassword },
        });
      }

      console.log('Database inicializado.');
    } catch (err) {
      console.error('DB Error:', err);
    }
  };

  await seedAdmin();

  // ─── Webhook routes (no auth required) ─────────────────────────
  app.use('/api/webhooks', webhookRoutes(prisma));

  // ─── Auth routes (auth applied per-route inside router) ───────────
  app.use('/api/auth', authRoutes(prisma));

  // ─── Protected API routes ──────────────────────────────────────
  app.use('/api/workspaces', authMiddleware, workspaceRoutes(prisma));
  app.use('/api/tasks', authMiddleware, tenantGuard(prisma), taskRoutes(prisma));
  app.use('/api/tasks', authMiddleware, tenantGuard(prisma), attachmentRoutes(prisma));
  app.use('/api/meetings', authMiddleware, tenantGuard(prisma), meetingRoutes(prisma));
  app.use('/api/recordings', authMiddleware, tenantGuard(prisma), recordingRoutes(prisma));
  app.use('/api/billing', authMiddleware, tenantGuard(prisma), billingRoutes(prisma));
  app.use('/api/calendar', calendarRoutes(prisma));
  app.use('/api/notifications', authMiddleware, notificationRoutes(prisma));

  // ─── Serve uploaded files ──────────────────────────────────────
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // ─── Serve static frontend (production) ────────────────────────
  app.use(express.static(path.join(__dirname, 'dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });

  // ─── Recurring billing cron (daily at 03:00 UTC) ──────────────
  const BILLING_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
  const scheduleBillingCron = () => {
    const now = new Date();
    const next = new Date(now);
    next.setUTCHours(3, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const delay = next.getTime() - now.getTime();

    setTimeout(() => {
      processRecurringBilling(prisma).catch((err) =>
        console.error('[Cron:Billing] Failed:', err.message)
      );
      // Schedule next run every 24h
      setInterval(() => {
        processRecurringBilling(prisma).catch((err) =>
          console.error('[Cron:Billing] Failed:', err.message)
        );
      }, BILLING_INTERVAL_MS);
    }, delay);

    console.log(`[Cron:Billing] Scheduled recurring billing — next run at ${next.toISOString()}`);
  };
  scheduleBillingCron();

  // ─── Google Calendar watch renewal cron (every 6 hours) ───
  setInterval(() => {
    renewExpiringWatches(prisma).catch((err) =>
      console.error('[Cron:CalWatch] Failed:', err.message)
    );
  }, 6 * 60 * 60 * 1000);
  console.log('[Cron:CalWatch] Watch renewal scheduled every 6 hours');

  // ─── Graceful shutdown ─────────────────────────────────────────
  process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer();
