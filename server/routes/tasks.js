import { Router } from 'express';
import { scheduleSyncToGoogle, deleteFromGoogle } from '../services/syncEngine.js';
import { getUserTokens } from '../services/googleAuth.js';
import { createNotification, notifyWorkspace } from '../services/notifications.js';

export function taskRoutes(prisma) {
  const router = Router();

  // GET /api/tasks — list tasks for current workspace
  router.get('/', async (req, res) => {
    const workspaceId = req.workspaceId;

    try {
      const tasks = await prisma.task.findMany({
        where: { workspaceId },
        include: {
          assignee: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(tasks);
    } catch (err) {
      console.error('[Tasks:list]', err);
      res.status(500).json({ error: 'Erro ao listar tarefas' });
    }
  });

  // POST /api/tasks — create a task
  router.post('/', async (req, res) => {
    const workspaceId = req.workspaceId;
    const { title, description, status, assigneeId, dueDate, color, image, priority, labels, checklist, coverColor } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Título obrigatório' });
    }

    try {
      const task = await prisma.task.create({
        data: {
          title,
          description,
          status: status || 'PENDING',
          priority: priority || null,
          labels: labels || undefined,
          checklist: checklist || undefined,
          coverColor: coverColor || undefined,
          assigneeId,
          workspaceId,
          dueDate: dueDate ? new Date(dueDate) : null,
          color,
          image,
        },
        include: {
          assignee: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      });

      // Trigger Google Tasks sync (non-blocking)
      getUserTokens(req.user.id, prisma).then((tokens) => {
        if (tokens) {
          scheduleSyncToGoogle(task.id, { ...task, prisma }, tokens);
        }
      }).catch(() => {});

      // Notify assignee (non-blocking)
      if (assigneeId && assigneeId !== req.user.id) {
        createNotification(prisma, {
          userId: assigneeId,
          workspaceId,
          type: 'task_assigned',
          title: 'Nova tarefa atribuída',
          body: `"${task.title}" foi atribuída a você`,
          data: { taskId: task.id },
        }).catch(() => {});
      }

      res.status(201).json(task);
    } catch (err) {
      console.error('[Tasks:create]', err);
      res.status(500).json({ error: 'Erro ao criar tarefa' });
    }
  });

  // PATCH /api/tasks/:id — update a task (with optimistic locking)
  router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, status, assigneeId, dueDate, color, image, version, priority, labels, checklist, coverColor } = req.body;

    try {
      const existing = await prisma.task.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: 'Tarefa não encontrada' });
      }

      // Verify task belongs to the user's workspace
      if (existing.workspaceId !== req.workspaceId) {
        return res.status(403).json({ error: 'Acesso negado a esta tarefa' });
      }

      // Optimistic locking: if version is provided, check it matches
      if (version !== undefined && existing.version !== version) {
        return res.status(409).json({
          error: 'Conflito de versão. A tarefa foi modificada por outro usuário.',
          currentVersion: existing.version,
        });
      }

      const data = { version: existing.version + 1 };
      if (title !== undefined) data.title = title;
      if (description !== undefined) data.description = description;
      if (status !== undefined) data.status = status;
      if (assigneeId !== undefined) data.assigneeId = assigneeId;
      if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
      if (color !== undefined) data.color = color;
      if (image !== undefined) data.image = image;
      if (priority !== undefined) data.priority = priority;
      if (labels !== undefined) data.labels = labels;
      if (checklist !== undefined) data.checklist = checklist;
      if (coverColor !== undefined) data.coverColor = coverColor;

      const task = await prisma.task.update({
        where: { id },
        data,
        include: {
          assignee: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      });

      // Trigger Google Tasks sync (non-blocking)
      getUserTokens(req.user.id, prisma).then((tokens) => {
        if (tokens) {
          scheduleSyncToGoogle(task.id, task, tokens);
        }
      }).catch(() => {});

      // Notifications (non-blocking)
      const workspaceId = existing.workspaceId;
      if (status && status !== existing.status) {
        notifyWorkspace(prisma, {
          workspaceId,
          type: 'task_moved',
          title: 'Tarefa movida',
          body: `"${task.title}" → ${status}`,
          data: { taskId: task.id, from: existing.status, to: status },
          excludeUserId: req.user.id,
        }).catch(() => {});
      }
      if (assigneeId && assigneeId !== existing.assigneeId && assigneeId !== req.user.id) {
        createNotification(prisma, {
          userId: assigneeId,
          workspaceId,
          type: 'task_assigned',
          title: 'Tarefa atribuída',
          body: `"${task.title}" foi atribuída a você`,
          data: { taskId: task.id },
        }).catch(() => {});
      }

      res.json(task);
    } catch (err) {
      console.error('[Tasks:update]', err);
      res.status(500).json({ error: 'Erro ao atualizar tarefa' });
    }
  });

  // DELETE /api/tasks/:id
  router.delete('/:id', async (req, res) => {
    try {
      // Get task before deleting to check for googleTaskId
      const task = await prisma.task.findUnique({ where: { id: req.params.id } });

      if (!task) {
        return res.status(404).json({ error: 'Tarefa não encontrada' });
      }

      // Verify task belongs to the user's workspace
      if (task.workspaceId !== req.workspaceId) {
        return res.status(403).json({ error: 'Acesso negado a esta tarefa' });
      }

      await prisma.task.delete({ where: { id: req.params.id } });

      // Delete from Google Tasks (non-blocking)
      if (task?.googleTaskId) {
        getUserTokens(req.user.id, prisma).then((tokens) => {
          if (tokens) deleteFromGoogle(task.googleTaskId, tokens);
        }).catch(() => {});
      }

      res.json({ success: true });
    } catch (err) {
      console.error('[Tasks:delete]', err);
      res.status(500).json({ error: 'Erro ao excluir tarefa' });
    }
  });

  return router;
}
