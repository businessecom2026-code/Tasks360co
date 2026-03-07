import { Router } from 'express';
import multer from 'multer';
import { processMeeting, validateDuration } from '../services/ai.js';
import { t } from '../lib/i18n.js';
import { validate } from '../middleware/validate.js';
import { createMeetingSchema } from '../schemas/meetings.js';

// Configure multer for in-memory file storage (max 200MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'audio/mpeg', 'audio/wav', 'audio/webm',
      'video/mp4', 'video/webm',
      'text/plain',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(t(_req.locale, 'errors.unsupportedFormat')));
    }
  },
});

export function meetingRoutes(prisma) {
  const router = Router();

  // GET /api/meetings — list meetings for current workspace
  router.get('/', async (req, res) => {
    const workspaceId = req.workspaceId;

    try {
      const meetings = await prisma.meeting.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
      });

      res.json(meetings);
    } catch (err) {
      console.error('[Meetings:list]', err);
      res.status(500).json({ error: t(req.locale, 'errors.listMeetingsError') });
    }
  });

  // POST /api/meetings — create a meeting
  router.post('/', validate(createMeetingSchema), async (req, res) => {
    const workspaceId = req.workspaceId;
    const { title, date, time, participants, link, platform, recordWithAi } = req.body;

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
          recordWithAi: recordWithAi === true,
        },
      });

      res.status(201).json(meeting);
    } catch (err) {
      console.error('[Meetings:create]', err);
      res.status(500).json({ error: t(req.locale, 'errors.createMeetingError') });
    }
  });

  // POST /api/meetings/process — process recording with AI (Gemini 1.5 Flash)
  router.post('/process', upload.single('file'), async (req, res) => {
    const { meetingId } = req.body;

    try {
      let aiResult;

      if (req.file) {
        // File uploaded — validate duration and process with Gemini
        const validation = validateDuration(req.file.size, req.file.mimetype);
        if (!validation.valid) {
          return res.status(400).json({ error: validation.message });
        }

        console.log(`[Meetings:process] File received: ${req.file.originalname} (${(req.file.size / (1024 * 1024)).toFixed(1)}MB, ${req.file.mimetype})`);
        aiResult = await processMeeting(req.file.buffer, req.file.mimetype);
      } else if (meetingId) {
        // No file — process existing meeting (stub/fallback)
        console.log(`[Meetings:process] No file, processing meetingId=${meetingId}`);
        aiResult = await processMeeting('', 'text/plain');
      } else {
        return res.status(400).json({ error: t(req.locale, 'errors.sendFileOrMeetingId') });
      }

      // If meetingId provided, update the meeting record with AI results
      if (meetingId) {
        const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
        if (!meeting || meeting.workspaceId !== req.workspaceId) {
          return res.status(403).json({ error: t(req.locale, 'errors.meetingAccessDenied') });
        }
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
      res.status(500).json({ error: err.message || t(req.locale, 'errors.processMeetingError') });
    }
  });

  // Handle multer errors
  router.use((err, _req, res, next) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: t(_req.locale, 'errors.fileTooLargeMeetings') });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err.message) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  });

  // DELETE /api/meetings/:id
  router.delete('/:id', async (req, res) => {
    try {
      const meeting = await prisma.meeting.findUnique({ where: { id: req.params.id } });

      if (!meeting) {
        return res.status(404).json({ error: t(req.locale, 'errors.meetingNotFound') });
      }

      if (meeting.workspaceId !== req.workspaceId) {
        return res.status(403).json({ error: t(req.locale, 'errors.meetingAccessDenied') });
      }

      await prisma.meeting.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err) {
      console.error('[Meetings:delete]', err);
      res.status(500).json({ error: t(req.locale, 'errors.deleteMeetingError') });
    }
  });

  return router;
}
