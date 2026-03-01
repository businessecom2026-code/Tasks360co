import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/auth.js';

export function authRoutes(prisma) {
  const router = Router();

  // POST /api/auth/login
  router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha obrigatórios' });
    }

    try {
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const token = generateToken(user);
      const { password: _, ...safeUser } = user;

      res.json({ token, user: safeUser });
    } catch (err) {
      console.error('[Auth:login]', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // POST /api/auth/register
  router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, e-mail e senha obrigatórios' });
    }

    try {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ error: 'E-mail já cadastrado' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { name, email, password: hashedPassword },
      });

      const token = generateToken(user);
      const { password: _, ...safeUser } = user;

      res.status(201).json({ token, user: safeUser });
    } catch (err) {
      console.error('[Auth:register]', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // GET /api/auth/me
  router.get('/me', async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true, name: true, email: true, role: true,
          avatar: true, activeWorkspaceId: true,
          createdAt: true, updatedAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      res.json(user);
    } catch (err) {
      console.error('[Auth:me]', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // PATCH /api/auth/me
  router.patch('/me', async (req, res) => {
    const { name, activeWorkspaceId } = req.body;
    const data = {};

    if (name !== undefined) data.name = name;
    if (activeWorkspaceId !== undefined) data.activeWorkspaceId = activeWorkspaceId;

    try {
      const user = await prisma.user.update({
        where: { id: req.user.id },
        data,
        select: {
          id: true, name: true, email: true, role: true,
          avatar: true, activeWorkspaceId: true,
          createdAt: true, updatedAt: true,
        },
      });

      res.json(user);
    } catch (err) {
      console.error('[Auth:updateMe]', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  return router;
}
