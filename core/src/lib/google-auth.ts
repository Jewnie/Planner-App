import { google, Auth } from 'googleapis';
import { auth } from '../auth.js';
import { db } from '../db.js';
import { account } from '../db/auth-schema.js';
import { eq } from 'drizzle-orm';
import { fromNodeHeaders } from 'better-auth/node';
import type { IncomingHttpHeaders } from 'http';


export async function getValidGoogleOAuthClient(
  accountId: string,
  requestHeaders?: IncomingHttpHeaders
): Promise<Auth.OAuth2Client> {

  
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
    const accessTokenResult = await auth.api.getAccessToken({
      body: {
        providerId: 'google',
        accountId: userAccount.id,
        userId: userAccount.userId,
      },
      headers: requestHeaders ? fromNodeHeaders(requestHeaders) : fromNodeHeaders({} as IncomingHttpHeaders),
    });

    accessToken = accessTokenResult.accessToken;

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
  });

  return oauth2;
}


export async function getValidGoogleOAuthClientForActivity(
  accountId: string
): Promise<Auth.OAuth2Client> {
  return getValidGoogleOAuthClient(accountId);
}

