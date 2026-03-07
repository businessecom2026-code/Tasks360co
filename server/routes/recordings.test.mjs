/**
 * Testes de Integração — Recording Routes
 *
 * Testa todo o fluxo: start → pause → resume → stop → upload/process
 * + validações de estado + controle de acesso por workspace.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ─── Mock external services ─────────────────────────────────────────

vi.mock('../services/ai.js', () => ({
  processMeeting: vi.fn(() =>
    Promise.resolve({
      summary: 'Resumo da gravação de teste',
      suggestedTasks: [{ title: 'Tarefa sugerida pela IA', deadline: '2026-03-15' }],
    }),
  ),
  validateDuration: vi.fn(() => ({ valid: true })),
}));

vi.mock('../services/notifications.js', () => ({
  addConnection: vi.fn(),
  sendToUser: vi.fn(),
  sendToWorkspace: vi.fn(),
  createNotification: vi.fn(() => Promise.resolve({ id: 'notif-1' })),
  notifyWorkspace: vi.fn(() => Promise.resolve([])),
}));

// ─── Imports ─────────────────────────────────────────────────────────

import { authMiddleware } from '../middleware/auth.js';
import { tenantGuard } from '../middleware/tenantGuard.js';
import { recordingRoutes } from './recordings.js';

// ─── Constants ───────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || 'task360-secret-change-in-production';
const WORKSPACE_ID = 'ws-rec-test';
const MEETING_ID = 'meet-rec-001';

const gestor = { id: 'user-gestor', email: 'gestor@test.co', role: 'GESTOR', name: 'Gestor' };
const outsider = { id: 'user-outsider', email: 'outsider@test.co', role: 'COLABORADOR', name: 'Outsider' };

const gestorToken = jwt.sign({ id: gestor.id, email: gestor.email, role: gestor.role }, JWT_SECRET, { expiresIn: '1h' });
const outsiderToken = jwt.sign({ id: outsider.id, email: outsider.email, role: outsider.role }, JWT_SECRET, { expiresIn: '1h' });

// ─── Prisma Mock ─────────────────────────────────────────────────────

function createMockPrisma() {
  const sessionStore = [];

  return {
    user: {
      findUnique: vi.fn(({ where }) => {
        if (where.id === gestor.id) return { ...gestor, password: 'hashed' };
        if (where.id === outsider.id) return { ...outsider, password: 'hashed' };
        return null;
      }),
    },

    membership: {
      findUnique: vi.fn(({ where }) => {
        if (where.userId_workspaceId) {
          const { userId, workspaceId } = where.userId_workspaceId;
          if (userId === gestor.id && workspaceId === WORKSPACE_ID) {
            return { id: 'mem-g', userId, workspaceId, roleInWorkspace: 'GESTOR', inviteAccepted: true, paymentStatus: 'PAID' };
          }
        }
        return null;
      }),
    },

    meeting: {
      findUnique: vi.fn(({ where }) => {
        if (where.id === MEETING_ID) {
          return { id: MEETING_ID, title: 'Reunião Teste', workspaceId: WORKSPACE_ID, recordWithAi: true };
        }
        return null;
      }),
      update: vi.fn(({ where, data }) => ({ id: where.id, ...data })),
    },

    recordingSession: {
      create: vi.fn(({ data }) => {
        const s = {
          id: `rec-${Date.now()}`,
          ...data,
          totalDurationMs: 0,
          audioUrl: null,
          processingJobId: null,
          errorMessage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        sessionStore.push(s);
        return s;
      }),
      findUnique: vi.fn(({ where, include }) => {
        const s = sessionStore.find((s) => s.id === where.id);
        if (!s) return null;
        if (include?.meeting) {
          return { ...s, meeting: { workspaceId: WORKSPACE_ID } };
        }
        return s;
      }),
      findMany: vi.fn(({ where }) => sessionStore.filter((s) => s.meetingId === where.meetingId)),
      update: vi.fn(({ where, data }) => {
        const idx = sessionStore.findIndex((s) => s.id === where.id);
        if (idx >= 0) {
          sessionStore[idx] = { ...sessionStore[idx], ...data, updatedAt: new Date() };
          return sessionStore[idx];
        }
        return { id: where.id, ...data };
      }),
    },

    _sessionStore: sessionStore,
  };
}

// ─── App Factory ─────────────────────────────────────────────────────

function createApp(prisma) {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use('/api/recordings', authMiddleware, tenantGuard(prisma), recordingRoutes(prisma));
  return app;
}

function headers(token = gestorToken) {
  return { Authorization: `Bearer ${token}`, 'X-Workspace-Id': WORKSPACE_ID };
}

// ═══════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════

describe('Recording Routes — /api/recordings', () => {
  let app;
  let prisma;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = createMockPrisma();
    app = createApp(prisma);
  });

  // ── START ──────────────────────────────────────────────────────────

  describe('POST /start', () => {
    it('cria sessão de gravação com status RECORDING', async () => {
      const res = await request(app)
        .post('/api/recordings/start')
        .set(headers())
        .send({ meetingId: MEETING_ID });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('RECORDING');
      expect(res.body.meetingId).toBe(MEETING_ID);
      expect(res.body.startedAt).toBeDefined();
    });

    it('rejeita sem meetingId', async () => {
      const res = await request(app)
        .post('/api/recordings/start')
        .set(headers())
        .send({});

      expect(res.status).toBe(400);
    });

    it('rejeita acesso a meeting de outro workspace', async () => {
      prisma.meeting.findUnique.mockResolvedValueOnce({
        id: 'meet-other',
        workspaceId: 'ws-other',
      });

      const res = await request(app)
        .post('/api/recordings/start')
        .set(headers())
        .send({ meetingId: 'meet-other' });

      expect(res.status).toBe(403);
    });

    it('rejeita usuário sem membership no workspace', async () => {
      const res = await request(app)
        .post('/api/recordings/start')
        .set({ Authorization: `Bearer ${outsiderToken}`, 'X-Workspace-Id': WORKSPACE_ID })
        .send({ meetingId: MEETING_ID });

      expect(res.status).toBe(403);
    });
  });

  // ── PAUSE ─────────────────────────────────────────────────────────

  describe('PATCH /:id/pause', () => {
    it('pausa gravação em andamento', async () => {
      // Create session first
      const start = await request(app)
        .post('/api/recordings/start')
        .set(headers())
        .send({ meetingId: MEETING_ID });

      const sessionId = start.body.id;

      const res = await request(app)
        .patch(`/api/recordings/${sessionId}/pause`)
        .set(headers());

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PAUSED');
      expect(res.body.pausedAt).toBeDefined();
    });

    it('rejeita pause em sessão que não está gravando', async () => {
      const start = await request(app)
        .post('/api/recordings/start')
        .set(headers())
        .send({ meetingId: MEETING_ID });

      const sessionId = start.body.id;

      // Pause first time
      await request(app)
        .patch(`/api/recordings/${sessionId}/pause`)
        .set(headers());

      // Try to pause again — should fail
      const res = await request(app)
        .patch(`/api/recordings/${sessionId}/pause`)
        .set(headers());

      expect(res.status).toBe(400);
    });

    it('404 para sessão inexistente', async () => {
      const res = await request(app)
        .patch('/api/recordings/nonexistent/pause')
        .set(headers());

      expect(res.status).toBe(404);
    });
  });

  // ── RESUME ────────────────────────────────────────────────────────

  describe('PATCH /:id/resume', () => {
    it('retoma gravação pausada', async () => {
      const start = await request(app)
        .post('/api/recordings/start')
        .set(headers())
        .send({ meetingId: MEETING_ID });

      const sessionId = start.body.id;

      await request(app)
        .patch(`/api/recordings/${sessionId}/pause`)
        .set(headers());

      const res = await request(app)
        .patch(`/api/recordings/${sessionId}/resume`)
        .set(headers());

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('RECORDING');
    });

    it('rejeita resume em sessão que não está pausada', async () => {
      const start = await request(app)
        .post('/api/recordings/start')
        .set(headers())
        .send({ meetingId: MEETING_ID });

      const res = await request(app)
        .patch(`/api/recordings/${start.body.id}/resume`)
        .set(headers());

      expect(res.status).toBe(400);
    });
  });

  // ── STOP ──────────────────────────────────────────────────────────

  describe('PATCH /:id/stop', () => {
    it('para gravação em andamento', async () => {
      const start = await request(app)
        .post('/api/recordings/start')
        .set(headers())
        .send({ meetingId: MEETING_ID });

      const res = await request(app)
        .patch(`/api/recordings/${start.body.id}/stop`)
        .set(headers());

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('STOPPED');
      expect(res.body.stoppedAt).toBeDefined();
    });

    it('para gravação pausada', async () => {
      const start = await request(app)
        .post('/api/recordings/start')
        .set(headers())
        .send({ meetingId: MEETING_ID });

      await request(app)
        .patch(`/api/recordings/${start.body.id}/pause`)
        .set(headers());

      const res = await request(app)
        .patch(`/api/recordings/${start.body.id}/stop`)
        .set(headers());

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('STOPPED');
    });

    it('rejeita stop em sessão já parada', async () => {
      const start = await request(app)
        .post('/api/recordings/start')
        .set(headers())
        .send({ meetingId: MEETING_ID });

      await request(app)
        .patch(`/api/recordings/${start.body.id}/stop`)
        .set(headers());

      const res = await request(app)
        .patch(`/api/recordings/${start.body.id}/stop`)
        .set(headers());

      expect(res.status).toBe(400);
    });
  });

  // ── UPLOAD & PROCESS ──────────────────────────────────────────────

  describe('POST /:id/upload', () => {
    it('processa áudio com IA e atualiza meeting', async () => {
      const start = await request(app)
        .post('/api/recordings/start')
        .set(headers())
        .send({ meetingId: MEETING_ID });

      await request(app)
        .patch(`/api/recordings/${start.body.id}/stop`)
        .set(headers());

      const audioBuffer = Buffer.from('fake-audio-data');

      const res = await request(app)
        .post(`/api/recordings/${start.body.id}/upload`)
        .set(headers())
        .attach('audio', audioBuffer, { filename: 'test.webm', contentType: 'audio/webm' });

      expect(res.status).toBe(200);
      expect(res.body.session.status).toBe('DONE');
      expect(res.body.aiResult.summary).toBe('Resumo da gravação de teste');
      expect(res.body.aiResult.suggestedTasks).toHaveLength(1);

      // Verify meeting was updated
      expect(prisma.meeting.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: MEETING_ID },
          data: expect.objectContaining({ summary: 'Resumo da gravação de teste' }),
        }),
      );
    });

    it('rejeita upload em sessão que não está STOPPED', async () => {
      const start = await request(app)
        .post('/api/recordings/start')
        .set(headers())
        .send({ meetingId: MEETING_ID });

      const res = await request(app)
        .post(`/api/recordings/${start.body.id}/upload`)
        .set(headers())
        .attach('audio', Buffer.from('data'), { filename: 'test.webm', contentType: 'audio/webm' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('parada');
    });

    it('rejeita upload sem arquivo', async () => {
      const start = await request(app)
        .post('/api/recordings/start')
        .set(headers())
        .send({ meetingId: MEETING_ID });

      await request(app)
        .patch(`/api/recordings/${start.body.id}/stop`)
        .set(headers());

      const res = await request(app)
        .post(`/api/recordings/${start.body.id}/upload`)
        .set(headers());

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('obrigatório');
    });
  });

  // ── LIST SESSIONS ─────────────────────────────────────────────────

  describe('GET /meeting/:meetingId', () => {
    it('lista sessões de gravação de uma reunião', async () => {
      // Create 2 sessions
      await request(app)
        .post('/api/recordings/start')
        .set(headers())
        .send({ meetingId: MEETING_ID });

      await request(app)
        .post('/api/recordings/start')
        .set(headers())
        .send({ meetingId: MEETING_ID });

      const res = await request(app)
        .get(`/api/recordings/meeting/${MEETING_ID}`)
        .set(headers());

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('rejeita acesso a reunião de outro workspace', async () => {
      prisma.meeting.findUnique.mockResolvedValueOnce({
        id: 'meet-other',
        workspaceId: 'ws-other',
      });

      const res = await request(app)
        .get('/api/recordings/meeting/meet-other')
        .set(headers());

      expect(res.status).toBe(403);
    });
  });

  // ── FULL FLOW ─────────────────────────────────────────────────────

  describe('FLUXO COMPLETO: Start → Pause → Resume → Stop → Upload', () => {
    it('executa ciclo completo de gravação com sucesso', async () => {
      // 1. Start
      const start = await request(app)
        .post('/api/recordings/start')
        .set(headers())
        .send({ meetingId: MEETING_ID });

      expect(start.body.status).toBe('RECORDING');
      const id = start.body.id;

      // 2. Pause
      const pause = await request(app)
        .patch(`/api/recordings/${id}/pause`)
        .set(headers());

      expect(pause.body.status).toBe('PAUSED');

      // 3. Resume
      const resume = await request(app)
        .patch(`/api/recordings/${id}/resume`)
        .set(headers());

      expect(resume.body.status).toBe('RECORDING');

      // 4. Stop
      const stop = await request(app)
        .patch(`/api/recordings/${id}/stop`)
        .set(headers());

      expect(stop.body.status).toBe('STOPPED');

      // 5. Upload & Process
      const upload = await request(app)
        .post(`/api/recordings/${id}/upload`)
        .set(headers())
        .attach('audio', Buffer.from('test-audio'), { filename: 'rec.webm', contentType: 'audio/webm' });

      expect(upload.body.session.status).toBe('DONE');
      expect(upload.body.aiResult.summary).toBeDefined();
      expect(upload.body.aiResult.suggestedTasks.length).toBeGreaterThan(0);
    });
  });

  // ── STATE MACHINE VALIDATION ──────────────────────────────────────

  describe('MÁQUINA DE ESTADOS — Transições inválidas', () => {
    it('não permite pause → pause', async () => {
      const start = await request(app)
        .post('/api/recordings/start')
        .set(headers())
        .send({ meetingId: MEETING_ID });

      await request(app).patch(`/api/recordings/${start.body.id}/pause`).set(headers());
      const res = await request(app).patch(`/api/recordings/${start.body.id}/pause`).set(headers());
      expect(res.status).toBe(400);
    });

    it('não permite resume sem pause prévio', async () => {
      const start = await request(app)
        .post('/api/recordings/start')
        .set(headers())
        .send({ meetingId: MEETING_ID });

      const res = await request(app).patch(`/api/recordings/${start.body.id}/resume`).set(headers());
      expect(res.status).toBe(400);
    });

    it('não permite upload sem stop prévio', async () => {
      const start = await request(app)
        .post('/api/recordings/start')
        .set(headers())
        .send({ meetingId: MEETING_ID });

      const res = await request(app)
        .post(`/api/recordings/${start.body.id}/upload`)
        .set(headers())
        .attach('audio', Buffer.from('data'), { filename: 'r.webm', contentType: 'audio/webm' });

      expect(res.status).toBe(400);
    });

    it('não permite stop duplo', async () => {
      const start = await request(app)
        .post('/api/recordings/start')
        .set(headers())
        .send({ meetingId: MEETING_ID });

      await request(app).patch(`/api/recordings/${start.body.id}/stop`).set(headers());
      const res = await request(app).patch(`/api/recordings/${start.body.id}/stop`).set(headers());
      expect(res.status).toBe(400);
    });
  });
});
