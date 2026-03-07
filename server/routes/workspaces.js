import { Router } from 'express';
import { createSeatCheckout } from '../services/revolut.js';
import { createNotification } from '../services/notifications.js';
import { sendInviteEmail } from '../services/email.js';
import { t } from '../lib/i18n.js';
import { validate } from '../middleware/validate.js';
import { createWorkspaceSchema, inviteSchema } from '../schemas/workspaces.js';

export function workspaceRoutes(prisma) {
  const router = Router();

  // GET /api/workspaces — list user's workspaces with membership info
  router.get('/', async (req, res) => {
    try {
      const memberships = await prisma.membership.findMany({
        where: { userId: req.user.id },
        include: {
          workspace: {
            include: {
              _count: { select: { memberships: true } },
            },
          },
        },
      });

      const workspaces = memberships.map((m) => ({
        ...m.workspace,
        membership: {
          id: m.id,
          userId: m.userId,
          workspaceId: m.workspaceId,
          roleInWorkspace: m.roleInWorkspace,
          inviteAccepted: m.inviteAccepted,
          paymentStatus: m.paymentStatus,
          costPerSeat: m.costPerSeat,
          invitedEmail: m.invitedEmail,
          revolutOrderId: m.revolutOrderId,
          paidAt: m.paidAt,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        },
        memberCount: m.workspace._count.memberships,
      }));

      res.json(workspaces);
    } catch (err) {
      console.error('[Workspaces:list]', err);
      res.status(500).json({ error: t(req.locale, 'errors.listWorkspacesError') });
    }
  });

  // POST /api/workspaces — create a new workspace
  router.post('/', validate(createWorkspaceSchema), async (req, res) => {
    const { name } = req.body;

    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const workspace = await prisma.workspace.create({
        data: {
          name,
          slug: `${slug}-${Date.now().toString(36)}`,
          memberships: {
            create: {
              userId: req.user.id,
              roleInWorkspace: 'GESTOR',
              inviteAccepted: true,
              paymentStatus: 'PAID',
              costPerSeat: 0, // Owner doesn't pay seat cost
            },
          },
          subscription: {
            create: {
              basePrice: 5.0,
              seatCount: 1,
              totalMonthlyValue: 5.0,
            },
          },
        },
        include: {
          memberships: true,
          subscription: true,
        },
      });

      // Set as active workspace
      await prisma.user.update({
        where: { id: req.user.id },
        data: { activeWorkspaceId: workspace.id },
      });

      res.status(201).json(workspace);
    } catch (err) {
      console.error('[Workspaces:create]', err);
      res.status(500).json({ error: t(req.locale, 'errors.createWorkspaceError') });
    }
  });

  // POST /api/workspaces/invite — invite a member (gated by Revolut checkout)
  router.post('/invite', validate(inviteSchema), async (req, res) => {
    const workspaceId = req.headers['x-workspace-id'] || req.body.workspaceId;
    const { email, roleInWorkspace } = req.body;

    if (!workspaceId || !email) {
      return res.status(400).json({ error: t(req.locale, 'errors.workspaceIdEmailRequired') });
    }

    try {
      // GESTOR or CLIENTE can invite (COLABORADOR cannot)
      const callerMembership = await prisma.membership.findUnique({
        where: {
          userId_workspaceId: { userId: req.user.id, workspaceId },
        },
      });

      const canInvite = callerMembership &&
        (callerMembership.roleInWorkspace === 'GESTOR' ||
         callerMembership.roleInWorkspace === 'CLIENTE');

      if (!canInvite) {
        return res.status(403).json({ error: t(req.locale, 'errors.onlyGestorsCanInvite') });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({ where: { email } });

      // Check if already a member or already invited
      if (existingUser) {
        const existingMembership = await prisma.membership.findUnique({
          where: {
            userId_workspaceId: { userId: existingUser.id, workspaceId },
          },
        });
        if (existingMembership) {
          return res.status(409).json({ error: t(req.locale, 'errors.alreadyMember') });
        }
      }

      // Check for pending invite by email (user doesn't exist yet)
      const pendingInvite = await prisma.membership.findFirst({
        where: { workspaceId, invitedEmail: email },
      });
      if (pendingInvite) {
        return res.status(409).json({ error: t(req.locale, 'errors.pendingInviteExists') });
      }

      // Create Revolut checkout session for seat payment (3.00 EUR)
      const checkout = await createSeatCheckout({
        workspaceId,
        email,
        roleInWorkspace: roleInWorkspace || 'COLABORADOR',
      });

      // Create membership as pending (invite blocked until Revolut payment_success webhook)
      const membership = await prisma.membership.create({
        data: {
          userId: existingUser?.id || null,
          workspaceId,
          roleInWorkspace: roleInWorkspace || 'COLABORADOR',
          inviteAccepted: false,
          paymentStatus: 'PENDING',
          costPerSeat: 3.0,
          invitedEmail: email,
          revolutOrderId: checkout.orderId,
        },
      });

      // Update subscription seat count
      await recalculateSubscription(prisma, workspaceId);

      // Notify invited user if they exist (non-blocking)
      if (existingUser) {
        const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
        createNotification(prisma, {
          userId: existingUser.id,
          workspaceId,
          type: 'invite_received',
          title: 'Convite recebido',
          body: `Você foi convidado para o workspace "${workspace?.name}"`,
          data: { workspaceId, membershipId: membership.id },
        }).catch(() => {});
      }

      // Send invite email (non-blocking)
      const workspace = existingUser
        ? null // already fetched above for notification
        : await prisma.workspace.findUnique({ where: { id: workspaceId } });
      const wsName = workspace?.name || workspaceId;

      sendInviteEmail({
        to: email,
        inviterName: req.user.name || req.user.email,
        workspaceName: wsName,
        checkoutUrl: checkout.checkoutUrl,
      }).catch((e) =>
        console.error('[Workspaces:invite] Falha ao enviar invite email:', e)
      );

      res.status(201).json({
        membership,
        checkoutUrl: checkout.checkoutUrl,
      });
    } catch (err) {
      console.error('[Workspaces:invite]', err);
      res.status(500).json({ error: t(req.locale, 'errors.processInviteError') });
    }
  });

  // GET /api/workspaces/members — list members of current workspace
  router.get('/members', async (req, res) => {
    const workspaceId = req.headers['x-workspace-id'];
    if (!workspaceId) {
      return res.status(400).json({ error: t(req.locale, 'errors.workspaceIdRequired') });
    }

    try {
      const members = await prisma.membership.findMany({
        where: { workspaceId },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true, avatar: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      res.json(members);
    } catch (err) {
      console.error('[Workspaces:members]', err);
      res.status(500).json({ error: t(req.locale, 'errors.listMembersError') });
    }
  });

  // DELETE /api/workspaces/members/:id — remove a member
  router.delete('/members/:id', async (req, res) => {
    try {
      const membership = await prisma.membership.findUnique({
        where: { id: req.params.id },
      });

      if (!membership) {
        return res.status(404).json({ error: t(req.locale, 'errors.memberNotFound') });
      }

      // Verify caller is GESTOR
      const callerMembership = await prisma.membership.findUnique({
        where: {
          userId_workspaceId: { userId: req.user.id, workspaceId: membership.workspaceId },
        },
      });

      if (!callerMembership || callerMembership.roleInWorkspace !== 'GESTOR') {
        return res.status(403).json({ error: t(req.locale, 'errors.onlyGestorsCanRemove') });
      }

      await prisma.membership.delete({ where: { id: req.params.id } });
      await recalculateSubscription(prisma, membership.workspaceId);

      res.json({ success: true });
    } catch (err) {
      console.error('[Workspaces:removeMember]', err);
      res.status(500).json({ error: t(req.locale, 'errors.removeMemberError') });
    }
  });

  return router;
}

/**
 * Recalculate subscription: Total = Base(5.00) + (Active_Invites × 3.00)
 */
async function recalculateSubscription(prisma, workspaceId) {
  const activeMemberships = await prisma.membership.count({
    where: { workspaceId, inviteAccepted: true, paymentStatus: 'PAID' },
  });

  const basePrice = 5.0;
  const seatCost = (activeMemberships - 1) * 3.0; // Owner doesn't count as a paid seat
  const total = basePrice + Math.max(0, seatCost);

  await prisma.subscription.upsert({
    where: { workspaceId },
    update: {
      seatCount: activeMemberships,
      totalMonthlyValue: total,
    },
    create: {
      workspaceId,
      basePrice,
      seatCount: activeMemberships,
      totalMonthlyValue: total,
    },
  });
}
