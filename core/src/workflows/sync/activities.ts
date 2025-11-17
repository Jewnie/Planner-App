import { google, calendar_v3, Auth } from 'googleapis';
import { db } from '../../db.js';
import { calendarProviders, calendars, events, eventAttendees } from '../../db/calendar-schema.js';
import { eq, and } from 'drizzle-orm';
import { getValidGoogleOAuthClientForActivity } from '../../lib/google-auth.js';

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email?: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  recurrence?: string[];
  raw?: Record<string, unknown>;
}

export interface CalendarInfo {
  id: string;
  summary: string;
  colorId?: string;
  backgroundColor?: string;
  foregroundColor?: string;
}

/**
 * Get Google OAuth2 client for a user account
 * Uses the shared utility that handles automatic token refresh
 */
export async function getGoogleOAuthClient(accountId: string): Promise<Auth.OAuth2Client> {
  try {
    console.log(`[Activity] Getting Google OAuth client for account: ${accountId}`);
    const oauth2 = await getValidGoogleOAuthClientForActivity(accountId);
    console.log(`[Activity] OAuth2 client configured successfully`);
    return oauth2;
  } catch (error) {
    console.error(`[Activity] Error in getGoogleOAuthClient:`, error);
    throw error;
  }
}

/**
 * Fetch list of calendars from Google Calendar API
 */
export async function fetchGoogleCalendars(
  accountId: string
): Promise<CalendarInfo[]> {
  try {
    console.log(`[Activity] Fetching Google calendars for account: ${accountId}`);
    const oauth2 = await getGoogleOAuthClient(accountId);
    const calendarClient = google.calendar({ version: 'v3', auth: oauth2 });

    const response = await calendarClient.calendarList.list();
    const calendarList = response.data.items || [];
    
    console.log(`[Activity] Found ${calendarList.length} calendars`);
    
    return calendarList.map((cal: calendar_v3.Schema$CalendarListEntry) => ({
      id: cal.id || '',
      summary: cal.summary || 'Untitled Calendar',
      colorId: cal.colorId || undefined,
      backgroundColor: cal.backgroundColor || undefined,
      foregroundColor: cal.foregroundColor || undefined,
    }));
  } catch (error) {
    console.error(`[Activity] Error in fetchGoogleCalendars:`, error);
    throw error;
  }
}

/**
 * Batch download events from a Google Calendar
 */
export async function batchDownloadCalendarEvents(
  accountId: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
  pageToken?: string
): Promise<{ events: GoogleCalendarEvent[]; nextPageToken?: string }> {
  const oauth2 = await getGoogleOAuthClient(accountId);
  const calendarClient = google.calendar({ version: 'v3', auth: oauth2 });

  const response = await calendarClient.events.list({
    calendarId,
    timeMin,
    timeMax,
    maxResults: 2500, // Google Calendar API max
    pageToken,
    singleEvents: true, // Expand recurring events
    orderBy: 'startTime',
  });

  const items = response.data.items || [];
  const events: GoogleCalendarEvent[] = items.map((item: calendar_v3.Schema$Event) => ({
    id: item.id || '',
    summary: item.summary || undefined,
    description: item.description || undefined,
    location: item.location || undefined,
    start: item.start ? {
      dateTime: item.start.dateTime || undefined,
      date: item.start.date || undefined,
      timeZone: item.start.timeZone || undefined,
    } : undefined,
    end: item.end ? {
      dateTime: item.end.dateTime || undefined,
      date: item.end.date || undefined,
      timeZone: item.end.timeZone || undefined,
    } : undefined,
    attendees: item.attendees?.map(att => ({
      email: att.email || undefined,
      displayName: att.displayName || undefined,
      responseStatus: att.responseStatus || undefined,
    })),
    recurrence: item.recurrence || undefined,
    raw: item as unknown as Record<string, unknown>,
  }));

  return {
    events,
    nextPageToken: response.data.nextPageToken || undefined,
  };
}

