import { Router } from 'express';
import { createManualCharge } from '../services/billing.js';

export function billingRoutes(prisma) {
  const router = Router();

  // GET /api/billing/subscription — get current workspace subscription
  router.get('/subscription', async (req, res) => {
    const workspaceId = req.workspaceId;

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
    const workspaceId = req.workspaceId;
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
      // If no amount specified, get the workspace subscription total
      let chargeAmount = amount;
      if (!chargeAmount) {
        const sub = await prisma.subscription.findUnique({ where: { workspaceId } });
        chargeAmount = sub?.totalMonthlyValue || 5.0;
      }

      const result = await createManualCharge({
        workspaceId,
        amount: chargeAmount,
        description: description || `Cobrança manual Task360`,
      });

      console.log(`[Billing] Manual charge created for workspace ${workspaceId}: ${chargeAmount} EUR — Order: ${result.orderId}`);

      res.json({
        success: true,
        orderId: result.orderId,
        checkoutUrl: result.checkoutUrl,
        amount: chargeAmount,
      });
    } catch (err) {
      console.error('[Billing:manualCharge]', err);
      res.status(500).json({ error: 'Erro ao gerar cobrança' });
    }
  });

  return router;
}
