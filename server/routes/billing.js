import { Router } from 'express';

export function billingRoutes(prisma) {
  const router = Router();

  // GET /api/billing/subscription — get current workspace subscription
  router.get('/subscription', async (req, res) => {
    const workspaceId = req.headers['x-workspace-id'];
    if (!workspaceId) {
      return res.status(400).json({ error: 'X-Workspace-Id obrigatório' });
    }

    try {
      const subscription = await prisma.subscription.findUnique({
        where: { workspaceId },
      });

      if (!subscription) {
        return res.status(404).json({ error: 'Assinatura não encontrada' });
      }

      res.json(subscription);
    } catch (err) {
      console.error('[Billing:subscription]', err);
      res.status(500).json({ error: 'Erro ao buscar assinatura' });
    }
  });

  // PATCH /api/billing/subscription — update subscription (e.g., toggle autoRenew)
  router.patch('/subscription', async (req, res) => {
    const workspaceId = req.headers['x-workspace-id'];
    if (!workspaceId) {
      return res.status(400).json({ error: 'X-Workspace-Id obrigatório' });
    }

    const { autoRenew } = req.body;

    try {
      const subscription = await prisma.subscription.update({
        where: { workspaceId },
        data: { autoRenew },
      });

      res.json(subscription);
    } catch (err) {
      console.error('[Billing:updateSubscription]', err);
      res.status(500).json({ error: 'Erro ao atualizar assinatura' });
    }
  });

  // GET /api/billing/overview — admin: get billing for all workspaces
  router.get('/overview', async (req, res) => {
    // Only SUPER_ADMIN or GESTOR can see billing overview
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'GESTOR') {
      return res.status(403).json({ error: 'Acesso restrito a administradores' });
    }

    try {
      let subscriptions;

      if (req.user.role === 'SUPER_ADMIN') {
        // Super admin sees all
        subscriptions = await prisma.subscription.findMany({
          include: {
            workspace: {
              include: {
                memberships: {
                  where: { roleInWorkspace: 'GESTOR' },
                  include: { user: { select: { name: true } } },
                  take: 1,
                },
              },
            },
          },
        });
      } else {
        // Gestor sees only their workspaces
        const memberships = await prisma.membership.findMany({
          where: { userId: req.user.id, roleInWorkspace: 'GESTOR' },
          select: { workspaceId: true },
        });

        const workspaceIds = memberships.map((m) => m.workspaceId);
        subscriptions = await prisma.subscription.findMany({
          where: { workspaceId: { in: workspaceIds } },
          include: {
            workspace: {
              include: {
                memberships: {
                  where: { roleInWorkspace: 'GESTOR' },
                  include: { user: { select: { name: true } } },
                  take: 1,
                },
              },
            },
          },
        });
      }

      const overview = subscriptions.map((sub) => ({
        workspaceId: sub.workspaceId,
        workspaceName: sub.workspace.name,
        gestorName: sub.workspace.memberships[0]?.user?.name || 'N/A',
        basePrice: sub.basePrice,
        activeSeats: sub.seatCount,
        seatCost: Math.max(0, (sub.seatCount - 1) * 3.0),
        totalMonthly: sub.totalMonthlyValue,
        autoRenew: sub.autoRenew,
      }));

      res.json(overview);
    } catch (err) {
      console.error('[Billing:overview]', err);
      res.status(500).json({ error: 'Erro ao buscar faturamento' });
    }
  });

  // POST /api/billing/manual-charge — admin: generate manual charge via Revolut
  router.post('/manual-charge', async (req, res) => {
    const { workspaceId, amount, description } = req.body;

    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Acesso restrito a Super Admins' });
    }

    try {
      // In production: Create Revolut payment order
      // const order = await revolutService.createOrder({
      //   amount: amount || subscription.totalMonthlyValue * 100,
      //   currency: 'EUR',
      //   description: description || 'Cobrança manual Task360',
      //   metadata: { workspaceId },
      // });

      console.log(`[Billing] Manual charge triggered for workspace ${workspaceId}: ${amount || 'auto'} EUR`);

      res.json({
        success: true,
        message: 'Cobrança manual enviada (stub - integrar Revolut API)',
        // In production: orderId: order.id, paymentUrl: order.checkout_url
      });
    } catch (err) {
      console.error('[Billing:manualCharge]', err);
      res.status(500).json({ error: 'Erro ao gerar cobrança' });
    }
  });

  return router;
}