/**
 * Save or update calendar provider in database
 */
export async function upsertCalendarProvider(
  accountId: string,
  providerName: string
): Promise<string> {
  try {
    console.log(`[Activity] Upserting calendar provider: ${providerName} for account: ${accountId}`);
    
    // Check if provider already exists
    let existing;
    try {
      existing = await db
        .select()
        .from(calendarProviders)
        .where(eq(calendarProviders.accountId, accountId))
        .then(rows => rows[0]);
    } catch (queryError) {
      const errorMessage = queryError instanceof Error ? queryError.message : String(queryError);
      const errorStack = queryError instanceof Error ? queryError.stack : undefined;
      
      // Try to extract the underlying database error
      let dbError: string | null = null;
      if (queryError instanceof Error) {
        const errorWithCause = queryError as Error & { cause?: Error | unknown; originalError?: Error | unknown };
        if (errorWithCause.cause instanceof Error) {
          dbError = errorWithCause.cause.message;
        } else if (errorWithCause.originalError instanceof Error) {
          dbError = errorWithCause.originalError.message;
        } else if (errorWithCause.cause) {
          dbError = String(errorWithCause.cause);
        }
      }
      
      console.error(`[Activity] Database query failed:`, {
        error: errorMessage,
        dbError,
        stack: errorStack,
        accountId,
        table: 'calendar_providers',
        fullError: queryError,
      });
      
      // Check for specific error types
      const combinedError = `${errorMessage} ${dbError || ''}`.toLowerCase();
      
      // Password authentication errors
      if (combinedError.includes('password must be a string') || 
          combinedError.includes('scram-server-first-message') ||
          combinedError.includes('client password')) {
        throw new Error(
          `Database authentication error: The password in your DATABASE_URL may contain special characters that need to be URL-encoded. ` +
          `Please ensure your DATABASE_URL password is properly encoded (e.g., @ becomes %40, # becomes %23). ` +
          `Original error: ${dbError || errorMessage}`
        );
      }
      
      // SSL connection errors
      if (combinedError.includes('ssl') || combinedError.includes('tls')) {
        throw new Error(
          `Database SSL connection error: ${dbError || errorMessage}. ` +
          `Please check your DATABASE_URL SSL configuration. ` +
          `If your database doesn't support SSL, add ?sslmode=disable to your connection string.`
        );
      }
      
      // Table doesn't exist errors
      if (combinedError.includes('does not exist') || 
          combinedError.includes('relation') || 
          combinedError.includes('undefined table')) {
        throw new Error(
          `Database table 'calendar_providers' may not exist or migration not run. ` +
          `Please run database migrations. ` +
          `Original error: ${dbError || errorMessage}`
        );
      }
      
      // Generic "Failed query" - could be various issues
      if (combinedError.includes('failed query')) {
        throw new Error(
          `Database query failed. This could be due to: ` +
          `1. Table doesn't exist (run migrations), ` +
          `2. Connection/SSL issues, ` +
          `3. Permission issues. ` +
          `Original error: ${dbError || errorMessage}`
        );
      }
      
      // Re-throw with more context
      throw new Error(
        `Database query failed: ${dbError || errorMessage}. ` +
        `Table: calendar_providers, AccountId: ${accountId}`
      );
    }

    if (existing) {
      console.log(`[Activity] Provider already exists: ${existing.id}`);
      return existing.id;
    }

    // Create new provider
    const [provider] = await db
      .insert(calendarProviders)
      .values({
        name: providerName,
        accountId,
      })
      .returning();

    console.log(`[Activity] Created new provider: ${provider.id}`);
    return provider.id;
  } catch (error) {
    console.error(`[Activity] Error in upsertCalendarProvider:`, error);
    throw error;
  }
}

/**
 * Save or update calendar in database
 */
