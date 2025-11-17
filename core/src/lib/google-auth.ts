import { google, Auth } from 'googleapis';
import { auth } from '../auth.js';
import { db } from '../db.js';
import { account } from '../db/auth-schema.js';
import { eq } from 'drizzle-orm';
import { fromNodeHeaders } from 'better-auth/node';
import type { IncomingHttpHeaders } from 'http';

/**
 * Get a valid Google OAuth2 client with automatic token refresh
 * This ensures tokens are always valid before use
 */
export async function getValidGoogleOAuthClient(
  accountId: string,
  requestHeaders?: IncomingHttpHeaders
): Promise<Auth.OAuth2Client> {
  // Get the account from database
  const userAccount = await db
    .select()
    .from(account)
    .where(eq(account.id, accountId))
    .then(rows => rows[0]);

  if (!userAccount || userAccount.providerId !== 'google') {
    throw new Error(`No Google account found for account ID: ${accountId}`);
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are required');
  }

  // Get access token from better-auth
  let accessToken: string;
  try {
    const tokenResult = await auth.api.getAccessToken({
      body: {
        providerId: 'google',
        accountId: userAccount.id,
        userId: userAccount.userId,
      },
      headers: requestHeaders ? fromNodeHeaders(requestHeaders) : fromNodeHeaders({} as IncomingHttpHeaders),
    });
    accessToken = tokenResult.accessToken;
  } catch (tokenError) {
    throw new Error(
      `Failed to get Google access token: ${tokenError instanceof Error ? tokenError.message : String(tokenError)}`
    );
  }

  // Create OAuth2 client
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );

  oauth2.setCredentials({
    access_token: accessToken,
    refresh_token: userAccount.refreshToken ?? undefined,
  });

  // Always refresh the token to ensure it's valid
  // This handles cases where better-auth returns an expired token
  if (userAccount.refreshToken) {
    try {
      await oauth2.refreshAccessToken();
      // Token refreshed successfully - now we have a valid token
    } catch (refreshError) {
      // If refresh fails, the token might still be valid
      // We'll try to use it and let the API call fail if it's truly invalid
      console.warn(`Failed to refresh Google access token, using provided token:`, refreshError);
    }
  }

  return oauth2;
}

/**
 * Get a valid Google OAuth2 client for use in Temporal activities
 * (without HTTP request headers)
 */
export async function getValidGoogleOAuthClientForActivity(
  accountId: string
): Promise<Auth.OAuth2Client> {
  return getValidGoogleOAuthClient(accountId);
}

