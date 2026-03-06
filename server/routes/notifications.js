import { Router } from 'express';
import { addConnection, sendToUser } from '../services/notifications.js';

export function notificationRoutes(prisma) {
  const router = Router();

  // GET /api/notifications/stream — SSE endpoint
  router.get('/stream', (req, res) => {
    const userId = req.user.id;

    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Nginx compatibility
    });

    // Send initial heartbeat
    res.write(`event: connected\ndata: ${JSON.stringify({ userId })}\n\n`);

    // Register connection
    addConnection(userId, res);

    // Heartbeat every 30s to keep connection alive
    const heartbeat = setInterval(() => {
      try {
        res.write(`:heartbeat\n\n`);
      } catch {
        clearInterval(heartbeat);
      }
    }, 30000);

    req.on('close', () => {
      clearInterval(heartbeat);
    });
  });

  // GET /api/notifications — list user notifications
  router.get('/', async (req, res) => {
    const userId = req.user.id;
    const { limit = 30, offset = 0, unreadOnly } = req.query;

    try {
      const where = { userId };
      if (unreadOnly === 'true') {
        where.read = false;
      }

      const [notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit),
          skip: parseInt(offset),
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({ where: { userId, read: false } }),
      ]);

      res.json({ notifications, total, unreadCount });
    } catch (err) {
      console.error('[Notifications:list]', err);
      res.status(500).json({ error: 'Erro ao buscar notificações' });
    }
  });

  // GET /api/notifications/unread-count — quick badge count
  router.get('/unread-count', async (req, res) => {
    try {
      const count = await prisma.notification.count({
        where: { userId: req.user.id, read: false },
      });
      res.json({ count });
    } catch (err) {
      console.error('[Notifications:unreadCount]', err);
      res.status(500).json({ error: 'Erro ao contar notificações' });
    }
  });

  // PATCH /api/notifications/:id/read — mark one as read
  router.patch('/:id/read', async (req, res) => {
    try {
      const notification = await prisma.notification.updateMany({
        where: { id: req.params.id, userId: req.user.id },
        data: { read: true },
      });

      if (notification.count === 0) {
        return res.status(404).json({ error: 'Notificação não encontrada' });
      }

      res.json({ success: true });
    } catch (err) {
      console.error('[Notifications:markRead]', err);
      res.status(500).json({ error: 'Erro ao marcar como lida' });
    }
  });

  // PATCH /api/notifications/read-all — mark all as read
  router.patch('/read-all', async (req, res) => {
    try {
      await prisma.notification.updateMany({
        where: { userId: req.user.id, read: false },
        data: { read: true },
      });
      res.json({ success: true });
    } catch (err) {
      console.error('[Notifications:readAll]', err);
      res.status(500).json({ error: 'Erro ao marcar todas como lidas' });
    }
  });

  // DELETE /api/notifications/:id — delete one notification
  router.delete('/:id', async (req, res) => {
    try {
      await prisma.notification.deleteMany({
        where: { id: req.params.id, userId: req.user.id },
      });
      res.json({ success: true });
    } catch (err) {
      console.error('[Notifications:delete]', err);
      res.status(500).json({ error: 'Erro ao apagar notificação' });
    }
  });

  return router;
}
