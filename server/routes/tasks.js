import { Router } from 'express';

export function taskRoutes(prisma) {
  const router = Router();

  // GET /api/tasks — list tasks for current workspace
  router.get('/', async (req, res) => {
    const workspaceId = req.headers['x-workspace-id'];
    if (!workspaceId) {
      return res.status(400).json({ error: 'X-Workspace-Id obrigatório' });
    }

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
    const workspaceId = req.headers['x-workspace-id'];
    if (!workspaceId) {
      return res.status(400).json({ error: 'X-Workspace-Id obrigatório' });
    }

    const { title, description, status, assigneeId, dueDate, color, image } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Título obrigatório' });
    }

    try {
      const task = await prisma.task.create({
        data: {
          title,
          description,
          status: status || 'PENDING',
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

      res.status(201).json(task);
    } catch (err) {
      console.error('[Tasks:create]', err);
      res.status(500).json({ error: 'Erro ao criar tarefa' });
    }
  });

  // PATCH /api/tasks/:id — update a task (with optimistic locking)
  router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, status, assigneeId, dueDate, color, image, version } = req.body;

    try {
      const existing = await prisma.task.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: 'Tarefa não encontrada' });
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

      const task = await prisma.task.update({
        where: { id },
        data,
        include: {
          assignee: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      });

      res.json(task);
    } catch (err) {
      console.error('[Tasks:update]', err);
      res.status(500).json({ error: 'Erro ao atualizar tarefa' });
    }
  });

  // DELETE /api/tasks/:id
  router.delete('/:id', async (req, res) => {
    try {
      await prisma.task.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err) {
      console.error('[Tasks:delete]', err);
      res.status(500).json({ error: 'Erro ao excluir tarefa' });
    }
  });

  return router;
}
