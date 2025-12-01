import { google, calendar_v3, Auth } from 'googleapis';
import { db } from '../../db.js';
import { calendarProviders, calendars, events, eventAttendees, calendarWatches } from '../../db/calendar-schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import { getValidGoogleOAuthClientForActivity } from '../../lib/google-auth.js';
import { integrationStatuses, integrationTypes } from '../../db/integration-schema.js';
import { upsertIntegration } from '../../routers/integrations/integration-repo.js';
import { z } from 'zod';
import { getExistingCalendarWatchDataForCalendar } from '../../routers/calendar/calendar-repo.js';
export interface GoogleCalendarEventNormalized {
  id: string;
  title?: string;                // formerly summary
  description?: string;
  location?: string;
  
  // Always actual JS dates after processing
  start: Date;
  end: Date;
  
  // True if this is an all-day event (Google used `start.date`)
  allDay: boolean;
  
  attendees?: Array<{
  email?: string;
  displayName?: string;
  responseStatus?: string;
  }>;
  
  // Recurrence rules if present (RRULE, EXDATE, etc.)
  recurrence?: string[];
  
  // Optional original timezone (for display)
  timeZone?: string;
  
  // Status of the event (e.g., "confirmed", "cancelled" for deleted events)
  status?: string;
  
  // Raw Google event as fetched (for debugging or re-sync)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw?: Record<string, any>;
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
  params:{accountId: string,
    nextPageToken?: string | null,
    nextSyncToken?: string | null,}  
): Promise<{
  calendars: CalendarInfo[];
  nextPageToken?: string | null;
  nextSyncToken?: string | null;
}> {
  try {
    const oauth2 = await getGoogleOAuthClient(params.accountId);
    const calendarClient = google.calendar({ version: 'v3', auth: oauth2 });

    const response = await calendarClient.calendarList.list({
      pageToken: params.nextPageToken ? params.nextPageToken : undefined, 
      syncToken: params.nextSyncToken ? params.nextSyncToken : undefined 
    });
    
    const items = response.data.items || [];
    const calendars: CalendarInfo[] = items.map((item: calendar_v3.Schema$CalendarListEntry) => ({
      id: item.id || '',
      summary: item.summary || 'Untitled Calendar',
      colorId: item.colorId || undefined,
      backgroundColor: item.backgroundColor || undefined,
      foregroundColor: item.foregroundColor || undefined,
    }));
    
    return {
      calendars,
      nextPageToken: response.data.nextPageToken || null,
      nextSyncToken: response.data.nextSyncToken || null,
    };
  } catch (error) {
    console.error(`[Activity] Error in fetchGoogleCalendars:`, error);
    throw error;
  }
}

export async function handleIntegrationUpsertion(params:{
  accountId: string,
  type: typeof integrationTypes[number],
  status: typeof integrationStatuses[number],

}) {
  await upsertIntegration({
    accountId: params.accountId,
    type: params.type,
    status: params.status,
  });
}

export async function updateCalendarProviderSyncToken(params:{

  accountId: string,
  providerName: string,
  syncToken: string,
}): Promise<void> {
  await db.update(calendarProviders).set({ syncToken: params.syncToken }).where(eq(calendarProviders.accountId, params.accountId));
}

