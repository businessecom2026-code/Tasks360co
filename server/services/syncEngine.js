/**
 * SyncEngine — Google Tasks Bi-directional Sync Service
 *
 * Implements:
 * - Debounced updates to avoid flooding Google API
 * - "Last Write Wins" conflict resolution with 2s threshold
 * - Visual lock state management
 * - Full sync (pull all Google Tasks and reconcile)
 */

import { google } from 'googleapis';

const DEBOUNCE_MS = 1500;
const CONFLICT_THRESHOLD_MS = 2000;

// In-memory debounce map: taskId -> timeout
const pendingUpdates = new Map();

/**
 * Get an authenticated Google Tasks API client for a user.
 * @param {object} tokens - { access_token, refresh_token }
 * @returns {object} Google Tasks API client
 */
function getTasksClient(tokens) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
  );

  oauth2.setCredentials(tokens);

  return google.tasks({ version: 'v1', auth: oauth2 });
}

/**
 * Map local TaskStatus to Google Tasks status and vice versa.
 */
const STATUS_TO_GOOGLE = {
  PENDING: 'needsAction',
  IN_PROGRESS: 'needsAction',
  REVIEW: 'needsAction',
  DONE: 'completed',
};

const STATUS_FROM_GOOGLE = {
  needsAction: 'PENDING',
  completed: 'DONE',
};

/**
 * Schedule a sync to Google Tasks (debounced).
 * If the same task is updated multiple times quickly, only the last update fires.
 */
export function scheduleSyncToGoogle(taskId, taskData, userTokens) {
  if (!process.env.GOOGLE_CLIENT_ID || !userTokens) {
    console.log(`[SyncEngine] Google not configured — skipping sync for task ${taskId}`);
    return;
  }

  // Clear previous pending update for this task
  if (pendingUpdates.has(taskId)) {
    clearTimeout(pendingUpdates.get(taskId));
  }

  const timeout = setTimeout(async () => {
    pendingUpdates.delete(taskId);

    try {
      console.log(`[SyncEngine] Syncing task ${taskId} to Google Tasks`);
      const tasksApi = getTasksClient(userTokens);

      if (taskData.googleTaskId) {
        // Update existing Google Task
        await tasksApi.tasks.update({
          tasklist: '@default',
          task: taskData.googleTaskId,
          requestBody: {
            title: taskData.title,
            notes: taskData.description || '',
            status: STATUS_TO_GOOGLE[taskData.status] || 'needsAction',
            due: taskData.dueDate ? new Date(taskData.dueDate).toISOString() : undefined,
          },
        });
      } else {
        // Create new Google Task
        const result = await tasksApi.tasks.insert({
          tasklist: '@default',
          requestBody: {
            title: taskData.title,
            notes: taskData.description || '',
            status: STATUS_TO_GOOGLE[taskData.status] || 'needsAction',
            due: taskData.dueDate ? new Date(taskData.dueDate).toISOString() : undefined,
          },
        });

        // Store the Google Task ID for future syncs
        if (taskData.prisma && result.data.id) {
          await taskData.prisma.task.update({
            where: { id: taskId },
            data: {
              googleTaskId: result.data.id,
              lastSyncedAt: new Date(),
            },
          });
        }
      }

      console.log(`[SyncEngine] Task ${taskId} synced successfully`);
    } catch (err) {
      console.error(`[SyncEngine] Failed to sync task ${taskId}:`, err.message);
    }
  }, DEBOUNCE_MS);

  pendingUpdates.set(taskId, timeout);
}

/**
 * Delete a task from Google Tasks.
 */
export async function deleteFromGoogle(googleTaskId, userTokens) {
  if (!process.env.GOOGLE_CLIENT_ID || !userTokens || !googleTaskId) return;

  try {
    const tasksApi = getTasksClient(userTokens);
    await tasksApi.tasks.delete({
      tasklist: '@default',
      task: googleTaskId,
    });
    console.log(`[SyncEngine] Google Task ${googleTaskId} deleted`);
  } catch (err) {
    console.error(`[SyncEngine] Failed to delete Google Task:`, err.message);
  }
}

