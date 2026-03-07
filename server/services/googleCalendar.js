/**
 * GoogleCalendarProvider — Google Calendar API Integration
 *
 * Implements:
 * - OAuth2 flow with calendar-specific scopes
 * - CRUD operations for calendar events
 * - Incremental sync via syncToken
 * - Watch (push notifications) setup and renewal
 * - Token encryption via AES-256-GCM
 *
 * Scopes (minimal):
 *   - calendar.events — read/write events
 *   - calendar.readonly — list user calendars
 */

import { google } from 'googleapis';
import { encryptToken, decryptToken } from './tokenEncryption.js';

const CAL_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
];

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// ─── OAuth2 Client Factory ─────────────────────────────────

function createCalOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${APP_URL}/api/calendar/callback`
  );
}

// ─── OAuth Flow ─────────────────────────────────────────────

/**
 * Generate Google Calendar authorization URL.
 * @param {string} userId - Passed as state for callback matching
 * @returns {string}
 */
export function getCalAuthUrl(userId) {
  const oauth2 = createCalOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    scope: CAL_SCOPES,
    state: userId,
    prompt: 'consent',
  });
}

/**
 * Exchange auth code for tokens and store encrypted in DB.
 * @param {string} code
 * @param {string} userId
 * @param {object} prisma
 */
export async function exchangeCalTokens(code, userId, prisma) {
  const oauth2 = createCalOAuth2Client();
  const { tokens } = await oauth2.getToken(code);

  const encAccess = await encryptToken(tokens.access_token);
  const encRefresh = tokens.refresh_token ? await encryptToken(tokens.refresh_token) : null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      googleCalAccessToken: encAccess,
      googleCalRefreshToken: encRefresh || undefined,
      googleCalTokenExpires: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
  });

  console.log(`[GoogleCal] Tokens stored (encrypted) for user ${userId}`);
  return tokens;
}

/**
 * Disconnect Google Calendar (remove encrypted tokens + watch).
 */
export async function disconnectCalendar(userId, prisma) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleCalWatchChannelId: true, googleCalAccessToken: true, googleCalRefreshToken: true },
  });

  // Stop watch channel if active
  if (user?.googleCalWatchChannelId) {
    try {
      const tokens = await getCalTokens(userId, prisma);
      if (tokens) {
        const oauth2 = createCalOAuth2Client();
        oauth2.setCredentials(tokens);
        const cal = google.calendar({ version: 'v3', auth: oauth2 });
        await cal.channels.stop({
          requestBody: { id: user.googleCalWatchChannelId, resourceId: user.googleCalWatchChannelId },
        });
      }
    } catch (err) {
      console.warn('[GoogleCal] Failed to stop watch channel:', err.message);
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      googleCalAccessToken: null,
      googleCalRefreshToken: null,
      googleCalTokenExpires: null,
      googleCalSyncToken: null,
      googleCalWatchChannelId: null,
      googleCalWatchExpiry: null,
    },
  });

  console.log(`[GoogleCal] Calendar disconnected for user ${userId}`);
}

// ─── Token Management ───────────────────────────────────────

/**
 * Get decrypted tokens for a user. Refreshes if expired.
 * @returns {Promise<{ access_token: string, refresh_token: string } | null>}
 */
export async function getCalTokens(userId, prisma) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      googleCalAccessToken: true,
      googleCalRefreshToken: true,
      googleCalTokenExpires: true,
    },
  });

  if (!user?.googleCalRefreshToken) return null;

  const refreshToken = await decryptToken(user.googleCalRefreshToken);
  if (!refreshToken) return null;

  // Check expiration (5 min buffer)
  const isExpired = user.googleCalTokenExpires &&
    new Date(user.googleCalTokenExpires).getTime() < Date.now() + 5 * 60 * 1000;

  if (isExpired) {
    try {
      const oauth2 = createCalOAuth2Client();
      oauth2.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await oauth2.refreshAccessToken();

      const encAccess = await encryptToken(credentials.access_token);
      await prisma.user.update({
        where: { id: userId },
        data: {
          googleCalAccessToken: encAccess,
          googleCalTokenExpires: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        },
      });

      return { access_token: credentials.access_token, refresh_token: refreshToken };
    } catch (err) {
      console.error('[GoogleCal] Token refresh failed:', err.message);
      return null;
    }
  }

  const accessToken = await decryptToken(user.googleCalAccessToken);
  return accessToken ? { access_token: accessToken, refresh_token: refreshToken } : null;
}

/**
 * Get an authenticated Google Calendar API client.
 */
function getCalClient(tokens) {
  const oauth2 = createCalOAuth2Client();
  oauth2.setCredentials(tokens);
  return google.calendar({ version: 'v3', auth: oauth2 });
}

// ─── Calendar Events CRUD ───────────────────────────────────

/**
 * List events from Google Calendar (next 30 days by default).
 */
export async function listEvents(userId, prisma, { maxResults = 50, timeMin, timeMax } = {}) {
  const tokens = await getCalTokens(userId, prisma);
  if (!tokens) throw new Error('Google Calendar não conectado');

  const cal = getCalClient(tokens);
  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const res = await cal.events.list({
    calendarId: 'primary',
    timeMin: (timeMin || now).toISOString(),
    timeMax: (timeMax || thirtyDays).toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return (res.data.items || []).map(normalizeEvent);
}

/**
 * Create an event on Google Calendar.
 */
export async function createEvent(userId, prisma, eventData) {
  const tokens = await getCalTokens(userId, prisma);
  if (!tokens) throw new Error('Google Calendar não conectado');

  const cal = getCalClient(tokens);

  const resource = {
    summary: eventData.title,
    description: eventData.description || '',
    location: eventData.location || '',
    start: eventData.allDay
      ? { date: eventData.startTime.split('T')[0] }
      : { dateTime: eventData.startTime, timeZone: eventData.timeZone || 'Europe/Lisbon' },
    end: eventData.allDay
      ? { date: eventData.endTime.split('T')[0] }
      : { dateTime: eventData.endTime, timeZone: eventData.timeZone || 'Europe/Lisbon' },
    recurrence: eventData.recurrence ? [eventData.recurrence] : undefined,
  };

  const res = await cal.events.insert({ calendarId: 'primary', requestBody: resource });

  // Store locally
  const localEvent = await prisma.calendarEvent.create({
    data: {
      userId,
      workspaceId: eventData.workspaceId || null,
      googleEventId: res.data.id,
      title: eventData.title,
      description: eventData.description || null,
      startTime: new Date(eventData.startTime),
      endTime: new Date(eventData.endTime),
      location: eventData.location || null,
      allDay: eventData.allDay || false,
      recurrence: eventData.recurrence || null,
      status: 'confirmed',
      lastSyncedAt: new Date(),
    },
  });

  console.log(`[GoogleCal] Event created: ${res.data.id} — "${eventData.title}"`);
  return { ...localEvent, googleEvent: normalizeEvent(res.data) };
}

/**
 * Update a Google Calendar event.
 */
export async function updateEvent(userId, prisma, eventId, updates) {
  const tokens = await getCalTokens(userId, prisma);
  if (!tokens) throw new Error('Google Calendar não conectado');

  const localEvent = await prisma.calendarEvent.findFirst({
    where: { id: eventId, userId },
  });
  if (!localEvent?.googleEventId) throw new Error('Evento não encontrado');

  const cal = getCalClient(tokens);

  const resource = {};
  if (updates.title) resource.summary = updates.title;
  if (updates.description !== undefined) resource.description = updates.description;
  if (updates.location !== undefined) resource.location = updates.location;
  if (updates.startTime) {
    resource.start = updates.allDay
      ? { date: updates.startTime.split('T')[0] }
      : { dateTime: updates.startTime, timeZone: 'Europe/Lisbon' };
  }
  if (updates.endTime) {
    resource.end = updates.allDay
      ? { date: updates.endTime.split('T')[0] }
      : { dateTime: updates.endTime, timeZone: 'Europe/Lisbon' };
  }

  await cal.events.patch({
    calendarId: 'primary',
    eventId: localEvent.googleEventId,
    requestBody: resource,
  });

  const updated = await prisma.calendarEvent.update({
    where: { id: eventId },
    data: {
      ...updates.title && { title: updates.title },
      ...updates.description !== undefined && { description: updates.description },
      ...updates.location !== undefined && { location: updates.location },
      ...updates.startTime && { startTime: new Date(updates.startTime) },
      ...updates.endTime && { endTime: new Date(updates.endTime) },
      ...updates.allDay !== undefined && { allDay: updates.allDay },
      lastSyncedAt: new Date(),
    },
  });

  console.log(`[GoogleCal] Event updated: ${localEvent.googleEventId}`);
  return updated;
}

/**
 * Delete a Google Calendar event.
 */
export async function deleteEvent(userId, prisma, eventId) {
  const tokens = await getCalTokens(userId, prisma);
  if (!tokens) throw new Error('Google Calendar não conectado');

  const localEvent = await prisma.calendarEvent.findFirst({
    where: { id: eventId, userId },
  });
  if (!localEvent) throw new Error('Evento não encontrado');

  if (localEvent.googleEventId) {
    try {
      const cal = getCalClient(tokens);
      await cal.events.delete({ calendarId: 'primary', eventId: localEvent.googleEventId });
    } catch (err) {
      console.warn(`[GoogleCal] Failed to delete from Google: ${err.message}`);
    }
  }

  await prisma.calendarEvent.delete({ where: { id: eventId } });
  console.log(`[GoogleCal] Event deleted: ${eventId}`);
}

// ─── Incremental Sync ───────────────────────────────────────

/**
 * Perform incremental sync using syncToken.
 * Falls back to full sync if syncToken is invalid (410 Gone).
 */
export async function incrementalSync(userId, prisma) {
  const tokens = await getCalTokens(userId, prisma);
  if (!tokens) return { synced: 0, created: 0, updated: 0, deleted: 0 };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleCalSyncToken: true },
  });

  const cal = getCalClient(tokens);
  const stats = { synced: 0, created: 0, updated: 0, deleted: 0 };

  try {
    const params = { calendarId: 'primary', singleEvents: true, maxResults: 250 };

    if (user?.googleCalSyncToken) {
      params.syncToken = user.googleCalSyncToken;
    } else {
      // First sync: only pull events from last 30 days
      params.timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    let pageToken = null;

    do {
      if (pageToken) params.pageToken = pageToken;

      const res = await cal.events.list(params);
      const events = res.data.items || [];

      for (const gEvent of events) {
        if (gEvent.status === 'cancelled') {
          // Delete locally
          const deleted = await prisma.calendarEvent.deleteMany({
            where: { userId, googleEventId: gEvent.id },
          });
          if (deleted.count > 0) stats.deleted++;
          continue;
        }

        const existing = await prisma.calendarEvent.findFirst({
          where: { userId, googleEventId: gEvent.id },
        });

        const eventData = {
          title: gEvent.summary || 'Sem título',
          description: gEvent.description || null,
          startTime: new Date(gEvent.start?.dateTime || gEvent.start?.date),
          endTime: new Date(gEvent.end?.dateTime || gEvent.end?.date),
          location: gEvent.location || null,
          allDay: Boolean(gEvent.start?.date),
          status: gEvent.status || 'confirmed',
          lastSyncedAt: new Date(),
        };

        if (existing) {
          await prisma.calendarEvent.update({
            where: { id: existing.id },
            data: eventData,
          });
          stats.updated++;
        } else {
          await prisma.calendarEvent.create({
            data: { ...eventData, userId, googleEventId: gEvent.id },
          });
          stats.created++;
        }
        stats.synced++;
      }

      // Store nextSyncToken from the last page
      if (res.data.nextSyncToken) {
        await prisma.user.update({
          where: { id: userId },
          data: { googleCalSyncToken: res.data.nextSyncToken },
        });
      }

      pageToken = res.data.nextPageToken || null;
    } while (pageToken);

    console.log(`[GoogleCal] Incremental sync: ${JSON.stringify(stats)}`);
    return stats;
  } catch (err) {
    // 410 Gone = syncToken invalidated, do full re-sync
    if (err.code === 410 || err.status === 410) {
      console.warn('[GoogleCal] syncToken expired (410) — resetting for full sync');
      await prisma.user.update({
        where: { id: userId },
        data: { googleCalSyncToken: null },
      });
      return incrementalSync(userId, prisma); // Retry without syncToken
    }
    throw err;
  }
}

// ─── Watch (Push Notifications) ─────────────────────────────

/**
 * Register a watch channel for push notifications on the user's primary calendar.
 * Channel expires in ~7 days; renew via cron.
 */
export async function setupWatch(userId, prisma) {
  const tokens = await getCalTokens(userId, prisma);
  if (!tokens) throw new Error('Google Calendar não conectado');

  const cal = getCalClient(tokens);
  const channelId = `task360-cal-${userId}-${Date.now()}`;
  const webhookUrl = `${APP_URL}/api/webhooks/google-calendar`;

  const res = await cal.events.watch({
    calendarId: 'primary',
    requestBody: {
      id: channelId,
      type: 'web_hook',
      address: webhookUrl,
      params: { ttl: '604800' }, // 7 days in seconds
    },
  });

  const expiry = res.data.expiration ? new Date(Number(res.data.expiration)) : null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      googleCalWatchChannelId: channelId,
      googleCalWatchExpiry: expiry,
    },
  });

  console.log(`[GoogleCal] Watch registered for user ${userId}, expires: ${expiry?.toISOString()}`);
  return { channelId, resourceId: res.data.resourceId, expiry };
}

/**
 * Renew watch channels that are about to expire (within 1 day).
 * Called by cron.
 */
export async function renewExpiringWatches(prisma) {
  const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    where: {
      googleCalWatchExpiry: { lt: oneDayFromNow },
      googleCalRefreshToken: { not: null },
      googleCalWatchChannelId: { not: null },
    },
    select: { id: true },
  });

  let renewed = 0;
  for (const u of users) {
    try {
      await setupWatch(u.id, prisma);
      renewed++;
    } catch (err) {
      console.error(`[GoogleCal] Failed to renew watch for user ${u.id}:`, err.message);
    }
  }

  console.log(`[GoogleCal] Renewed ${renewed}/${users.length} watch channels`);
  return renewed;
}

// ─── Helpers ────────────────────────────────────────────────

function normalizeEvent(gEvent) {
  return {
    googleEventId: gEvent.id,
    title: gEvent.summary || '',
    description: gEvent.description || '',
    startTime: gEvent.start?.dateTime || gEvent.start?.date,
    endTime: gEvent.end?.dateTime || gEvent.end?.date,
    location: gEvent.location || '',
    allDay: Boolean(gEvent.start?.date),
    status: gEvent.status || 'confirmed',
    htmlLink: gEvent.htmlLink,
    recurrence: gEvent.recurrence?.[0] || null,
  };
}