function normalizeGoogleEvent(item: calendar_v3.Schema$Event): GoogleCalendarEventNormalized {
  const isAllDay = !!item.start?.date;   // Only start.date exists

  let start: Date;
  let end: Date;
  let timeZone: string | undefined;

  if (isAllDay) {
    // Google all-day, exclusive end date
    start = new Date(item.start!.date!);  // e.g. 2025-12-31

    const endExclusive = new Date(item.end!.date!);  
    end = new Date(endExclusive);
    end.setDate(end.getDate() - 1);       // inclusive end (correct multi-day)
    end.setHours(23, 59, 59, 999);
  } else {
    // Timed event
    start = new Date(item.start!.dateTime!);
    end = new Date(item.end!.dateTime!);
    // Extract timezone from the event (usually same for start and end)
    timeZone = (item.start?.timeZone || item.end?.timeZone) || undefined;
  }

  // Map attendees from Google format to our format
  const attendees = item.attendees?.map(att => ({
    email: att.email ?? undefined,
    displayName: att.displayName ?? undefined,
    responseStatus: att.responseStatus ?? undefined,
  }));

  return {
    id: item.id!,
    title: item.summary || undefined,
    description: item.description || undefined,
    location: item.location || undefined,
    start,
    end,
    allDay: isAllDay,
    attendees: attendees && attendees.length > 0 ? attendees : undefined,
    recurrence: item.recurrence || undefined, // Google provides recurrence as string array (RRULE, EXDATE, etc.)
    timeZone: timeZone || undefined,
    status: item.status || undefined, // "confirmed", "tentative", "cancelled" (deleted)
    raw: item,
  };
}


/**
 * Batch download events from a Google Calendar
 */
export async function batchDownloadCalendarEvents(params:{
  accountId: string,
  calendarId: string,
  timeMin: string ,
  pageToken: string | null ,
  syncToken: string | null ,
}): Promise<{ events: GoogleCalendarEventNormalized[]; nextPageToken: string | null , nextSyncToken: string | null  }> {
  const oauth2 = await getGoogleOAuthClient(params.accountId);
  const calendarClient = google.calendar({ version: 'v3', auth: oauth2 });

  const isInitialSync = !params.syncToken;

const response = await calendarClient.events.list({
  calendarId: params.calendarId,
  maxResults: 300,
  timeMin: isInitialSync ? params.timeMin  : undefined,
  singleEvents: isInitialSync ? false : undefined,
  pageToken: params.pageToken ? params.pageToken : undefined,
  syncToken: params.syncToken ? params.syncToken : undefined,
});


  const items = response.data.items || [];
  const events: GoogleCalendarEventNormalized[] = items.map(normalizeGoogleEvent);


  return {
    events,
    nextPageToken: response.data.nextPageToken ?? null,
    nextSyncToken: response.data.nextSyncToken ?? null,
  };
}

/**
 * fetch or insert calendar provider in database
 */
export async function getCalendarProvider(params:{
  accountId: string,
  providerName: string,
}
) {
  try {
    console.log(`[Activity] checking if calendar provider exists: ${params.providerName} for account: ${params.accountId}`);
    
    // Check if provider already exists
    const existing = await db
        .select()
        .from(calendarProviders)
        .where(eq(calendarProviders.accountId, params.accountId))
        .then(rows => rows[0]);
      if(existing){
        return existing;
      }

    // Create new provider
    console.log(`[Activity] creating new calendar provider: ${params.providerName} for account: ${params.accountId}`);
    const newProvider = await db
      .insert(calendarProviders)
      .values({
        name: params.providerName,
        accountId: params.accountId,
      })
      .returning()

    console.log(`[Activity] Created new provider: ${newProvider[0].id}`);
    return newProvider[0];
  } catch (error) {
    console.error(`[Activity] Error in assertCalendarProviderExists:`, error);
    throw error;
  }
}



/**
 * Save or update calendar in database
 */
export async function upsertCalendar(params:{
  providerId: string,
  googleCalendarId: string,
  name: string,
  color?: string,  
  metadata?: Record<string, unknown>,
 
}): Promise<string> {
  // Check if calendar already exists (by provider and provider calendar ID)
  const existing = await db
    .select()
    .from(calendars)
    .where(
      and(
        eq(calendars.providerId, params.providerId),
        eq(calendars.providerCalendarId, params.googleCalendarId)
      )
    )
    .then(rows => rows[0]);

  if (existing) {
    // Update existing calendar
    const [updated] = await db
      .update(calendars)
      .set({
        name: params.name,
        color: params.color,
        providerCalendarId: params.googleCalendarId, // Ensure it's up to date
        metadata: params.metadata || existing.metadata,
     
      })
      .where(eq(calendars.id, existing.id))
      .returning();

    return updated.id;
  }

  // Create new calendar
  const [calendar] = await db
    .insert(calendars)
    .values({
      providerId: params.providerId,
      name: params.name,
      color: params.color,
      providerCalendarId: params.googleCalendarId,
      metadata: params.metadata || {},
     
    })
    .returning();

  return calendar.id;
}

