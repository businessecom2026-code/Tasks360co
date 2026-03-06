import { Router } from 'express';
import { createManualCharge } from '../services/billing.js';
import { requireRole, requireWorkspaceRole, requireSuperAdmin } from '../middleware/roleGuard.js';

export function billingRoutes(prisma) {
  const router = Router();

  // GET /api/billing/subscription — all workspace roles can view
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

  // PATCH /api/billing/subscription — GESTOR only: toggle autoRenew
  router.patch('/subscription', requireWorkspaceRole('GESTOR'), async (req, res) => {
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

  // GET /api/billing/overview — admin@ecom360.co only: global subscription view
  router.get('/overview', requireSuperAdmin(), async (req, res) => {
    try {
      const subscriptions = await prisma.subscription.findMany({
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

  // POST /api/billing/manual-charge — admin@ecom360.co only
  router.post('/manual-charge', requireSuperAdmin(), async (req, res) => {
    const { workspaceId, amount, description } = req.body;

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
