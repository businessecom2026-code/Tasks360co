/**
 * Calendar Routes — Google Calendar Integration
 *
 * Endpoints:
 *   GET    /api/calendar/auth          — Start OAuth2 flow
 *   GET    /api/calendar/callback      — OAuth2 callback (redirect)
 *   DELETE /api/calendar/disconnect    — Disconnect Google Calendar
 *   GET    /api/calendar/events        — List events (from Google + local)
 *   POST   /api/calendar/events        — Create event on Google Calendar
 *   PATCH  /api/calendar/events/:id    — Update event
 *   DELETE /api/calendar/events/:id    — Delete event
 *   POST   /api/calendar/sync          — Trigger incremental sync
 *   POST   /api/calendar/watch         — Setup push notifications
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getCalAuthUrl,
  exchangeCalTokens,
  disconnectCalendar,
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  incrementalSync,
  setupWatch,
} from '../services/googleCalendar.js';

export function calendarRoutes(prisma) {
  const router = Router();

  // ─── OAuth Flow ─────────────────────────────────────────

  /** GET /api/calendar/auth — start Google Calendar OAuth2 */
  router.get('/auth', authMiddleware, (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: 'Google OAuth não configurado' });
    }
    const url = getCalAuthUrl(req.user.id);
    res.json({ url });
  });

  /** GET /api/calendar/callback — handle OAuth2 redirect */
  router.get('/callback', async (req, res) => {
    const { code, state: userId } = req.query;

    if (!code || !userId) {
      return res.redirect('/settings?google_cal_error=missing_params');
    }

    try {
      await exchangeCalTokens(code, userId, prisma);

      // Trigger initial incremental sync (background)
      incrementalSync(userId, prisma).catch((err) =>
        console.error('[Calendar:callback] Initial sync failed:', err.message)
      );

      res.redirect('/settings?google_cal_connected=true');
    } catch (err) {
      console.error('[Calendar:callback]', err);
      res.redirect('/settings?google_cal_error=token_exchange_failed');
    }
  });

  /** DELETE /api/calendar/disconnect — remove Calendar connection */
  router.delete('/disconnect', authMiddleware, async (req, res) => {
    try {
      await disconnectCalendar(req.user.id, prisma);
      res.json({ success: true, message: 'Google Calendar desconectado' });
    } catch (err) {
      console.error('[Calendar:disconnect]', err);
      res.status(500).json({ error: 'Erro ao desconectar Calendar' });
    }
  });

  // ─── Events CRUD ────────────────────────────────────────

  /** GET /api/calendar/events — list events */
  router.get('/events', authMiddleware, async (req, res) => {
    try {
      const { timeMin, timeMax, maxResults } = req.query;
      const events = await listEvents(req.user.id, prisma, {
        maxResults: maxResults ? parseInt(maxResults) : 50,
        timeMin: timeMin ? new Date(timeMin) : undefined,
        timeMax: timeMax ? new Date(timeMax) : undefined,
      });
      res.json(events);
    } catch (err) {
      // If not connected, return local events
      if (err.message.includes('não conectado')) {
        const localEvents = await prisma.calendarEvent.findMany({
          where: { userId: req.user.id },
          orderBy: { startTime: 'asc' },
          take: 50,
        });
        return res.json(localEvents);
      }
      console.error('[Calendar:listEvents]', err);
      res.status(500).json({ error: 'Erro ao buscar eventos' });
    }
  });

  /** POST /api/calendar/events — create event */
  router.post('/events', authMiddleware, async (req, res) => {
    const { title, description, startTime, endTime, location, allDay, recurrence, workspaceId } = req.body;

    if (!title || !startTime || !endTime) {
      return res.status(400).json({ error: 'Título, início e fim são obrigatórios' });
    }

    try {
      const event = await createEvent(req.user.id, prisma, {
        title, description, startTime, endTime, location, allDay, recurrence, workspaceId,
      });
      res.status(201).json(event);
    } catch (err) {
      console.error('[Calendar:createEvent]', err);
      res.status(500).json({ error: 'Erro ao criar evento' });
    }
  });

  /** PATCH /api/calendar/events/:id — update event */
  router.patch('/events/:id', authMiddleware, async (req, res) => {
    try {
      const updated = await updateEvent(req.user.id, prisma, req.params.id, req.body);
      res.json(updated);
    } catch (err) {
      console.error('[Calendar:updateEvent]', err);
      res.status(500).json({ error: 'Erro ao atualizar evento' });
    }
  });

  /** DELETE /api/calendar/events/:id — delete event */
  router.delete('/events/:id', authMiddleware, async (req, res) => {
    try {
      await deleteEvent(req.user.id, prisma, req.params.id);
      res.json({ success: true });
    } catch (err) {
      console.error('[Calendar:deleteEvent]', err);
      res.status(500).json({ error: 'Erro ao deletar evento' });
    }
  });

  // ─── Sync & Watch ───────────────────────────────────────

  /** POST /api/calendar/sync — trigger incremental sync */
  router.post('/sync', authMiddleware, async (req, res) => {
    try {
      const stats = await incrementalSync(req.user.id, prisma);
      res.json({ success: true, stats });
    } catch (err) {
      console.error('[Calendar:sync]', err);
      res.status(500).json({ error: 'Erro ao sincronizar calendário' });
    }
  });

  /** POST /api/calendar/watch — setup push notifications */
  router.post('/watch', authMiddleware, async (req, res) => {
    try {
      const result = await setupWatch(req.user.id, prisma);
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('[Calendar:watch]', err);
      res.status(500).json({ error: 'Erro ao configurar notificações push' });
    }
  });

  return router;
}
