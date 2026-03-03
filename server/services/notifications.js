// ─── SSE Connection Manager & Notification Service ─────────────────────
// Manages Server-Sent Events connections and notification creation/delivery

// Active SSE connections: Map<userId, Set<Response>>
const connections = new Map();

/**
 * Register an SSE connection for a user
 */
export function addConnection(userId, res) {
  if (!connections.has(userId)) {
    connections.set(userId, new Set());
  }
  connections.get(userId).add(res);

  // Clean up on disconnect
  res.on('close', () => {
    const userConns = connections.get(userId);
    if (userConns) {
      userConns.delete(res);
      if (userConns.size === 0) {
        connections.delete(userId);
      }
    }
  });
}

/**
 * Send an SSE event to a specific user (all their connections)
 */
export function sendToUser(userId, event, data) {
  const userConns = connections.get(userId);
  if (!userConns) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of userConns) {
    try {
      res.write(payload);
    } catch (err) {
      console.error('[SSE] Write error:', err.message);
      userConns.delete(res);
    }
  }
}

/**
 * Send an SSE event to all members of a workspace
 */
export async function sendToWorkspace(prisma, workspaceId, event, data, excludeUserId) {
  try {
    const memberships = await prisma.membership.findMany({
      where: { workspaceId, inviteAccepted: true },
      select: { userId: true },
    });

    for (const m of memberships) {
      if (m.userId && m.userId !== excludeUserId) {
        sendToUser(m.userId, event, data);
      }
    }
  } catch (err) {
    console.error('[SSE] sendToWorkspace error:', err.message);
  }
}

/**
 * Create a notification in the database and push via SSE
 */
export async function createNotification(prisma, { userId, workspaceId, type, title, body, data }) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        workspaceId: workspaceId || null,
        type,
        title,
        body: body || null,
        data: data || null,
      },
    });

    // Push via SSE immediately
    sendToUser(userId, 'notification', notification);

    return notification;
  } catch (err) {
    console.error('[Notification] Create error:', err.message);
    return null;
  }
}

/**
 * Notify workspace members about an event (creates DB records + SSE push)
 */
export async function notifyWorkspace(prisma, { workspaceId, type, title, body, data, excludeUserId }) {
  try {
    const memberships = await prisma.membership.findMany({
      where: { workspaceId, inviteAccepted: true },
      select: { userId: true },
    });

    const notifications = [];
    for (const m of memberships) {
      if (m.userId && m.userId !== excludeUserId) {
        const n = await createNotification(prisma, {
          userId: m.userId,
          workspaceId,
          type,
          title,
          body,
          data,
        });
        if (n) notifications.push(n);
      }
    }

    return notifications;
  } catch (err) {
    console.error('[Notification] notifyWorkspace error:', err.message);
    return [];
  }
}
