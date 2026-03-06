import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken, authMiddleware } from '../middleware/auth.js';
import { getAuthUrl, exchangeCodeForTokens, disconnectGoogle, getUserTokens } from '../services/googleAuth.js';
import { fullSync } from '../services/syncEngine.js';

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

  // GET /api/auth/me (protected)
  router.get('/me', authMiddleware, async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true, name: true, email: true, role: true,
          avatar: true, activeWorkspaceId: true,
          googleRefreshToken: true,
          createdAt: true, updatedAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Add googleConnected flag without exposing tokens
      const { googleRefreshToken, ...safeUser } = user;
      res.json({ ...safeUser, googleConnected: !!googleRefreshToken });
    } catch (err) {
      console.error('[Auth:me]', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // GET /api/auth/google — start Google OAuth2 flow (requires auth)
  router.get('/google', authMiddleware, (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: 'Google OAuth não configurado (GOOGLE_CLIENT_ID ausente)' });
    }

    const url = getAuthUrl(req.user.id);
    res.json({ url });
  });

  // GET /api/auth/google/callback — handle Google OAuth2 callback
  router.get('/google/callback', async (req, res) => {
    const { code, state: userId } = req.query;

    if (!code || !userId) {
      return res.redirect('/?google_error=missing_params');
    }

    try {
      await exchangeCodeForTokens(code, userId, prisma);
      res.redirect('/settings?google_connected=true');
    } catch (err) {
      console.error('[Auth:googleCallback]', err);
      res.redirect('/settings?google_error=token_exchange_failed');
    }
  });

  // DELETE /api/auth/google — disconnect Google account (requires auth)
  router.delete('/google', authMiddleware, async (req, res) => {
    try {
      await disconnectGoogle(req.user.id, prisma);
      res.json({ success: true, message: 'Google Tasks desconectado' });
    } catch (err) {
      console.error('[Auth:googleDisconnect]', err);
      res.status(500).json({ error: 'Erro ao desconectar Google' });
    }
  });

  // POST /api/auth/google/sync — trigger full sync (requires auth)
  router.post('/google/sync', authMiddleware, async (req, res) => {
    const workspaceId = req.headers['x-workspace-id'];
    if (!workspaceId) {
      return res.status(400).json({ error: 'X-Workspace-Id obrigatório' });
    }

    try {
      const tokens = await getUserTokens(req.user.id, prisma);
      if (!tokens) {
        return res.status(400).json({ error: 'Conta Google não conectada' });
      }

      const stats = await fullSync(prisma, workspaceId, tokens);
      res.json({ success: true, stats });
    } catch (err) {
      console.error('[Auth:googleSync]', err);
      res.status(500).json({ error: 'Erro ao sincronizar com Google Tasks' });
    }
  });

  // PATCH /api/auth/me (protected)
  router.patch('/me', authMiddleware, async (req, res) => {
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