export async function getCalendarSyncToken(params: {
  calendarId: string;
}): Promise<string | null> {
  const calendar = await db
    .select({ syncToken: calendars.syncToken })
    .from(calendars)
    .where(eq(calendars.id, params.calendarId))
    .then(rows => rows[0]);
  
  return calendar?.syncToken || null;
}

/**
 * Get provider calendar ID from database calendar ID
 */
export async function getGoogleCalendarId(params: {
  calendarId: string;
}): Promise<string> {
  const calendar = await db
    .select({ providerCalendarId: calendars.providerCalendarId })
    .from(calendars)
    .where(eq(calendars.id, params.calendarId))
    .then(rows => rows[0]);
  
  if (!calendar) {
    throw new Error(`Calendar not found: ${params.calendarId}`);
  }
  
  if (!calendar.providerCalendarId) {
    throw new Error(`Provider calendar ID not found for calendar: ${params.calendarId}`);
  }
  
  return calendar.providerCalendarId;
}

export async function updateCalendarSyncToken(params:{
  calendarId: string,
  syncToken: string,
}): Promise<void> {
  await db.update(calendars).set({ syncToken: params.syncToken }).where(and(eq(calendars.id, params.calendarId)));
}

/**
 * Save or update events in database (batch operation)
 */
export async function upsertEvents(
  calendarId: string,
  googleEvents: GoogleCalendarEventNormalized[]
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const googleEvent of googleEvents) {
    // Parse start and end times - ensure they are Date objects
    // (Temporal workflows serialize Date objects, so they may come back as strings)
    const startTime = googleEvent.start instanceof Date 
      ? googleEvent.start 
      : new Date(googleEvent.start);
    const endTime = googleEvent.end instanceof Date 
      ? googleEvent.end 
      : new Date(googleEvent.end);

    const isAllDay = googleEvent.allDay;

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
          title: googleEvent.title || 'Untitled Event',
          description: googleEvent.description || null,
          location: googleEvent.location || null,
          startTime,
          endTime,
          allDay: isAllDay,
          recurringRule: googleEvent.recurrence?.[0] || null,
          timeZone: googleEvent.timeZone || null,
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
          title: googleEvent.title || 'Untitled Event',
          description: googleEvent.description || null,
          location: googleEvent.location || null,
          startTime,
          endTime,
          allDay: isAllDay,
          recurringRule: googleEvent.recurrence?.[0] || null,
          timeZone: googleEvent.timeZone || null,
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

/**
 * Delete events from database by provider event IDs
 */
export async function deleteEvents(
  calendarId: string,
  providerEventIds: string[]
): Promise<number> {
  if (providerEventIds.length === 0) {
    return 0;
  }

  // First, get the event IDs that match these provider event IDs
  const eventsToDelete = await db
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        eq(events.calendarId, calendarId),
        inArray(events.providerEventId, providerEventIds)
      )
    );

  if (eventsToDelete.length === 0) {
    return 0;
  }

  const eventIds = eventsToDelete.map(e => e.id);

  // Delete attendees first (foreign key constraint)
  await db
    .delete(eventAttendees)
    .where(inArray(eventAttendees.eventId, eventIds));

  // Delete events
  await db
    .delete(events)
    .where(inArray(events.id, eventIds));

  return eventsToDelete.length;
}