/**
 * Resolve conflict between local and Google versions.
 * Returns 'local' or 'google' indicating which version should win.
 */
export function resolveConflict(localUpdatedAt, googleUpdatedAt) {
  const localTime = new Date(localUpdatedAt).getTime();
  const googleTime = new Date(googleUpdatedAt).getTime();
  const diff = Math.abs(googleTime - localTime);

  // Within threshold: local priority ("Quem cria vai na frente")
  if (diff < CONFLICT_THRESHOLD_MS) {
    return 'local';
  }

  // Outside threshold: most recent wins
  return googleTime > localTime ? 'google' : 'local';
}

/**
 * Full sync: pull all Google Tasks and reconcile with local DB.
 */
export async function fullSync(prisma, workspaceId, userTokens) {
  if (!process.env.GOOGLE_CLIENT_ID || !userTokens) {
    console.log(`[SyncEngine] Google not configured — skipping full sync`);
    return { synced: 0, created: 0, updated: 0, skipped: 0 };
  }

  console.log(`[SyncEngine] Starting full sync for workspace ${workspaceId}`);

  const stats = { synced: 0, created: 0, updated: 0, skipped: 0 };

  try {
    const tasksApi = getTasksClient(userTokens);

    // Get all Google Tasks from default list
    const response = await tasksApi.tasks.list({
      tasklist: '@default',
      maxResults: 100,
      showCompleted: true,
      showHidden: true,
    });

    const googleTasks = response.data.items || [];
    console.log(`[SyncEngine] Found ${googleTasks.length} Google Tasks`);

    for (const gTask of googleTasks) {
      const localTask = await prisma.task.findFirst({
        where: { googleTaskId: gTask.id, workspaceId },
      });

      if (localTask) {
        // Task exists locally — resolve conflict
        const winner = resolveConflict(localTask.updatedAt, gTask.updated);

        if (winner === 'google') {
          await prisma.task.update({
            where: { id: localTask.id },
            data: {
              title: gTask.title || localTask.title,
              description: gTask.notes || localTask.description,
              status: STATUS_FROM_GOOGLE[gTask.status] || localTask.status,
              dueDate: gTask.due ? new Date(gTask.due) : localTask.dueDate,
              lastSyncedAt: new Date(),
              version: localTask.version + 1,
            },
          });
          stats.updated++;
        } else {
          stats.skipped++;
        }
      } else {
        // New task from Google — create locally
        await prisma.task.create({
          data: {
            title: gTask.title || 'Sem título',
            description: gTask.notes || null,
            status: STATUS_FROM_GOOGLE[gTask.status] || 'PENDING',
            workspaceId,
            googleTaskId: gTask.id,
            dueDate: gTask.due ? new Date(gTask.due) : null,
            lastSyncedAt: new Date(),
          },
        });
        stats.created++;
      }

      stats.synced++;
    }

    // Push local tasks that don't have a googleTaskId to Google
    const localOnly = await prisma.task.findMany({
      where: { workspaceId, googleTaskId: null },
    });

    for (const localTask of localOnly) {
      try {
        const result = await tasksApi.tasks.insert({
          tasklist: '@default',
          requestBody: {
            title: localTask.title,
            notes: localTask.description || '',
            status: STATUS_TO_GOOGLE[localTask.status] || 'needsAction',
            due: localTask.dueDate ? new Date(localTask.dueDate).toISOString() : undefined,
          },
        });

        await prisma.task.update({
          where: { id: localTask.id },
          data: {
            googleTaskId: result.data.id,
            lastSyncedAt: new Date(),
          },
        });

        stats.synced++;
      } catch (err) {
        console.error(`[SyncEngine] Failed to push task ${localTask.id}:`, err.message);
      }
    }

    console.log(`[SyncEngine] Full sync completed: ${JSON.stringify(stats)}`);
    return stats;
  } catch (err) {
    console.error(`[SyncEngine] Full sync failed:`, err.message);
    throw err;
  }
}
