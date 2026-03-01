import { Router } from 'express';

export function meetingRoutes(prisma) {
  const router = Router();

  // GET /api/meetings — list meetings for current workspace
  router.get('/', async (req, res) => {
    const workspaceId = req.headers['x-workspace-id'];
    if (!workspaceId) {
      return res.status(400).json({ error: 'X-Workspace-Id obrigatório' });
    }

    try {
      const meetings = await prisma.meeting.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
      });

      res.json(meetings);
    } catch (err) {
      console.error('[Meetings:list]', err);
      res.status(500).json({ error: 'Erro ao listar reuniões' });
    }
  });

  // POST /api/meetings — create a meeting
  router.post('/', async (req, res) => {
    const workspaceId = req.headers['x-workspace-id'];
    if (!workspaceId) {
      return res.status(400).json({ error: 'X-Workspace-Id obrigatório' });
    }

    const { title, date, time, participants, link, platform } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Título obrigatório' });
    }

    try {
      const meeting = await prisma.meeting.create({
        data: {
          title,
          date: date || new Date().toISOString().split('T')[0],
          time: time || '09:00',
          participants: participants || [],
          link,
          platform: platform || 'Google Meet',
          workspaceId,
        },
      });

      res.status(201).json(meeting);
    } catch (err) {
      console.error('[Meetings:create]', err);
      res.status(500).json({ error: 'Erro ao criar reunião' });
    }
  });

  // POST /api/meetings/process — process recording with AI (Gemini 1.5 Flash stub)
  router.post('/process', async (req, res) => {
    const { meetingId } = req.body;

    try {
      // In production: Upload file to storage, then call Gemini 1.5 Flash API
      // const transcription = await geminiService.transcribe(file);
      // const analysis = await geminiService.analyze(transcription, {
      //   maxDuration: 3600, // 60 minutes constraint
      //   outputFormat: { summary: 'string', suggestedTasks: [{ title, deadline }] }
      // });

      // Stub response for development
      const aiResult = {
        summary: 'Reunião sobre planejamento do sprint. Foram discutidos os próximos passos do projeto, incluindo melhorias no Kanban, integração com Google Tasks e configuração do billing.',
        suggestedTasks: [
          { title: 'Implementar drag-and-drop no Kanban', deadline: '2026-03-07' },
          { title: 'Configurar OAuth Google Tasks', deadline: '2026-03-10' },
          { title: 'Testar fluxo de pagamento Revolut', deadline: '2026-03-14' },
        ],
      };

      // If meetingId, update the meeting record
      if (meetingId) {
        await prisma.meeting.update({
          where: { id: meetingId },
          data: {
            summary: aiResult.summary,
            suggestedTasks: aiResult.suggestedTasks,
          },
        });
      }

      res.json(aiResult);
    } catch (err) {
      console.error('[Meetings:process]', err);
      res.status(500).json({ error: 'Erro ao processar reunião com IA' });
    }
  });

  // DELETE /api/meetings/:id
  router.delete('/:id', async (req, res) => {
    try {
      await prisma.meeting.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err) {
      console.error('[Meetings:delete]', err);
      res.status(500).json({ error: 'Erro ao excluir reunião' });
    }
  });

  return router;
}
