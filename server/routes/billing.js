import { Router } from 'express';
import { createManualCharge, getOrder, calculateMonthlyTotal } from '../services/billing.js';
import { revolutPay } from '../services/revolut.js';
import { requireWorkspaceRole, requireSuperAdmin } from '../middleware/roleGuard.js';
import { t } from '../lib/i18n.js';
import { validate } from '../middleware/validate.js';
import { updateSubscriptionSchema } from '../schemas/billing.js';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

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
        return res.status(404).json({ error: t(req.locale, 'errors.subscriptionNotFound') });
      }

      res.json(subscription);
    } catch (err) {
      console.error('[Billing:subscription]', err);
      res.status(500).json({ error: t(req.locale, 'errors.fetchSubscriptionError') });
    }
  });

  // PATCH /api/billing/subscription — GESTOR only: toggle autoRenew
  router.patch('/subscription', requireWorkspaceRole('GESTOR'), validate(updateSubscriptionSchema), async (req, res) => {
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
      res.status(500).json({ error: t(req.locale, 'errors.updateSubscriptionError') });
    }
  });

  /**
   * POST /api/billing/checkout — GESTOR only: create Revolut checkout for workspace subscription.
   * Creates a payment order for the current monthly total (base + seats).
   */
  router.post('/checkout', requireWorkspaceRole('GESTOR'), async (req, res) => {
    const workspaceId = req.workspaceId;

    try {
      const subscription = await prisma.subscription.findUnique({ where: { workspaceId } });
      if (!subscription) {
        return res.status(404).json({ error: t(req.locale, 'errors.subscriptionNotFound') });
      }

      const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
      const amount = subscription.totalMonthlyValue;

      const order = await revolutPay.createOrder({
        amount,
        description: `Task360 — Plano mensal "${workspace?.name || workspaceId}"`,
        metadata: { workspaceId, type: 'subscription', subscriptionId: subscription.id },
        successUrl: `${APP_URL}/checkout/success`,
        failureUrl: `${APP_URL}/checkout/cancelled`,
      });

      // Store order reference on subscription
      await prisma.subscription.update({
        where: { workspaceId },
        data: { revolutOrderId: order.orderId },
      });

      console.log(`[Billing] Checkout created for workspace ${workspaceId}: ${amount} EUR — Order: ${order.orderId}`);

      res.json({
        orderId: order.orderId,
        checkoutUrl: order.checkoutUrl,
        amount,
      });
    } catch (err) {
      console.error('[Billing:checkout]', err);
      res.status(500).json({ error: t(req.locale, 'errors.createCheckoutError') });
    }
  });

  /**
   * POST /api/billing/renew — GESTOR only: manually trigger subscription renewal.
   * Creates a Revolut order for the current billing cycle.
   */
  router.post('/renew', requireWorkspaceRole('GESTOR'), async (req, res) => {
    const workspaceId = req.workspaceId;

    try {
      const subscription = await prisma.subscription.findUnique({ where: { workspaceId } });
      if (!subscription) {
        return res.status(404).json({ error: t(req.locale, 'errors.subscriptionNotFound') });
      }

      // Recalculate fresh total
      const activeSeats = await prisma.membership.count({
        where: { workspaceId, inviteAccepted: true, paymentStatus: 'PAID' },
      });
      const amount = calculateMonthlyTotal(activeSeats);

      const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });

      const order = await revolutPay.createOrder({
        amount,
        description: `Task360 — Renovação "${workspace?.name || workspaceId}"`,
        metadata: { workspaceId, type: 'renewal', subscriptionId: subscription.id },
        successUrl: `${APP_URL}/checkout/success`,
        failureUrl: `${APP_URL}/checkout/cancelled`,
      });

      // Update subscription with new order and period
      const nextPeriodEnd = new Date();
      nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

      await prisma.subscription.update({
        where: { workspaceId },
        data: {
          revolutOrderId: order.orderId,
          totalMonthlyValue: amount,
          seatCount: activeSeats,
          currentPeriodEnd: nextPeriodEnd,
        },
      });

      console.log(`[Billing] Renewal order for workspace ${workspaceId}: ${amount} EUR — Order: ${order.orderId}`);

      res.json({
        orderId: order.orderId,
        checkoutUrl: order.checkoutUrl,
        amount,
        nextPeriodEnd,
      });
    } catch (err) {
      console.error('[Billing:renew]', err);
      res.status(500).json({ error: t(req.locale, 'errors.renewSubscriptionError') });
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

      // Check subscription orders
      const subscription = await prisma.subscription.findFirst({
        where: { revolutOrderId: orderId },
        select: { status: true, workspaceId: true },
      });

      if (subscription) {
        // For subscription orders, check Revolut status
        const revolutOrder = await getOrder(orderId);
        const paid = revolutOrder?.state === 'completed';
        if (paid && subscription.status !== 'ACTIVE') {
          await prisma.subscription.update({
            where: { workspaceId: subscription.workspaceId },
            data: { status: 'ACTIVE' },
          });
        }
        return res.json({
          orderId,
          paymentStatus: paid ? 'PAID' : 'PENDING',
          type: 'subscription',
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

      res.status(404).json({ error: t(req.locale, 'errors.orderNotFound') });
    } catch (err) {
      console.error('[Billing:checkoutStatus]', err);
      res.status(500).json({ error: t(req.locale, 'errors.checkPaymentStatusError') });
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
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd,
      }));

      res.json(overview);
    } catch (err) {
      console.error('[Billing:overview]', err);
      res.status(500).json({ error: t(req.locale, 'errors.fetchBillingError') });
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
      res.status(500).json({ error: t(req.locale, 'errors.createChargeError') });
    }
  });

  return router;
}
