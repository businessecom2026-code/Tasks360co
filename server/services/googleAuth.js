/**
 * Google OAuth2 Service
 *
 * Handles OAuth2 flow for Google Tasks integration:
 * - Generate authorization URL
 * - Exchange code for tokens
 * - Refresh expired tokens
 * - Get user's Google tokens from DB
 */

import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/tasks'];

/**
 * Create an OAuth2 client with credentials from environment.
 */
export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
  );
}

/**
 * Generate a Google OAuth2 authorization URL.
 * @param {string} userId - The user's ID to pass as state
 * @returns {string} Authorization URL
 */
export function getAuthUrl(userId) {
  const oauth2 = createOAuth2Client();

  return oauth2.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: userId,
    prompt: 'consent',
  });
}

/**
 * Exchange authorization code for tokens and store them.
 * @param {string} code - The authorization code from Google
 * @param {string} userId - The user's ID
 * @param {object} prisma - Prisma client
 * @returns {Promise<object>} The tokens
 */
export async function exchangeCodeForTokens(code, userId, prisma) {
  const oauth2 = createOAuth2Client();
  const { tokens } = await oauth2.getToken(code);

  // Store tokens in the database
  await prisma.user.update({
    where: { id: userId },
    data: {
      googleAccessToken: tokens.access_token,
      googleRefreshToken: tokens.refresh_token,
      googleTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
  });

  console.log(`[GoogleAuth] Tokens stored for user ${userId}`);
  return tokens;
}

/**
 * Get the user's Google tokens from the database.
 * Refreshes if expired.
 *
 * @param {string} userId
 * @param {object} prisma
 * @returns {Promise<{ access_token: string, refresh_token: string } | null>}
 */
export async function getUserTokens(userId, prisma) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
      googleTokenExpiresAt: true,
    },
  });

  if (!user?.googleRefreshToken) return null;

  // Check if token is expired or about to expire (5 min buffer)
  const isExpired = user.googleTokenExpiresAt &&
    new Date(user.googleTokenExpiresAt).getTime() < Date.now() + 5 * 60 * 1000;

  if (isExpired) {
    try {
      const oauth2 = createOAuth2Client();
      oauth2.setCredentials({ refresh_token: user.googleRefreshToken });
      const { credentials } = await oauth2.refreshAccessToken();

      await prisma.user.update({
        where: { id: userId },
        data: {
          googleAccessToken: credentials.access_token,
          googleTokenExpiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        },
      });

      return {
        access_token: credentials.access_token,
        refresh_token: user.googleRefreshToken,
      };
    } catch (err) {
      console.error('[GoogleAuth] Token refresh failed:', err.message);
      return null;
    }
  }

  return {
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken,
  };
}

/**
 * Disconnect Google account (remove tokens).
 */
export async function disconnectGoogle(userId, prisma) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiresAt: null,
    },
  });

  console.log(`[GoogleAuth] Google disconnected for user ${userId}`);
}
