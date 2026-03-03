import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { generateToken, authMiddleware } from './auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'task360-secret-change-in-production';

describe('generateToken', () => {
  it('should generate a valid JWT token', () => {
    const user = { id: 'u1', email: 'test@test.com', role: 'COLABORADOR' };
    const token = generateToken(user);

    expect(token).toBeTruthy();
    const decoded = jwt.verify(token, JWT_SECRET);
    expect(decoded.id).toBe('u1');
    expect(decoded.email).toBe('test@test.com');
    expect(decoded.role).toBe('COLABORADOR');
  });

  it('should set 7-day expiry', () => {
    const user = { id: 'u1', email: 'test@test.com', role: 'GESTOR' };
    const token = generateToken(user);
    const decoded = jwt.verify(token, JWT_SECRET);

    const now = Math.floor(Date.now() / 1000);
    const sevenDays = 7 * 24 * 60 * 60;
    expect(decoded.exp - decoded.iat).toBe(sevenDays);
    expect(decoded.exp).toBeGreaterThan(now);
  });
});

describe('authMiddleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      query: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    next = vi.fn();
  });

  it('should authenticate with Bearer token in header', () => {
    const token = generateToken({ id: 'u1', email: 'a@b.com', role: 'COLABORADOR' });
    req.headers.authorization = `Bearer ${token}`;

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe('u1');
    expect(req.user.email).toBe('a@b.com');
  });

  it('should authenticate with token in query param (SSE)', () => {
    const token = generateToken({ id: 'u2', email: 'b@c.com', role: 'GESTOR' });
    req.query.token = token;

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe('u2');
  });

  it('should reject when no token is provided', () => {
    authMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token não fornecido' });
  });

  it('should reject an invalid token', () => {
    req.headers.authorization = 'Bearer invalid.token.here';

    authMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido ou expirado' });
  });

  it('should reject an expired token', () => {
    const token = jwt.sign(
      { id: 'u1', email: 'a@b.com', role: 'COLABORADOR' },
      JWT_SECRET,
      { expiresIn: '0s' }
    );
    req.headers.authorization = `Bearer ${token}`;

    // Wait a moment to ensure expiry
    authMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should prefer Bearer header over query param', () => {
    const headerToken = generateToken({ id: 'header-user', email: 'h@h.com', role: 'GESTOR' });
    const queryToken = generateToken({ id: 'query-user', email: 'q@q.com', role: 'COLABORADOR' });

    req.headers.authorization = `Bearer ${headerToken}`;
    req.query.token = queryToken;

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe('header-user');
  });
});
