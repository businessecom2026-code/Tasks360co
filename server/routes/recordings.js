import { Router } from 'express';
import multer from 'multer';
import { processMeeting } from '../services/ai.js';
import { notifyWorkspace } from '../services/notifications.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['audio/webm', 'audio/wav', 'audio/mpeg', 'video/webm', 'video/mp4'];
    cb(null, allowed.includes(file.mimetype));
  },
});

export function recordingRoutes(prisma) {
  const router = Router();

  // POST /api/recordings/start — Create session + set RECORDING
  router.post('/start', async (req, res) => {
    const { meetingId } = req.body;
    if (!meetingId) return res.status(400).json({ error: 'meetingId obrigatório' });

    try {
      const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
      if (!meeting || meeting.workspaceId !== req.workspaceId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const session = await prisma.recordingSession.create({
        data: {
          meetingId,
          status: 'RECORDING',
          startedAt: new Date(),
        },
      });

      res.status(201).json(session);
    } catch (err) {
      console.error('[Recording:start]', err);
      res.status(500).json({ error: 'Erro ao iniciar gravação' });
    }
  });

  // PATCH /api/recordings/:id/pause
  router.patch('/:id/pause', async (req, res) => {
    try {
      const session = await findSessionWithAuth(prisma, req.params.id, req.workspaceId);
      if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
      if (session.status !== 'RECORDING') {
        return res.status(400).json({ error: 'Gravação não está em andamento' });
      }

      // Accumulate elapsed time from startedAt/last resume
      const elapsed = Date.now() - new Date(session.startedAt).getTime();
      const updated = await prisma.recordingSession.update({
        where: { id: session.id },
        data: {
          status: 'PAUSED',
          pausedAt: new Date(),
          totalDurationMs: session.totalDurationMs + elapsed,
        },
      });

      res.json(updated);
    } catch (err) {
      console.error('[Recording:pause]', err);
      res.status(500).json({ error: 'Erro ao pausar gravação' });
    }
  });

  // PATCH /api/recordings/:id/resume
  router.patch('/:id/resume', async (req, res) => {
    try {
      const session = await findSessionWithAuth(prisma, req.params.id, req.workspaceId);
      if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
      if (session.status !== 'PAUSED') {
        return res.status(400).json({ error: 'Gravação não está pausada' });
      }

      const updated = await prisma.recordingSession.update({
        where: { id: session.id },
        data: {
          status: 'RECORDING',
          startedAt: new Date(), // reset start reference for next segment
          pausedAt: null,
        },
      });

      res.json(updated);
    } catch (err) {
      console.error('[Recording:resume]', err);
      res.status(500).json({ error: 'Erro ao retomar gravação' });
    }
  });

  // PATCH /api/recordings/:id/stop
  router.patch('/:id/stop', async (req, res) => {
    try {
      const session = await findSessionWithAuth(prisma, req.params.id, req.workspaceId);
      if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
      if (session.status !== 'RECORDING' && session.status !== 'PAUSED') {
        return res.status(400).json({ error: 'Gravação já finalizada' });
      }

      // If was recording, accumulate remaining time
      let finalDuration = session.totalDurationMs;
      if (session.status === 'RECORDING' && session.startedAt) {
        finalDuration += Date.now() - new Date(session.startedAt).getTime();
      }

      const updated = await prisma.recordingSession.update({
        where: { id: session.id },
        data: {
          status: 'STOPPED',
          stoppedAt: new Date(),
          totalDurationMs: finalDuration,
        },
      });

      res.json(updated);
    } catch (err) {
      console.error('[Recording:stop]', err);
      res.status(500).json({ error: 'Erro ao parar gravação' });
    }
  });

  // POST /api/recordings/:id/upload — Upload audio blob + trigger AI processing
  router.post('/:id/upload', upload.single('audio'), async (req, res) => {
    try {
      const session = await findSessionWithAuth(prisma, req.params.id, req.workspaceId);
      if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
      if (session.status !== 'STOPPED') {
        return res.status(400).json({ error: 'Gravação precisa ser parada primeiro' });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'Arquivo de áudio obrigatório' });
      }

      // Mark as processing
      await prisma.recordingSession.update({
        where: { id: session.id },
        data: { status: 'PROCESSING' },
      });

      // Process with Gemini AI
      try {
        const aiResult = await processMeeting(req.file.buffer, req.file.mimetype);

        // Update meeting with AI results
        await prisma.meeting.update({
          where: { id: session.meetingId },
          data: {
            summary: aiResult.summary,
            suggestedTasks: aiResult.suggestedTasks,
            recordingUrl: `recording://${session.id}`, // virtual ref
          },
        });

        // Mark session as done
        const done = await prisma.recordingSession.update({
          where: { id: session.id },
          data: { status: 'DONE' },
        });

        // Notify workspace
        const meeting = await prisma.meeting.findUnique({ where: { id: session.meetingId } });
        if (meeting) {
          await notifyWorkspace(prisma, {
            workspaceId: meeting.workspaceId,
            type: 'recording_ready',
            title: 'Relatório de gravação pronto',
            body: `A IA processou a gravação da reunião "${meeting.title}"`,
            data: { meetingId: meeting.id, recordingSessionId: session.id },
          });
        }

        res.json({ session: done, aiResult });
      } catch (aiErr) {
        // Mark as failed
        await prisma.recordingSession.update({
          where: { id: session.id },
          data: {
            status: 'FAILED',
            errorMessage: aiErr.message || 'Erro no processamento IA',
          },
        });
        throw aiErr;
      }
    } catch (err) {
      console.error('[Recording:upload]', err);
      res.status(500).json({ error: err.message || 'Erro ao processar gravação' });
    }
  });

  // GET /api/recordings/meeting/:meetingId — List sessions for a meeting
  router.get('/meeting/:meetingId', async (req, res) => {
    try {
      const meeting = await prisma.meeting.findUnique({ where: { id: req.params.meetingId } });
      if (!meeting || meeting.workspaceId !== req.workspaceId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const sessions = await prisma.recordingSession.findMany({
        where: { meetingId: req.params.meetingId },
        orderBy: { createdAt: 'desc' },
      });

      res.json(sessions);
    } catch (err) {
      console.error('[Recording:list]', err);
      res.status(500).json({ error: 'Erro ao listar gravações' });
    }
  });

  // Handle multer errors
  router.use((err, _req, res, next) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Arquivo muito grande (200MB)' : err.message });
    }
    next(err);
  });

  return router;
}

// Helper: find session + verify workspace access
async function findSessionWithAuth(prisma, sessionId, workspaceId) {
  const session = await prisma.recordingSession.findUnique({
    where: { id: sessionId },
    include: { meeting: { select: { workspaceId: true } } },
  });
  if (!session || session.meeting.workspaceId !== workspaceId) return null;
  return session;
}
