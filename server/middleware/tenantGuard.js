/**
 * Tenant Guard Middleware
 * Ensures a user can only access data within their active workspace.
 * Prevents cross-tenant data access via URL manipulation.
 */
export function tenantGuard(prisma) {
  return async (req, res, next) => {
    const workspaceId = req.headers['x-workspace-id'];

    if (!workspaceId) {
      return res.status(400).json({ error: 'X-Workspace-Id header obrigatório' });
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
        return res.status(403).json({ error: 'Acesso negado a este workspace' });
      }

      req.workspaceId = workspaceId;
      req.membership = membership;
      next();
    } catch (err) {
      console.error('[TenantGuard]', err);
      return res.status(500).json({ error: 'Erro ao verificar permissões' });
    }
  };
}
