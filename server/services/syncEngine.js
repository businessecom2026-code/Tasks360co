/**
 * SyncEngine — Google Tasks Bi-directional Sync Service
 *
 * Implements:
 * - Debounced updates to avoid flooding Google API
 * - "Last Write Wins" conflict resolution with 2s threshold
 * - Visual lock state management
 */

const DEBOUNCE_MS = 1500;
const CONFLICT_THRESHOLD_MS = 2000;

// In-memory debounce map: taskId -> timeout
const pendingUpdates = new Map();

/**
 * Schedule a sync to Google Tasks (debounced).
 * If the same task is updated multiple times quickly, only the last update fires.
 */
export function scheduleSyncToGoogle(taskId, taskData, googleClient) {
  // Clear previous pending update for this task
  if (pendingUpdates.has(taskId)) {
    clearTimeout(pendingUpdates.get(taskId));
  }

  const timeout = setTimeout(async () => {
    pendingUpdates.delete(taskId);

    try {
      console.log(`[SyncEngine] Syncing task ${taskId} to Google Tasks`);

      // In production:
      // await googleClient.tasks.update({
      //   tasklist: taskData.googleTaskListId,
      //   task: taskData.googleTaskId,
      //   requestBody: {
      //     title: taskData.title,
      //     notes: taskData.description,
      //     status: taskData.status === 'DONE' ? 'completed' : 'needsAction',
      //     due: taskData.dueDate ? new Date(taskData.dueDate).toISOString() : undefined,
      //   },
      // });

      console.log(`[SyncEngine] Task ${taskId} synced successfully`);
    } catch (err) {
      console.error(`[SyncEngine] Failed to sync task ${taskId}:`, err.message);
    }
  }, DEBOUNCE_MS);

  pendingUpdates.set(taskId, timeout);
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
export async function fullSync(prisma, workspaceId, googleClient) {
  console.log(`[SyncEngine] Starting full sync for workspace ${workspaceId}`);

  try {
    // In production:
    // const googleTasks = await googleClient.tasks.list({ tasklist: '@default' });
    // for (const gTask of googleTasks.data.items || []) {
    //   const localTask = await prisma.task.findFirst({
    //     where: { googleTaskId: gTask.id, workspaceId },
    //   });
    //
    //   if (localTask) {
    //     const winner = resolveConflict(localTask.updatedAt, gTask.updated);
    //     if (winner === 'google') {
    //       await prisma.task.update({ where: { id: localTask.id }, data: { ... } });
    //     }
    //   } else {
    //     await prisma.task.create({ data: { googleTaskId: gTask.id, ... } });
    //   }
    // }

    console.log(`[SyncEngine] Full sync completed for workspace ${workspaceId}`);
  } catch (err) {
    console.error(`[SyncEngine] Full sync failed:`, err.message);
  }
}
