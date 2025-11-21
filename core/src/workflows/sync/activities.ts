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

export async function updateCalendarProviderSyncToken(params:{

  accountId: string,
  providerName: string,
  syncToken: string,
}): Promise<void> {
  await db.update(calendarProviders).set({ syncToken: params.syncToken }).where(eq(calendarProviders.accountId, params.accountId));
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
}): Promise<{ events: GoogleCalendarEvent[]; nextPageToken: string | null , nextSyncToken: string | null  }> {
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
    nextPageToken: response.data.nextPageToken ?? null,
    nextSyncToken: response.data.nextSyncToken ?? null,
  };
}

/**
 * Save or update calendar provider in database
 */
export async function assertCalendarProviderExists(params:{
  accountId: string,
  providerName: string,
}
) {
  try {
    console.log(`[Activity] Asserting calendar provider exists: ${params.providerName} for account: ${params.accountId}`);
    
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

export async function updateCalendarSyncToken(params:{
  calendarId: string,
  providerId: string,
  syncToken: string,
}): Promise<void> {
  await db.update(calendars).set({ syncToken: params.syncToken }).where(and(eq(calendars.id, params.calendarId), eq(calendars.providerId, params.providerId)));
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