export async function createCalendarWatch(params:{
  googleCalendarId: string, // Google Calendar ID for API call (e.g., "jonathan.loore@gmail.com")
  databaseCalendarId: string, // Database calendar ID (UUID) for storage
  accountId: string,
  providerId: string,
}) {
  const oauth2 = await getGoogleOAuthClient(params.accountId);
  const calendar = google.calendar({ version: "v3", auth: oauth2 });

  const channelSchema = z.string();
  
  // Get webhook URL - use API_URL in production, or WEBHOOK_URL if set (for tunneling service in dev)
  const googleWebhookUrl: string = process.env.WEBHOOK_URL || process.env.API_URL || '';
  
  if (!googleWebhookUrl) {
    throw new Error('WEBHOOK_URL or API_URL environment variable must be set for Google Calendar webhooks');
  }

  const existingWatchData = await getExistingCalendarWatchDataForCalendar({ calendarId: params.databaseCalendarId, providerId: params.providerId });

  const channelId = channelSchema.parse(crypto.randomUUID()); 
  
  try {
    const res = await calendar.events.watch({
      calendarId: params.googleCalendarId, // Use Google Calendar ID for API call
      requestBody: {
        id: channelId,
        type: "web_hook",
        address: `${googleWebhookUrl}/google-calendar-webhook`, // your public HTTPS webhook
      },
    });

    // Check if the response indicates success
    if (res.status !== 200) {
      throw new Error(`Google Calendar API returned status ${res.status} when creating watch for calendar ${params.googleCalendarId}`);
    }

    // Validate that we got the required data
    if (!res.data.id || !res.data.resourceId || !res.data.expiration) {
      throw new Error(`Google Calendar API returned incomplete watch data for calendar ${params.googleCalendarId}`);
    }

    console.log(res.data.expiration, '---------------------EXPIRATION--------------------');

    try {
      await db.insert(calendarWatches).values({
        calendarId: params.databaseCalendarId, // Use database calendar ID (UUID) for storage
        providerId: params.providerId,
        channelId: channelId,
        resourceId: res.data.resourceId as string,
        expiration: new Date(Number(res.data.expiration)),
      });
      
      if(existingWatchData.length > 0){
        const stoppedWatch = await calendar.channels.stop({
          requestBody: {
            id: existingWatchData[0].channelId,
            resourceId: existingWatchData[0].resourceId,
          },
        });
        if(stoppedWatch.status === 200){
          await db.update(calendarWatches).set({ deletedAt: new Date() }).where(and(
            eq(calendarWatches.id, existingWatchData[0].id)
          ));
        }
      }
      console.log(`[Activity] New Calendar watch created successfully`);
    } catch (error) {
      console.error(`[Activity] Error saving calendar watch to database:`, error);
      throw error;
    }

    console.log("Watch created:", res.data);

    // Return watch data
    return {
      channelId: res.data.id,
      resourceId: res.data.resourceId,
      expiration: res.data.expiration,
    };
  } catch (error) {
    // Check if this is a Google API error indicating watches aren't supported
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Google API errors may have a code property
    const errorCode = error && typeof error === 'object' && 'code' in error 
      ? (error as { code?: number }).code 
      : undefined;
    
    // Google API error codes that indicate watches aren't supported:
    // - 403: Forbidden (often means watch not supported)
    // - 400: Bad Request (might indicate invalid calendar for watches)
    if (errorCode === 403 || errorCode === 400) {
      // Check error message for specific watch-related errors
      const lowerMessage = errorMessage.toLowerCase();
      if (
        lowerMessage.includes('watch') && 
        (lowerMessage.includes('not supported') || 
         lowerMessage.includes('not allowed') || 
         lowerMessage.includes('forbidden') ||
         lowerMessage.includes('cannot'))
      ) {
        throw new Error(`Calendar ${params.googleCalendarId} does not support watch notifications: ${errorMessage}`);
      }
    }
    
    // Re-throw the original error if it's not a watch-not-supported error
    throw error;
  }
}

