/**
 * Teste de Integração Completo — Todos os Roles
 *
 * Testa todas as rotas da API com os 4 roles:
 * - SUPER_ADMIN: acesso global + billing overview + manual charge
 * - GESTOR: owner do workspace, convites, remoção de membros, toggle autoRenew
 * - COLABORADOR: acesso básico a tasks/meetings/notifications
 * - CLIENTE: pode convidar, acesso básico, sem toggles de billing
 *
 * Usa Express diretamente com Prisma mockado (sem necessidade de PostgreSQL).
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ─── Mock external services BEFORE importing routes ──────────────────

vi.mock('../services/googleAuth.js', () => ({
  getAuthUrl: vi.fn(() => 'https://accounts.google.com/mock'),
  exchangeCodeForTokens: vi.fn(),
  disconnectGoogle: vi.fn(),
  getUserTokens: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../services/syncEngine.js', () => ({
  scheduleSyncToGoogle: vi.fn(),
  deleteFromGoogle: vi.fn(),
  fullSync: vi.fn(() => Promise.resolve({ created: 0, updated: 0 })),
}));

vi.mock('../services/ai.js', () => ({
  processMeeting: vi.fn(() =>
    Promise.resolve({
      summary: 'Resumo da reunião de teste',
      suggestedTasks: [{ title: 'Tarefa sugerida', status: 'PENDING' }],
    }),
  ),
  validateDuration: vi.fn(() => ({ valid: true })),
}));

vi.mock('../services/billing.js', () => ({
  createSeatCheckout: vi.fn(() =>
    Promise.resolve({
      checkoutUrl: 'https://checkout.revolut.com/stub',
      orderId: `stub-${Date.now()}`,
    }),
  ),
  createManualCharge: vi.fn(() =>
    Promise.resolve({
      orderId: `stub-manual-${Date.now()}`,
      checkoutUrl: 'https://checkout.revolut.com/stub-manual',
    }),
  ),
  verifyWebhookSignature: vi.fn(() => true),
}));

vi.mock('../services/notifications.js', () => ({
  addConnection: vi.fn(),
  sendToUser: vi.fn(),
  sendToWorkspace: vi.fn(),
  createNotification: vi.fn(() => Promise.resolve({ id: 'notif-1' })),
  notifyWorkspace: vi.fn(() => Promise.resolve([])),
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(() => Promise.resolve('$2a$10$hashedMock')),
    compare: vi.fn(() => Promise.resolve(false)),
  },
  hash: vi.fn(() => Promise.resolve('$2a$10$hashedMock')),
  compare: vi.fn(() => Promise.resolve(false)),
}));

// ─── Import routes and middleware ────────────────────────────────────

import bcrypt from 'bcryptjs';
import { authMiddleware, generateToken } from '../middleware/auth.js';
import { tenantGuard } from '../middleware/tenantGuard.js';
import { authRoutes } from './auth.js';
import { workspaceRoutes } from './workspaces.js';
import { taskRoutes } from './tasks.js';
import { meetingRoutes } from './meetings.js';
import { billingRoutes } from './billing.js';
import { notificationRoutes } from './notifications.js';
import { webhookRoutes } from './webhooks.js';

// ─── Constants ───────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || 'task360-secret-change-in-production';

const WORKSPACE_ID = 'ws-test-001';
const WORKSPACE_ID_2 = 'ws-test-002';

// Users for each role
const users = {
  superAdmin: { id: 'user-sa', email: 'admin@ecom360.co', role: 'SUPER_ADMIN', name: 'Super Admin' },
  gestor: { id: 'user-gestor', email: 'gestor@test.co', role: 'GESTOR', name: 'Gestor User' },
  colaborador: { id: 'user-colab', email: 'colab@test.co', role: 'COLABORADOR', name: 'Colaborador User' },
  cliente: { id: 'user-cliente', email: 'cliente@test.co', role: 'CLIENTE', name: 'Cliente User' },
};

// Generate JWT tokens for each user
const tokens = {};
for (const [key, user] of Object.entries(users)) {
  tokens[key] = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
}

// ─── Prisma Mock Factory ─────────────────────────────────────────────

function createMockPrisma() {
  const taskStore = [];
  const meetingStore = [];
  const notifStore = [];

  return {
    user: {
      findUnique: vi.fn(({ where, select }) => {
        const u = Object.values(users).find((u) => u.email === where.email || u.id === where.id);
        if (!u) return null;
        const full = { ...u, password: '$2a$10$hashedPasswordMock', googleRefreshToken: null, avatar: null, activeWorkspaceId: null, createdAt: new Date(), updatedAt: new Date() };
        // If select is specified, only return those fields
        if (select) {
          const result = {};
          for (const key of Object.keys(select)) {
            if (select[key] && key in full) result[key] = full[key];
          }
          return result;
        }
        return full;
      }),
      create: vi.fn(({ data }) => ({
        id: `user-new-${Date.now()}`,
        ...data,
        role: 'COLABORADOR',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      update: vi.fn(({ where, data }) => {
        const u = Object.values(users).find((u) => u.id === where.id);
        return { ...u, ...data, createdAt: new Date(), updatedAt: new Date() };
      }),
    },

    workspace: {
      findUnique: vi.fn(({ where }) => ({
        id: where.id || WORKSPACE_ID,
        name: 'Test Workspace',
        slug: 'test-ws',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      create: vi.fn(({ data, include }) => {
        const ws = {
          id: `ws-new-${Date.now()}`,
          name: data.name,
          slug: data.slug,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        if (include?.memberships) ws.memberships = [{ id: 'mem-owner', roleInWorkspace: 'GESTOR' }];
        if (include?.subscription) ws.subscription = { basePrice: 5.0, seatCount: 1, totalMonthlyValue: 5.0 };
        return ws;
      }),
    },

    membership: {
      findUnique: vi.fn(({ where }) => {
        // Handle composite key lookup
        if (where.userId_workspaceId) {
          const { userId, workspaceId } = where.userId_workspaceId;
          // All users are active members of WORKSPACE_ID
          if (workspaceId === WORKSPACE_ID) {
            const roleMap = {
              'user-sa': 'GESTOR',
              'user-gestor': 'GESTOR',
              'user-colab': 'COLABORADOR',
              'user-cliente': 'CLIENTE',
            };
            if (roleMap[userId]) {
              return {
                id: `mem-${userId}`,
                userId,
                workspaceId,
                roleInWorkspace: roleMap[userId],
                inviteAccepted: true,
                paymentStatus: 'PAID',
                costPerSeat: userId === 'user-gestor' ? 0 : 3.0,
              };
            }
          }
          // No membership for WORKSPACE_ID_2 by default
          return null;
        }
        // By id
        if (where.id) {
          return {
            id: where.id,
            userId: 'user-colab',
            workspaceId: WORKSPACE_ID,
            roleInWorkspace: 'COLABORADOR',
            inviteAccepted: true,
            paymentStatus: 'PAID',
          };
        }
        return null;
      }),
      findMany: vi.fn(({ where }) => {
        if (where?.userId) {
          return [
            {
              id: 'mem-1',
              userId: where.userId,
              workspaceId: WORKSPACE_ID,
              roleInWorkspace: 'GESTOR',
              inviteAccepted: true,
              paymentStatus: 'PAID',
              costPerSeat: 0,
              workspace: {
                id: WORKSPACE_ID,
                name: 'Test Workspace',
                slug: 'test-ws',
                _count: { memberships: 4 },
              },
            },
          ];
        }
        // List members of workspace
        return Object.entries(users).map(([, u]) => ({
          id: `mem-${u.id}`,
          userId: u.id,
          workspaceId: WORKSPACE_ID,
          roleInWorkspace: u.role === 'SUPER_ADMIN' ? 'GESTOR' : u.role,
          inviteAccepted: true,
          paymentStatus: 'PAID',
          user: { id: u.id, name: u.name, email: u.email, role: u.role, avatar: null },
          createdAt: new Date(),
        }));
      }),
      findFirst: vi.fn(() => null),
      create: vi.fn(({ data }) => ({
        id: `mem-new-${Date.now()}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      delete: vi.fn(() => ({ id: 'deleted' })),
      update: vi.fn(({ where, data }) => ({ id: where.id, ...data })),
      count: vi.fn(() => 4),
    },

    task: {
      findMany: vi.fn(() => taskStore.length > 0 ? taskStore : []),
      findUnique: vi.fn(({ where }) => {
        const t = taskStore.find((t) => t.id === where.id);
        return t || null;
      }),
      findFirst: vi.fn(({ where }) => {
        if (where?.googleTaskId) {
          return taskStore.find((t) => t.googleTaskId === where.googleTaskId) || null;
        }
        return null;
      }),
      create: vi.fn(({ data }) => {
        const task = {
          id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          ...data,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          assignee: null,
          attachments: [],
        };
        taskStore.push(task);
        return task;
      }),
      update: vi.fn(({ where, data }) => {
        const idx = taskStore.findIndex((t) => t.id === where.id);
        if (idx >= 0) {
          taskStore[idx] = { ...taskStore[idx], ...data, updatedAt: new Date(), assignee: null, attachments: [] };
          return taskStore[idx];
        }
        return { id: where.id, ...data, assignee: null, attachments: [] };
      }),
      delete: vi.fn(({ where }) => {
        const idx = taskStore.findIndex((t) => t.id === where.id);
        if (idx >= 0) taskStore.splice(idx, 1);
        return { id: where.id };
      }),
    },

    meeting: {
      findMany: vi.fn(() => meetingStore),
      findUnique: vi.fn(({ where }) => meetingStore.find((m) => m.id === where.id) || null),
      create: vi.fn(({ data }) => {
        const meeting = {
          id: `meet-${Date.now()}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        meetingStore.push(meeting);
        return meeting;
      }),
      update: vi.fn(({ where, data }) => {
        const idx = meetingStore.findIndex((m) => m.id === where.id);
        if (idx >= 0) meetingStore[idx] = { ...meetingStore[idx], ...data };
        return meetingStore[idx];
      }),
      delete: vi.fn(({ where }) => {
        const idx = meetingStore.findIndex((m) => m.id === where.id);
        if (idx >= 0) meetingStore.splice(idx, 1);
        return { id: where.id };
      }),
    },

    subscription: {
      findUnique: vi.fn(() => ({
        id: 'sub-1',
        workspaceId: WORKSPACE_ID,
        basePrice: 5.0,
        seatCount: 4,
        totalMonthlyValue: 14.0,
        autoRenew: true,
        status: 'ACTIVE',
      })),
      findMany: vi.fn(() => [
        {
          workspaceId: WORKSPACE_ID,
          basePrice: 5.0,
          seatCount: 4,
          totalMonthlyValue: 14.0,
          autoRenew: true,
          workspace: {
            name: 'Test Workspace',
            memberships: [{ user: { name: 'Gestor User' } }],
          },
        },
      ]),
      update: vi.fn(({ data }) => ({
        id: 'sub-1',
        workspaceId: WORKSPACE_ID,
        basePrice: 5.0,
        seatCount: 4,
        totalMonthlyValue: 14.0,
        ...data,
      })),
      upsert: vi.fn(({ update }) => ({ id: 'sub-1', workspaceId: WORKSPACE_ID, ...update })),
    },

    notification: {
      findMany: vi.fn(() => notifStore),
      create: vi.fn(({ data }) => {
        const n = { id: `notif-${Date.now()}`, ...data, read: false, createdAt: new Date() };
        notifStore.push(n);
        return n;
      }),
      count: vi.fn(({ where }) => {
        if (where?.read === false) return 2;
        return notifStore.length || 5;
      }),
      updateMany: vi.fn(() => ({ count: 1 })),
      deleteMany: vi.fn(() => ({ count: 1 })),
    },

    // Expose stores for test assertions
    _taskStore: taskStore,
    _meetingStore: meetingStore,
    _notifStore: notifStore,
  };
}

// ─── App Factory ─────────────────────────────────────────────────────

function createApp(prisma) {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // Webhooks (no auth)
  app.use('/api/webhooks', webhookRoutes(prisma));

  // Auth routes
  app.use('/api/auth', authRoutes(prisma));

  // Protected routes
  app.use('/api/workspaces', authMiddleware, workspaceRoutes(prisma));
  app.use('/api/tasks', authMiddleware, tenantGuard(prisma), taskRoutes(prisma));
  app.use('/api/meetings', authMiddleware, tenantGuard(prisma), meetingRoutes(prisma));
  app.use('/api/billing', authMiddleware, tenantGuard(prisma), billingRoutes(prisma));
  app.use('/api/notifications', authMiddleware, notificationRoutes(prisma));

  return app;
}

// ─── Helper functions ────────────────────────────────────────────────

function authHeader(role) {
  return { Authorization: `Bearer ${tokens[role]}` };
}

function wsHeader(workspaceId = WORKSPACE_ID) {
  return { 'X-Workspace-Id': workspaceId };
}

function withAuth(role, workspaceId = WORKSPACE_ID) {
  return { ...authHeader(role), ...wsHeader(workspaceId) };
}

// ═══════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════

describe('Teste de Integração Completo — Todos os Roles', () => {
  let app;
  let prisma;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = createMockPrisma();
    app = createApp(prisma);
  });

  // ─── 1. AUTH ─────────────────────────────────────────────────────

  describe('AUTH /api/auth', () => {
    describe('POST /login', () => {
      it('rejeita sem credenciais', async () => {
        const res = await request(app).post('/api/auth/login').send({});
        expect(res.status).toBe(400);
      });

      it('rejeita credenciais inválidas', async () => {
        bcrypt.compare.mockResolvedValueOnce(false);
        const res = await request(app).post('/api/auth/login').send({
          email: 'gestor@test.co',
          password: 'wrongpass',
        });
        expect(res.status).toBe(401);
      });

      it('retorna token para SUPER_ADMIN', async () => {
        bcrypt.compare.mockResolvedValueOnce(true);
        const res = await request(app).post('/api/auth/login').send({
          email: 'admin@ecom360.co',
          password: 'Admin@360!',
        });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.role).toBe('SUPER_ADMIN');
        expect(res.body.user.password).toBeUndefined();
      });

      it('retorna token para GESTOR', async () => {
        bcrypt.compare.mockResolvedValueOnce(true);
        const res = await request(app).post('/api/auth/login').send({
          email: 'gestor@test.co',
          password: 'pass123',
        });
        expect(res.status).toBe(200);
        expect(res.body.user.role).toBe('GESTOR');
      });

      it('retorna token para COLABORADOR', async () => {
        bcrypt.compare.mockResolvedValueOnce(true);
        const res = await request(app).post('/api/auth/login').send({
          email: 'colab@test.co',
          password: 'pass123',
        });
        expect(res.status).toBe(200);
        expect(res.body.user.role).toBe('COLABORADOR');
      });

      it('retorna token para CLIENTE', async () => {
        bcrypt.compare.mockResolvedValueOnce(true);
        const res = await request(app).post('/api/auth/login').send({
          email: 'cliente@test.co',
          password: 'pass123',
        });
        expect(res.status).toBe(200);
        expect(res.body.user.role).toBe('CLIENTE');
      });
    });

    describe('POST /register', () => {
      it('rejeita campos faltando', async () => {
        const res = await request(app).post('/api/auth/register').send({ email: 'x@x.co' });
        expect(res.status).toBe(400);
      });

      it('registra novo utilizador com sucesso', async () => {
        prisma.user.findUnique.mockResolvedValueOnce(null); // no existing
        const res = await request(app).post('/api/auth/register').send({
          name: 'Novo User',
          email: 'novo@test.co',
          password: 'pass123',
        });
        expect(res.status).toBe(201);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.password).toBeUndefined();
      });

      it('rejeita e-mail duplicado', async () => {
        const res = await request(app).post('/api/auth/register').send({
          name: 'Dup',
          email: 'gestor@test.co',
          password: 'pass123',
        });
        expect(res.status).toBe(409);
      });
    });

    describe('GET /me', () => {
      it('rejeita sem token', async () => {
        const res = await request(app).get('/api/auth/me');
        expect(res.status).toBe(401);
      });

      for (const role of ['superAdmin', 'gestor', 'colaborador', 'cliente']) {
        it(`retorna perfil para ${role}`, async () => {
          const res = await request(app).get('/api/auth/me').set(authHeader(role));
          expect(res.status).toBe(200);
          expect(res.body.id).toBe(users[role].id);
          expect(res.body.password).toBeUndefined();
          expect(res.body.googleRefreshToken).toBeUndefined();
        });
      }
    });

    describe('PATCH /me', () => {
      for (const role of ['superAdmin', 'gestor', 'colaborador', 'cliente']) {
        it(`${role} pode atualizar nome`, async () => {
          const res = await request(app)
            .patch('/api/auth/me')
            .set(authHeader(role))
            .send({ name: 'Updated Name' });
          expect(res.status).toBe(200);
        });
      }
    });
  });

  // ─── 2. WORKSPACES ──────────────────────────────────────────────

  describe('WORKSPACES /api/workspaces', () => {
    describe('GET / — listar workspaces', () => {
      it('rejeita sem auth', async () => {
        const res = await request(app).get('/api/workspaces');
        expect(res.status).toBe(401);
      });

      for (const role of ['superAdmin', 'gestor', 'colaborador', 'cliente']) {
        it(`${role} lista workspaces`, async () => {
          const res = await request(app).get('/api/workspaces').set(authHeader(role));
          expect(res.status).toBe(200);
          expect(Array.isArray(res.body)).toBe(true);
        });
      }
    });

    describe('POST / — criar workspace', () => {
      it('rejeita sem nome', async () => {
        const res = await request(app)
          .post('/api/workspaces')
          .set(authHeader('gestor'))
          .send({});
        expect(res.status).toBe(400);
      });

      for (const role of ['superAdmin', 'gestor', 'colaborador', 'cliente']) {
        it(`${role} pode criar workspace`, async () => {
          const res = await request(app)
            .post('/api/workspaces')
            .set(authHeader(role))
            .send({ name: `WS de ${role}` });
          expect(res.status).toBe(201);
          expect(res.body.name).toContain('WS de');
        });
      }
    });

    describe('POST /invite — convidar membro', () => {
      it('GESTOR pode convidar', async () => {
        prisma.user.findUnique.mockResolvedValueOnce(null); // invitee not found
        const res = await request(app)
          .post('/api/workspaces/invite')
          .set(authHeader('gestor'))
          .set(wsHeader())
          .send({ email: 'new@test.co', roleInWorkspace: 'COLABORADOR' });
        expect(res.status).toBe(201);
        expect(res.body.checkoutUrl).toBeDefined();
      });

      it('CLIENTE pode convidar', async () => {
        prisma.user.findUnique.mockResolvedValueOnce(null);
        const res = await request(app)
          .post('/api/workspaces/invite')
          .set(authHeader('cliente'))
          .set(wsHeader())
          .send({ email: 'new2@test.co', roleInWorkspace: 'COLABORADOR' });
        expect(res.status).toBe(201);
      });

      it('COLABORADOR NÃO pode convidar', async () => {
        const res = await request(app)
          .post('/api/workspaces/invite')
          .set(authHeader('colaborador'))
          .set(wsHeader())
          .send({ email: 'new3@test.co' });
        expect(res.status).toBe(403);
      });
    });

    describe('GET /members — listar membros', () => {
      it('rejeita sem X-Workspace-Id', async () => {
        const res = await request(app)
          .get('/api/workspaces/members')
          .set(authHeader('gestor'));
        expect(res.status).toBe(400);
      });

      for (const role of ['superAdmin', 'gestor', 'colaborador', 'cliente']) {
        it(`${role} pode listar membros`, async () => {
          const res = await request(app)
            .get('/api/workspaces/members')
            .set(authHeader(role))
            .set(wsHeader());
          expect(res.status).toBe(200);
          expect(Array.isArray(res.body)).toBe(true);
        });
      }
    });

    describe('DELETE /members/:id — remover membro', () => {
      it('GESTOR pode remover', async () => {
        const res = await request(app)
          .delete('/api/workspaces/members/mem-user-colab')
          .set(authHeader('gestor'));
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('COLABORADOR NÃO pode remover', async () => {
        const res = await request(app)
          .delete('/api/workspaces/members/mem-user-cliente')
          .set(authHeader('colaborador'));
        expect(res.status).toBe(403);
      });

      it('CLIENTE NÃO pode remover', async () => {
        const res = await request(app)
          .delete('/api/workspaces/members/mem-user-colab')
          .set(authHeader('cliente'));
        expect(res.status).toBe(403);
      });
    });
  });

  // ─── 3. TASKS ───────────────────────────────────────────────────

  describe('TASKS /api/tasks', () => {
    describe('Tenant Guard — isolamento multi-tenant', () => {
      it('rejeita sem X-Workspace-Id', async () => {
        const res = await request(app)
          .get('/api/tasks')
          .set(authHeader('gestor'));
        expect(res.status).toBe(400);
      });

      it('rejeita workspace sem membership', async () => {
        const res = await request(app)
          .get('/api/tasks')
          .set(authHeader('gestor'))
          .set(wsHeader('ws-nonexistent'));
        expect(res.status).toBe(403);
      });

      it('SUPER_ADMIN pode acessar sem workspace header', async () => {
        const res = await request(app)
          .get('/api/tasks')
          .set(authHeader('superAdmin'));
        // SuperAdmin sem workspace → workspaceId é null, a query retorna vazio
        expect(res.status).toBe(200);
      });
    });

    describe('GET / — listar tasks', () => {
      for (const role of ['superAdmin', 'gestor', 'colaborador', 'cliente']) {
        it(`${role} pode listar tasks`, async () => {
          const res = await request(app)
            .get('/api/tasks')
            .set(withAuth(role));
          expect(res.status).toBe(200);
          expect(Array.isArray(res.body)).toBe(true);
        });
      }
    });

    describe('POST / — criar task', () => {
      it('rejeita sem título', async () => {
        const res = await request(app)
          .post('/api/tasks')
          .set(withAuth('gestor'))
          .send({});
        expect(res.status).toBe(400);
      });

      for (const role of ['superAdmin', 'gestor', 'colaborador', 'cliente']) {
        it(`${role} pode criar task`, async () => {
          const res = await request(app)
            .post('/api/tasks')
            .set(withAuth(role))
            .send({
              title: `Tarefa do ${role}`,
              status: 'PENDING',
              priority: 'HIGH',
            });
          expect(res.status).toBe(201);
          expect(res.body.title).toContain(role);
        });
      }

      it('cria task com todos os campos', async () => {
        const res = await request(app)
          .post('/api/tasks')
          .set(withAuth('gestor'))
          .send({
            title: 'Tarefa completa',
            description: 'Descrição detalhada',
            status: 'IN_PROGRESS',
            priority: 'URGENT',
            labels: ['frontend', 'bug'],
            checklist: [{ text: 'Step 1', done: false }],
            coverColor: '#FF5733',
            dueDate: '2026-04-01',
            color: 'blue',
          });
        expect(res.status).toBe(201);
        expect(res.body.title).toBe('Tarefa completa');
      });
    });

    describe('PATCH /:id — atualizar task', () => {
      let taskId;

      beforeEach(async () => {
        const res = await request(app)
          .post('/api/tasks')
          .set(withAuth('gestor'))
          .send({ title: 'Task para editar' });
        taskId = res.body.id;
      });

      for (const role of ['superAdmin', 'gestor', 'colaborador', 'cliente']) {
        it(`${role} pode atualizar task`, async () => {
          const res = await request(app)
            .patch(`/api/tasks/${taskId}`)
            .set(withAuth(role))
            .send({ title: `Editado por ${role}`, version: 1 });
          expect(res.status).toBe(200);
        });
      }

      it('409 quando version está errada (optimistic locking)', async () => {
        const res = await request(app)
          .patch(`/api/tasks/${taskId}`)
          .set(withAuth('gestor'))
          .send({ title: 'Conflito', version: 999 });
        expect(res.status).toBe(409);
        expect(res.body.currentVersion).toBeDefined();
      });

      it('404 para task inexistente', async () => {
        const res = await request(app)
          .patch('/api/tasks/nonexistent')
          .set(withAuth('gestor'))
          .send({ title: 'Nope' });
        expect(res.status).toBe(404);
      });

      it('403 para task de outro workspace', async () => {
        // Create task in another workspace
        prisma.task.findUnique.mockResolvedValueOnce({
          id: 'task-other',
          title: 'Other WS Task',
          workspaceId: WORKSPACE_ID_2,
          version: 1,
        });
        const res = await request(app)
          .patch('/api/tasks/task-other')
          .set(withAuth('gestor'))
          .send({ title: 'Hack!' });
        expect(res.status).toBe(403);
      });
    });

    describe('DELETE /:id — excluir task', () => {
      let taskId;

      beforeEach(async () => {
        const res = await request(app)
          .post('/api/tasks')
          .set(withAuth('gestor'))
          .send({ title: 'Task para excluir' });
        taskId = res.body.id;
      });

      for (const role of ['superAdmin', 'gestor', 'colaborador', 'cliente']) {
        it(`${role} pode excluir task`, async () => {
          const res = await request(app)
            .delete(`/api/tasks/${taskId}`)
            .set(withAuth(role));
          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
        });
      }

      it('403 para task de outro workspace', async () => {
        prisma.task.findUnique.mockResolvedValueOnce({
          id: 'task-other',
          workspaceId: WORKSPACE_ID_2,
        });
        const res = await request(app)
          .delete('/api/tasks/task-other')
          .set(withAuth('gestor'));
        expect(res.status).toBe(403);
      });
    });
  });

  // ─── 4. MEETINGS ────────────────────────────────────────────────

  describe('MEETINGS /api/meetings', () => {
    describe('GET / — listar reuniões', () => {
      for (const role of ['superAdmin', 'gestor', 'colaborador', 'cliente']) {
        it(`${role} pode listar reuniões`, async () => {
          const res = await request(app)
            .get('/api/meetings')
            .set(withAuth(role));
          expect(res.status).toBe(200);
          expect(Array.isArray(res.body)).toBe(true);
        });
      }
    });

    describe('POST / — criar reunião', () => {
      it('rejeita sem título', async () => {
        const res = await request(app)
          .post('/api/meetings')
          .set(withAuth('gestor'))
          .send({});
        expect(res.status).toBe(400);
      });

      for (const role of ['superAdmin', 'gestor', 'colaborador', 'cliente']) {
        it(`${role} pode criar reunião`, async () => {
          const res = await request(app)
            .post('/api/meetings')
            .set(withAuth(role))
            .send({
              title: `Reunião do ${role}`,
              date: '2026-03-10',
              time: '14:00',
            });
          expect(res.status).toBe(201);
          expect(res.body.title).toContain(role);
        });
      }
    });

    describe('DELETE /:id — excluir reunião', () => {
      let meetingId;

      beforeEach(async () => {
        const res = await request(app)
          .post('/api/meetings')
          .set(withAuth('gestor'))
          .send({ title: 'Reunião para excluir' });
        meetingId = res.body.id;
      });

      it('GESTOR pode excluir', async () => {
        const res = await request(app)
          .delete(`/api/meetings/${meetingId}`)
          .set(withAuth('gestor'));
        expect(res.status).toBe(200);
      });

      it('403 para reunião de outro workspace', async () => {
        prisma.meeting.findUnique.mockResolvedValueOnce({
          id: 'meet-other',
          workspaceId: WORKSPACE_ID_2,
        });
        const res = await request(app)
          .delete('/api/meetings/meet-other')
          .set(withAuth('gestor'));
        expect(res.status).toBe(403);
      });
    });
  });

  // ─── 5. BILLING ─────────────────────────────────────────────────

  describe('BILLING /api/billing', () => {
    describe('GET /subscription — ver assinatura', () => {
      for (const role of ['superAdmin', 'gestor', 'colaborador', 'cliente']) {
        it(`${role} pode ver assinatura`, async () => {
          const res = await request(app)
            .get('/api/billing/subscription')
            .set(withAuth(role));
          expect(res.status).toBe(200);
          expect(res.body.basePrice).toBe(5.0);
        });
      }
    });

    describe('PATCH /subscription — toggle autoRenew', () => {
      it('GESTOR pode toggle autoRenew', async () => {
        const res = await request(app)
          .patch('/api/billing/subscription')
          .set(withAuth('gestor'))
          .send({ autoRenew: false });
        expect(res.status).toBe(200);
      });

      it('SUPER_ADMIN (com role GESTOR no workspace) pode toggle', async () => {
        const res = await request(app)
          .patch('/api/billing/subscription')
          .set(withAuth('superAdmin'))
          .send({ autoRenew: false });
        expect(res.status).toBe(200);
      });

      it('COLABORADOR NÃO pode toggle autoRenew', async () => {
        const res = await request(app)
          .patch('/api/billing/subscription')
          .set(withAuth('colaborador'))
          .send({ autoRenew: false });
        expect(res.status).toBe(403);
      });

      it('CLIENTE NÃO pode toggle autoRenew', async () => {
        const res = await request(app)
          .patch('/api/billing/subscription')
          .set(withAuth('cliente'))
          .send({ autoRenew: false });
        expect(res.status).toBe(403);
      });
    });

    describe('GET /overview — visão global (SUPER_ADMIN only)', () => {
      it('SUPER_ADMIN pode ver overview', async () => {
        const res = await request(app)
          .get('/api/billing/overview')
          .set(authHeader('superAdmin'));
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });

      it('GESTOR NÃO pode ver overview', async () => {
        const res = await request(app)
          .get('/api/billing/overview')
          .set(withAuth('gestor'));
        expect(res.status).toBe(403);
      });

      it('COLABORADOR NÃO pode ver overview', async () => {
        const res = await request(app)
          .get('/api/billing/overview')
          .set(withAuth('colaborador'));
        expect(res.status).toBe(403);
      });

      it('CLIENTE NÃO pode ver overview', async () => {
        const res = await request(app)
          .get('/api/billing/overview')
          .set(withAuth('cliente'));
        expect(res.status).toBe(403);
      });
    });

    describe('POST /manual-charge — cobrança manual (SUPER_ADMIN only)', () => {
      it('SUPER_ADMIN pode cobrar manualmente', async () => {
        const res = await request(app)
          .post('/api/billing/manual-charge')
          .set(authHeader('superAdmin'))
          .send({ workspaceId: WORKSPACE_ID, amount: 20.0 });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('GESTOR NÃO pode cobrar manualmente', async () => {
        const res = await request(app)
          .post('/api/billing/manual-charge')
          .set(withAuth('gestor'))
          .send({ workspaceId: WORKSPACE_ID });
        expect(res.status).toBe(403);
      });

      it('COLABORADOR NÃO pode cobrar', async () => {
        const res = await request(app)
          .post('/api/billing/manual-charge')
          .set(withAuth('colaborador'))
          .send({ workspaceId: WORKSPACE_ID });
        expect(res.status).toBe(403);
      });

      it('CLIENTE NÃO pode cobrar', async () => {
        const res = await request(app)
          .post('/api/billing/manual-charge')
          .set(withAuth('cliente'))
          .send({ workspaceId: WORKSPACE_ID });
        expect(res.status).toBe(403);
      });
    });
  });

  // ─── 6. NOTIFICATIONS ──────────────────────────────────────────

  describe('NOTIFICATIONS /api/notifications', () => {
    describe('GET / — listar notificações', () => {
      for (const role of ['superAdmin', 'gestor', 'colaborador', 'cliente']) {
        it(`${role} pode listar notificações`, async () => {
          const res = await request(app)
            .get('/api/notifications')
            .set(authHeader(role));
          expect(res.status).toBe(200);
          expect(res.body.notifications).toBeDefined();
          expect(res.body.unreadCount).toBeDefined();
        });
      }

      it('suporta filtro unreadOnly', async () => {
        const res = await request(app)
          .get('/api/notifications?unreadOnly=true')
          .set(authHeader('gestor'));
        expect(res.status).toBe(200);
      });
    });

    describe('GET /unread-count — contagem de não lidas', () => {
      for (const role of ['superAdmin', 'gestor', 'colaborador', 'cliente']) {
        it(`${role} pode ver contagem`, async () => {
          const res = await request(app)
            .get('/api/notifications/unread-count')
            .set(authHeader(role));
          expect(res.status).toBe(200);
          expect(res.body.count).toBeDefined();
        });
      }
    });

    describe('PATCH /:id/read — marcar como lida', () => {
      it('marca notificação como lida', async () => {
        const res = await request(app)
          .patch('/api/notifications/notif-1/read')
          .set(authHeader('gestor'));
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('404 se notificação não existe', async () => {
        prisma.notification.updateMany.mockResolvedValueOnce({ count: 0 });
        const res = await request(app)
          .patch('/api/notifications/nonexistent/read')
          .set(authHeader('gestor'));
        expect(res.status).toBe(404);
      });
    });

    describe('PATCH /read-all — marcar todas como lidas', () => {
      for (const role of ['superAdmin', 'gestor', 'colaborador', 'cliente']) {
        it(`${role} pode marcar todas como lidas`, async () => {
          const res = await request(app)
            .patch('/api/notifications/read-all')
            .set(authHeader(role));
          expect(res.status).toBe(200);
        });
      }
    });

    describe('DELETE /:id — apagar notificação', () => {
      it('apaga notificação com sucesso', async () => {
        const res = await request(app)
          .delete('/api/notifications/notif-1')
          .set(authHeader('gestor'));
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });
  });

  // ─── 7. WEBHOOKS ────────────────────────────────────────────────

  describe('WEBHOOKS /api/webhooks', () => {
    describe('POST /revolut — payment webhook', () => {
      it('aceita webhook sem auth (público)', async () => {
        const res = await request(app)
          .post('/api/webhooks/revolut')
          .send({
            event: 'ORDER_COMPLETED',
            order: { id: 'stub-123', metadata: { workspaceId: WORKSPACE_ID, email: 'new@test.co' } },
          });
        expect(res.status).toBe(200);
        expect(res.body.received).toBe(true);
      });

      it('ativa membership após payment_success', async () => {
        prisma.membership.findFirst.mockResolvedValueOnce({
          id: 'mem-pending',
          workspaceId: WORKSPACE_ID,
          invitedEmail: 'new@test.co',
          paymentStatus: 'PENDING',
          inviteAccepted: false,
        });

        const res = await request(app)
          .post('/api/webhooks/revolut')
          .send({
            event: 'payment_success',
            order_id: 'order-456',
          });
        expect(res.status).toBe(200);
        expect(prisma.membership.update).toHaveBeenCalled();
      });

      it('ignora replay (já processado)', async () => {
        prisma.membership.findFirst.mockResolvedValueOnce({
          id: 'mem-paid',
          workspaceId: WORKSPACE_ID,
          paymentStatus: 'PAID',
          inviteAccepted: true,
        });

        const res = await request(app)
          .post('/api/webhooks/revolut')
          .send({
            event: 'ORDER_COMPLETED',
            order: { id: 'order-old' },
          });
        expect(res.status).toBe(200);
        expect(prisma.membership.update).not.toHaveBeenCalled();
      });
    });

    describe('POST /google-tasks — sync webhook', () => {
      it('aceita webhook sem auth', async () => {
        const res = await request(app)
          .post('/api/webhooks/google-tasks')
          .send({ resourceId: 'res-1', resourceState: 'sync' });
        expect(res.status).toBe(200);
        expect(res.body.action).toBe('no_action');
      });

      it('atualiza task quando Google é mais recente', async () => {
        const oldDate = new Date('2026-01-01T00:00:00Z');
        const newDate = new Date('2026-03-06T12:00:00Z');

        prisma.task.findFirst.mockResolvedValueOnce({
          id: 'task-sync',
          googleTaskId: 'gt-1',
          title: 'Old Title',
          status: 'PENDING',
          version: 1,
          updatedAt: oldDate,
        });

        const res = await request(app)
          .post('/api/webhooks/google-tasks')
          .send({
            resourceId: 'res-1',
            resourceState: 'update',
            taskData: {
              googleTaskId: 'gt-1',
              title: 'Updated from Google',
              status: 'completed',
              updatedAt: newDate.toISOString(),
            },
          });
        expect(res.status).toBe(200);
        expect(res.body.action).toBe('updated');
      });

      it('mantém local quando diferença < 2s', async () => {
        const now = new Date();
        const almostSame = new Date(now.getTime() + 500);

        prisma.task.findFirst.mockResolvedValueOnce({
          id: 'task-conflict',
          googleTaskId: 'gt-2',
          version: 1,
          updatedAt: now,
        });

        const res = await request(app)
          .post('/api/webhooks/google-tasks')
          .send({
            resourceId: 'res-2',
            resourceState: 'update',
            taskData: {
              googleTaskId: 'gt-2',
              title: 'Google version',
              status: 'needsAction',
              updatedAt: almostSame.toISOString(),
            },
          });
        expect(res.status).toBe(200);
        expect(res.body.action).toBe('skipped');
        expect(res.body.reason).toBe('local_priority');
      });
    });
  });

  // ─── 8. SEGURANÇA & EDGE CASES ─────────────────────────────────

  describe('SEGURANÇA', () => {
    it('rejeita token expirado', async () => {
      const expiredToken = jwt.sign(
        { id: 'user-sa', email: 'admin@ecom360.co', role: 'SUPER_ADMIN' },
        JWT_SECRET,
        { expiresIn: '0s' },
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set({ Authorization: `Bearer ${expiredToken}` });
      expect(res.status).toBe(401);
    });

    it('rejeita token com secret errado', async () => {
      const badToken = jwt.sign(
        { id: 'user-sa', email: 'admin@ecom360.co', role: 'SUPER_ADMIN' },
        'wrong-secret',
        { expiresIn: '1h' },
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set({ Authorization: `Bearer ${badToken}` });
      expect(res.status).toBe(401);
    });

    it('aceita token via query param (SSE compat)', async () => {
      const res = await request(app)
        .get(`/api/auth/me?token=${tokens.gestor}`);
      expect(res.status).toBe(200);
    });

    it('não expõe senha no login', async () => {
      bcrypt.compare.mockResolvedValueOnce(true);
      const res = await request(app).post('/api/auth/login').send({
        email: 'admin@ecom360.co',
        password: 'Admin@360!',
      });
      expect(res.body.user.password).toBeUndefined();
    });

    it('não expõe googleRefreshToken no /me', async () => {
      const res = await request(app).get('/api/auth/me').set(authHeader('gestor'));
      expect(res.body.googleRefreshToken).toBeUndefined();
    });

    it('tenant guard bloqueia workspace não autorizado', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set(authHeader('colaborador'))
        .set(wsHeader('ws-unauthorized'));
      expect(res.status).toBe(403);
    });
  });

  // ─── 9. MATRIX DE PERMISSÕES (resumo) ──────────────────────────

  describe('MATRIX DE PERMISSÕES — Verificação Cruzada', () => {
    const permissionMatrix = [
      {
        name: 'Billing overview (GET) — SUPER_ADMIN only',
        endpoint: '/api/billing/overview',
        method: 'get',
        useWsHeader: true,
        expected: { superAdmin: 200, gestor: 403, colaborador: 403, cliente: 403 },
      },
      {
        name: 'Manual charge (POST) — SUPER_ADMIN only',
        endpoint: '/api/billing/manual-charge',
        method: 'post',
        body: { workspaceId: WORKSPACE_ID, amount: 10 },
        useWsHeader: true,
        expected: { superAdmin: 200, gestor: 403, colaborador: 403, cliente: 403 },
      },
      {
        name: 'Toggle autoRenew (PATCH) — GESTOR only',
        endpoint: '/api/billing/subscription',
        method: 'patch',
        body: { autoRenew: true },
        useWsHeader: true,
        expected: { superAdmin: 200, gestor: 200, colaborador: 403, cliente: 403 },
      },
    ];

    for (const test of permissionMatrix) {
      describe(test.name, () => {
        for (const [role, expectedStatus] of Object.entries(test.expected)) {
          it(`${role} → ${expectedStatus}`, async () => {
            const headers = test.useWsHeader ? withAuth(role) : authHeader(role);
            let req = request(app)[test.method](test.endpoint).set(headers);
            if (test.body) req = req.send(test.body);
            const res = await req;
            expect(res.status).toBe(expectedStatus);
          });
        }
      });
    }
  });
});
