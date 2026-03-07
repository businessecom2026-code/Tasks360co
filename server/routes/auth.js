import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken, authMiddleware } from '../middleware/auth.js';
import { getAuthUrl, exchangeCodeForTokens, disconnectGoogle, getUserTokens } from '../services/googleAuth.js';
import { fullSync } from '../services/syncEngine.js';
import { sendWelcomeEmail } from '../services/email.js';
import { t } from '../lib/i18n.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema, updateProfileSchema } from '../schemas/auth.js';

export function authRoutes(prisma) {
  const router = Router();

  // POST /api/auth/login
  router.post('/login', validate(loginSchema), async (req, res) => {
    const { email, password } = req.body;

    try {
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: t(req.locale, 'errors.invalidCredentials') });
      }

      const token = generateToken(user);
      const { password: _, ...safeUser } = user;

      res.json({ token, user: safeUser });
    } catch (err) {
      console.error('[Auth:login]', err);
      res.status(500).json({ error: t(req.locale, 'errors.internalError') });
    }
  });

  // POST /api/auth/register
  router.post('/register', validate(registerSchema), async (req, res) => {
    const { name, email, password } = req.body;

    try {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ error: t(req.locale, 'errors.emailAlreadyRegistered') });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { name, email, password: hashedPassword },
      });

      const token = generateToken(user);
      const { password: _, ...safeUser } = user;

      // Send welcome email (non-blocking)
      sendWelcomeEmail({ to: email, name }).catch((e) =>
        console.error('[Auth:register] Falha ao enviar welcome email:', e)
      );

      res.status(201).json({ token, user: safeUser });
    } catch (err) {
      console.error('[Auth:register]', err);
      res.status(500).json({ error: t(req.locale, 'errors.internalError') });
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
          googleCalRefreshToken: true,
          createdAt: true, updatedAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: t(req.locale, 'errors.userNotFound') });
      }

      // Add connected flags without exposing tokens
      const { googleRefreshToken, googleCalRefreshToken, ...safeUser } = user;
      res.json({
        ...safeUser,
        googleConnected: !!googleRefreshToken,
        googleCalConnected: !!googleCalRefreshToken,
      });
    } catch (err) {
      console.error('[Auth:me]', err);
      res.status(500).json({ error: t(req.locale, 'errors.internalError') });
    }
  });

  // GET /api/auth/google — start Google OAuth2 flow (requires auth)
  router.get('/google', authMiddleware, (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: t(req.locale, 'errors.googleOAuthNotConfigured') });
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
      res.status(500).json({ error: t(req.locale, 'errors.googleDisconnectError') });
    }
  });

  // POST /api/auth/google/sync — trigger full sync (requires auth)
  router.post('/google/sync', authMiddleware, async (req, res) => {
    const workspaceId = req.headers['x-workspace-id'];
    if (!workspaceId) {
      return res.status(400).json({ error: t(req.locale, 'errors.workspaceIdRequired') });
    }

    try {
      const tokens = await getUserTokens(req.user.id, prisma);
      if (!tokens) {
        return res.status(400).json({ error: t(req.locale, 'errors.googleNotConnected') });
      }

      const stats = await fullSync(prisma, workspaceId, tokens);
      res.json({ success: true, stats });
    } catch (err) {
      console.error('[Auth:googleSync]', err);
      res.status(500).json({ error: t(req.locale, 'errors.googleSyncError') });
    }
  });

  // PATCH /api/auth/me (protected)
  router.patch('/me', authMiddleware, validate(updateProfileSchema), async (req, res) => {
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
      res.status(500).json({ error: t(req.locale, 'errors.internalError') });
    }
  });

  return router;
}
