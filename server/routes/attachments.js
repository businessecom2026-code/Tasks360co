import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const hash = crypto.randomBytes(12).toString('hex');
    cb(null, `${Date.now()}-${hash}${ext}`);
  },
});

const ALLOWED_TYPES = [
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
  // Videos
  'video/mp4', 'video/webm', 'video/quicktime',
];

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de arquivo não suportado: ${file.mimetype}`));
    }
  },
});

export function attachmentRoutes(prisma) {
  const router = Router();

  // GET /api/tasks/:taskId/attachments — list attachments for a task
  router.get('/:taskId/attachments', async (req, res) => {
    const { taskId } = req.params;

    try {
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task || task.workspaceId !== req.workspaceId) {
        return res.status(404).json({ error: 'Tarefa não encontrada' });
      }

      const attachments = await prisma.attachment.findMany({
        where: { taskId },
        orderBy: { createdAt: 'desc' },
      });

      res.json(attachments);
    } catch (err) {
      console.error('[Attachments:list]', err);
      res.status(500).json({ error: 'Erro ao listar anexos' });
    }
  });

  // POST /api/tasks/:taskId/attachments — upload attachment(s)
  router.post('/:taskId/attachments', upload.array('files', 10), async (req, res) => {
    const { taskId } = req.params;

    try {
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task || task.workspaceId !== req.workspaceId) {
        return res.status(404).json({ error: 'Tarefa não encontrada' });
      }

      const files = req.files || [];
      if (files.length === 0) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const attachments = await Promise.all(
        files.map((file) =>
          prisma.attachment.create({
            data: {
              taskId,
              fileName: file.originalname,
              fileUrl: `/uploads/${file.filename}`,
              fileType: file.mimetype,
              fileSize: file.size,
              uploadedById: req.user.id,
            },
          })
        )
      );

      res.status(201).json(attachments);
    } catch (err) {
      console.error('[Attachments:upload]', err);
      res.status(500).json({ error: 'Erro ao fazer upload' });
    }
  });

  // DELETE /api/tasks/:taskId/attachments/:id — delete an attachment
  router.delete('/:taskId/attachments/:id', async (req, res) => {
    const { taskId, id } = req.params;

    try {
      const attachment = await prisma.attachment.findUnique({ where: { id } });
      if (!attachment || attachment.taskId !== taskId) {
        return res.status(404).json({ error: 'Anexo não encontrado' });
      }

      // Verify workspace ownership
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task || task.workspaceId !== req.workspaceId) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      // Delete file from disk
      const filePath = path.join(UPLOADS_DIR, path.basename(attachment.fileUrl));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await prisma.attachment.delete({ where: { id } });

      res.json({ success: true });
    } catch (err) {
      console.error('[Attachments:delete]', err);
      res.status(500).json({ error: 'Erro ao excluir anexo' });
    }
  });

  return router;
}
