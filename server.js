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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;
  const prisma = new PrismaClient();

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

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

  // ─── Auth routes (login/register are public, rest protected) ───
  const authRouter = authRoutes(prisma);
  app.use('/api/auth', (req, res, next) => {
    if (req.path === '/login' || req.path === '/register' || req.path === '/google/callback') {
      return next();
    }
    return authMiddleware(req, res, next);
  }, authRouter);

  // ─── Protected API routes ──────────────────────────────────────
  app.use('/api/workspaces', authMiddleware, workspaceRoutes(prisma));
  app.use('/api/tasks', authMiddleware, tenantGuard(prisma), taskRoutes(prisma));
  app.use('/api/tasks', authMiddleware, tenantGuard(prisma), attachmentRoutes(prisma));
  app.use('/api/meetings', authMiddleware, tenantGuard(prisma), meetingRoutes(prisma));
  app.use('/api/billing', authMiddleware, tenantGuard(prisma), billingRoutes(prisma));
  app.use('/api/notifications', authMiddleware, notificationRoutes(prisma));

  // ─── Serve uploaded files ──────────────────────────────────────
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // ─── Serve static frontend (production) ────────────────────────
  app.use(express.static(path.join(__dirname, 'dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });

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
