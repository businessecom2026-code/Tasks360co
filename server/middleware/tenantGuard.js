import { t } from '../lib/i18n.js';

/**
 * Tenant Guard Middleware
 * Ensures a user can only access data within their active workspace.
 * Prevents cross-tenant data access via URL manipulation.
 */
export function tenantGuard(prisma) {
  return async (req, res, next) => {
    const workspaceId = req.headers['x-workspace-id'];

    // SUPER_ADMIN can access routes without a workspace header (e.g. billing overview)
    if (!workspaceId && req.user?.role === 'SUPER_ADMIN') {
      req.workspaceId = null;
      req.membership = null;
      return next();
    }

    if (!workspaceId) {
      console.warn(`[TenantGuard] Missing X-Workspace-Id header for user ${req.user?.id} on ${req.method} ${req.originalUrl}`);
      return res.status(400).json({ error: t(req.locale, 'errors.workspaceIdRequired') });
    }

    try {
      // Verify the user has an accepted membership in this workspace
      const membership = await prisma.membership.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId,
          },
        },
      });

      if (!membership || !membership.inviteAccepted || membership.paymentStatus !== 'PAID') {
        console.warn(`[TenantGuard] Access denied for user ${req.user.id} to workspace ${workspaceId} — membership: ${membership ? `accepted=${membership.inviteAccepted}, payment=${membership.paymentStatus}` : 'not found'}`);
        return res.status(403).json({ error: t(req.locale, 'errors.workspaceAccessDenied') });
      }

      req.workspaceId = workspaceId;
      req.membership = membership;
      next();
    } catch (err) {
      console.error('[TenantGuard]', err);
      return res.status(500).json({ error: t(req.locale, 'errors.permissionCheckFailed') });
    }
  };
}
