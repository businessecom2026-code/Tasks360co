import { Router } from 'express';
import { createManualCharge, getOrder } from '../services/billing.js';
import { requireWorkspaceRole, requireSuperAdmin } from '../middleware/roleGuard.js';

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

  // GET /api/billing/checkout-status/:orderId — check Revolut order status
  router.get('/checkout-status/:orderId', async (req, res) => {
    const { orderId } = req.params;

    try {
      // Check local membership first
      const membership = await prisma.membership.findFirst({
        where: { revolutOrderId: orderId },
        select: { paymentStatus: true, inviteAccepted: true, invitedEmail: true },
      });

      if (membership) {
        return res.json({
          orderId,
          paymentStatus: membership.paymentStatus,
          inviteAccepted: membership.inviteAccepted,
          email: membership.invitedEmail,
        });
      }

      // If not found locally, try Revolut API
      const order = await getOrder(orderId);
      if (order) {
        return res.json({
          orderId,
          paymentStatus: order.state === 'completed' ? 'PAID' : order.state?.toUpperCase() || 'PENDING',
          inviteAccepted: order.state === 'completed',
          revolut: { state: order.state, completedAt: order.completed_at },
        });
      }

      res.status(404).json({ error: 'Pedido não encontrado' });
    } catch (err) {
      console.error('[Billing:checkoutStatus]', err);
      res.status(500).json({ error: 'Erro ao verificar status do pagamento' });
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
