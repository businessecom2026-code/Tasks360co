/**
 * Role Guard Middleware
 *
 * requireRole        — gates by global user.role (set in JWT).
 * requireWorkspaceRole — gates by membership.roleInWorkspace (set by tenantGuard).
 */

/**
 * Require one of the given global roles.
 * Must run after authMiddleware.
 *
 * @param {...string} roles  e.g. 'SUPER_ADMIN'
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({
        error: `Acesso restrito a: ${roles.join(', ')}`,
      });
    }
    next();
  };
}

/**
 * Require one of the given workspace-level roles.
 * Must run after tenantGuard (which populates req.membership).
 *
 * @param {...string} roles  e.g. 'GESTOR', 'COLABORADOR'
 */
export function requireWorkspaceRole(...roles) {
  return (req, res, next) => {
    if (!req.membership || !roles.includes(req.membership.roleInWorkspace)) {
      return res.status(403).json({
        error: `Permissão insuficiente. Requer: ${roles.join(' ou ')}`,
      });
    }
    next();
  };
}