export async function upsertCalendar(
  providerId: string,
  googleCalendarId: string,
  name: string,
  color?: string,
  metadata?: Record<string, unknown>
): Promise<string> {
  // Check if calendar already exists (by provider and Google calendar ID in metadata)
  const existing = await db
    .select()
    .from(calendars)
    .where(eq(calendars.providerId, providerId))
    .then(rows => {
      // Try to find by matching Google calendar ID in metadata
      return rows.find(cal => {
        const meta = cal.metadata as Record<string, unknown> | null;
        return meta?.googleCalendarId === googleCalendarId;
      });
    });

  if (existing) {
    // Update existing calendar
    const [updated] = await db
      .update(calendars)
      .set({
        name,
        color,
        metadata: metadata || existing.metadata,
      })
      .where(eq(calendars.id, existing.id))
      .returning();

    return updated.id;
  }

  // Create new calendar
  const [calendar] = await db
    .insert(calendars)
    .values({
      providerId,
      name,
      color,
      metadata: metadata || { googleCalendarId },
    })
    .returning();

  return calendar.id;
}

/**
 * Save or update events in database (batch operation)
 */
export async function upsertEvents(
  calendarId: string,
  googleEvents: GoogleCalendarEvent[]
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const googleEvent of googleEvents) {
    // Parse start and end times
    const startTime = googleEvent.start?.dateTime
      ? new Date(googleEvent.start.dateTime)
      : googleEvent.start?.date
        ? new Date(googleEvent.start.date)
        : null;

    const endTime = googleEvent.end?.dateTime
      ? new Date(googleEvent.end.dateTime)
      : googleEvent.end?.date
        ? new Date(googleEvent.end.date)
        : null;

    if (!startTime || !endTime) {
      console.warn(`Skipping event ${googleEvent.id}: missing start or end time`);
      continue;
    }

    const isAllDay = !!googleEvent.start?.date && !googleEvent.start?.dateTime;

    // Check if event already exists
    const existing = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.calendarId, calendarId),
          eq(events.providerEventId, googleEvent.id)
        )
      )
      .then(rows => rows[0]);

    if (existing) {
      // Update existing event
      await db
        .update(events)
        .set({
          title: googleEvent.summary || 'Untitled Event',
          description: googleEvent.description || null,
          location: googleEvent.location || null,
          startTime,
          endTime,
          allDay: isAllDay,
          recurringRule: googleEvent.recurrence?.[0] || null,
          timeZone: googleEvent.start?.timeZone || googleEvent.end?.timeZone || null,
          rawData: googleEvent.raw || null,
          updatedAt: new Date(),
        })
        .where(eq(events.id, existing.id));

      // Update attendees
      await db
        .delete(eventAttendees)
        .where(eq(eventAttendees.eventId, existing.id));

      if (googleEvent.attendees && googleEvent.attendees.length > 0) {
        await db.insert(eventAttendees).values(
          googleEvent.attendees.map(att => ({
            eventId: existing.id,
            name: att.displayName || null,
            email: att.email || null,
            status: att.responseStatus || null,
          }))
        );
      }

      updated++;
    } else {
      // Create new event
      const [newEvent] = await db
        .insert(events)
        .values({
          calendarId,
          providerEventId: googleEvent.id,
          title: googleEvent.summary || 'Untitled Event',
          description: googleEvent.description || null,
          location: googleEvent.location || null,
          startTime,
          endTime,
          allDay: isAllDay,
          recurringRule: googleEvent.recurrence?.[0] || null,
          timeZone: googleEvent.start?.timeZone || googleEvent.end?.timeZone || null,
          rawData: googleEvent.raw || null,
        })
        .returning();

      // Add attendees
      if (googleEvent.attendees && googleEvent.attendees.length > 0) {
        await db.insert(eventAttendees).values(
          googleEvent.attendees.map(att => ({
            eventId: newEvent.id,
            name: att.displayName || null,
            email: att.email || null,
            status: att.responseStatus || null,
          }))
        );
      }

      created++;
    }
  }

  return { created, updated };
}

