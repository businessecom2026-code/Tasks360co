import { Router } from 'express';
import { verifyWebhookSignature } from '../services/billing.js';

export function webhookRoutes(prisma) {
  const router = Router();

  /**
   * POST /api/webhooks/revolut
   * Handles Revolut payment events.
   * After payment_success, activates the membership invite.
   */
  router.post('/revolut', async (req, res) => {
    try {
      // Verify webhook signature (skips if REVOLUT_WEBHOOK_SECRET not configured)
      const signature = req.headers['revolut-signature'] || req.headers['x-revolut-signature'];
      const rawBody = JSON.stringify(req.body);
      if (!verifyWebhookSignature(rawBody, signature)) {
        console.error('[Webhook:Revolut] Invalid signature — rejecting');
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }

      const { event, order } = req.body;

      console.log(`[Webhook:Revolut] Event: ${event}`, JSON.stringify(order || {}).slice(0, 200));

      if (event === 'ORDER_COMPLETED' || event === 'payment_success') {
        const metadata = order?.metadata || {};
        const { workspaceId, email } = metadata;

        if (workspaceId && email) {
          // Find the pending membership and activate it
          const membership = await prisma.membership.findFirst({
            where: {
              workspaceId,
              invitedEmail: email,
              paymentStatus: 'PENDING',
            },
          });

          if (membership) {
            await prisma.membership.update({
              where: { id: membership.id },
              data: {
                inviteAccepted: true,
                paymentStatus: 'PAID',
                paidAt: new Date(),
                revolutOrderId: order?.id || null,
              },
            });

            // Recalculate subscription
            const activeCount = await prisma.membership.count({
              where: { workspaceId, inviteAccepted: true },
            });

            await prisma.subscription.update({
              where: { workspaceId },
              data: {
                seatCount: activeCount,
                totalMonthlyValue: 5.0 + Math.max(0, (activeCount - 1) * 3.0),
              },
            });

            console.log(`[Webhook:Revolut] Membership activated for ${email} in workspace ${workspaceId}`);
          }
        }
      }

      res.json({ received: true });
    } catch (err) {
      console.error('[Webhook:Revolut]', err);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  /**
   * POST /api/webhooks/google-tasks
   * Handles Google Tasks push notifications.
   * Implements "Last Write Wins" conflict resolution with 2s threshold.
   */
  router.post('/google-tasks', async (req, res) => {
    try {
      const { resourceId, resourceState, taskData } = req.body;

      console.log(`[Webhook:GoogleTasks] State: ${resourceState}, Resource: ${resourceId}`);

      if (resourceState === 'update' && taskData) {
        const { googleTaskId, title, notes, status, updatedAt: googleUpdatedAt } = taskData;

        // Find local task linked to this Google Task
        const localTask = await prisma.task.findFirst({
          where: { googleTaskId },
        });

        if (localTask) {
          const googleTime = new Date(googleUpdatedAt).getTime();
          const localTime = new Date(localTask.updatedAt).getTime();
          const diffMs = Math.abs(googleTime - localTime);

          // Conflict resolution: if difference < 2s, prioritize local ("Quem cria vai na frente")
          if (diffMs < 2000) {
            console.log(`[Webhook:GoogleTasks] Conflict within 2s threshold — keeping local version`);
            res.json({ action: 'skipped', reason: 'local_priority' });
            return;
          }

          // Google wins (was updated more recently)
          if (googleTime > localTime) {
            const statusMap = {
              completed: 'DONE',
              needsAction: 'PENDING',
            };

            await prisma.task.update({
              where: { id: localTask.id },
              data: {
                title: title || localTask.title,
                description: notes || localTask.description,
                status: statusMap[status] || localTask.status,
                lastSyncedAt: new Date(),
                version: localTask.version + 1,
              },
            });

            console.log(`[Webhook:GoogleTasks] Task ${localTask.id} updated from Google`);
            res.json({ action: 'updated' });
            return;
          }
        }
      }

      res.json({ action: 'no_action' });
    } catch (err) {
      console.error('[Webhook:GoogleTasks]', err);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  return router;
}
