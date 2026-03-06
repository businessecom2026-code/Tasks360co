import { Router } from 'express';
import { revolutPay } from '../services/revolut.js';
import { sendPaymentConfirmationEmail } from '../services/email.js';
import { incrementalSync } from '../services/googleCalendar.js';

export function webhookRoutes(prisma) {
  const router = Router();

  /**
   * POST /api/webhooks/revolut
   * Handles Revolut payment events (ORDER_COMPLETED / payment_success).
   * After confirmed payment, activates the membership invite and recalculates subscription.
   */
  router.post('/revolut', async (req, res) => {
    try {
      // 1. Verify webhook signature (use preserved raw body for correct HMAC)
      const signature = req.headers['revolut-signature'] || req.headers['x-revolut-signature'];
      const rawBody = req.rawBody || JSON.stringify(req.body);
      if (!revolutPay.verifyWebhookSignature(rawBody, signature)) {
        console.error('[Webhook:Revolut] Invalid signature — rejecting');
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }

      // 2. Parse event
      const { eventType, orderId, metadata } = revolutPay.parseWebhookEvent(req.body);
      const { workspaceId, email } = metadata;

      console.log(`[Webhook:Revolut] Event: ${eventType}`, JSON.stringify(metadata).slice(0, 200));

      // 3. Only process payment completion events
      if (eventType === 'ORDER_COMPLETED' || eventType === 'payment_success') {
        // Primary lookup: by revolutOrderId (idempotent, anti-replay)
        let membership = orderId
          ? await prisma.membership.findFirst({
              where: { revolutOrderId: orderId },
            })
          : null;

        // Fallback lookup: by workspace + email (for stub/manual flows)
        if (!membership && workspaceId && email) {
          membership = await prisma.membership.findFirst({
            where: { workspaceId, invitedEmail: email, paymentStatus: 'PENDING' },
          });
        }

        if (!membership) {
          // Check if this is a subscription/renewal order
          const type = metadata.type;
          if ((type === 'subscription' || type === 'renewal') && workspaceId) {
            const sub = await prisma.subscription.findUnique({ where: { workspaceId } });
            if (sub && sub.revolutOrderId === orderId) {
              const nextPeriodEnd = new Date();
              nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
              await prisma.subscription.update({
                where: { workspaceId },
                data: { status: 'ACTIVE', currentPeriodEnd: nextPeriodEnd },
              });
              console.log(`[Webhook:Revolut] Subscription activated — workspace: ${workspaceId}, order: ${orderId}`);
            }
          } else {
            console.warn(`[Webhook:Revolut] No matching membership for order ${orderId}`);
          }
        } else if (membership.paymentStatus === 'PAID') {
          // Anti-replay: already processed
          console.warn(`[Webhook:Revolut] Order ${orderId} already processed — skipping`);
        } else {
          const targetWorkspaceId = membership.workspaceId;

          // 4. Activate membership
          await prisma.membership.update({
            where: { id: membership.id },
            data: {
              inviteAccepted: true,
              paymentStatus: 'PAID',
              paidAt: new Date(),
              revolutOrderId: orderId || membership.revolutOrderId,
            },
          });

          // 5. Recalculate subscription totals
          const activeCount = await prisma.membership.count({
            where: { workspaceId: targetWorkspaceId, inviteAccepted: true, paymentStatus: 'PAID' },
          });

          await prisma.subscription.update({
            where: { workspaceId: targetWorkspaceId },
            data: {
              seatCount: activeCount,
              totalMonthlyValue: 5.0 + Math.max(0, (activeCount - 1) * 3.0),
            },
          });

          console.log(
            `[Webhook:Revolut] Membership activated — order: ${orderId}, email: ${membership.invitedEmail}, workspace: ${targetWorkspaceId}`
          );

          // 6. Send payment confirmation email (non-blocking)
          if (membership.invitedEmail) {
            const ws = await prisma.workspace.findUnique({ where: { id: targetWorkspaceId } });
            sendPaymentConfirmationEmail({
              to: membership.invitedEmail,
              workspaceName: ws?.name || targetWorkspaceId,
              amount: membership.costPerSeat || 3.0,
            }).catch((e) =>
              console.error('[Webhook:Revolut] Falha ao enviar payment email:', e)
            );
          }
        }
      } else if (eventType === 'ORDER_PAYMENT_FAILED') {
        // Handle failed payments
        if (orderId) {
          const membership = await prisma.membership.findFirst({
            where: { revolutOrderId: orderId, paymentStatus: 'PENDING' },
          });
          if (membership) {
            await prisma.membership.update({
              where: { id: membership.id },
              data: { paymentStatus: 'FAILED' },
            });
            console.log(`[Webhook:Revolut] Payment failed for order ${orderId}`);
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

        const localTask = await prisma.task.findFirst({
          where: { googleTaskId },
        });

        if (localTask) {
          const googleTime = new Date(googleUpdatedAt).getTime();
          const localTime = new Date(localTask.updatedAt).getTime();
          const diffMs = Math.abs(googleTime - localTime);

          if (diffMs < 2000) {
            console.log(`[Webhook:GoogleTasks] Conflict within 2s threshold — keeping local version`);
            res.json({ action: 'skipped', reason: 'local_priority' });
            return;
          }

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

  /**
   * POST /api/webhooks/google-calendar
   * Handles Google Calendar push notifications (Watch channel).
   * Triggers incremental sync for the user who owns the channel.
   */
  router.post('/google-calendar', async (req, res) => {
    try {
      const channelId = req.headers['x-goog-channel-id'];
      const resourceState = req.headers['x-goog-resource-state'];

      console.log(`[Webhook:GoogleCal] Channel: ${channelId}, State: ${resourceState}`);

      // Ignore sync confirmation messages
      if (resourceState === 'sync') {
        return res.status(200).json({ action: 'sync_confirmed' });
      }

      if (!channelId) {
        return res.status(400).json({ error: 'Missing channel ID' });
      }

      // Find user by watch channel ID
      const user = await prisma.user.findFirst({
        where: { googleCalWatchChannelId: channelId },
        select: { id: true },
      });

      if (!user) {
        console.warn(`[Webhook:GoogleCal] No user found for channel ${channelId}`);
        return res.status(200).json({ action: 'no_user' });
      }

      // Trigger incremental sync (non-blocking)
      incrementalSync(user.id, prisma).catch((err) =>
        console.error(`[Webhook:GoogleCal] Sync failed for user ${user.id}:`, err.message)
      );

      res.status(200).json({ action: 'sync_triggered' });
    } catch (err) {
      console.error('[Webhook:GoogleCal]', err);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  return router;
}
