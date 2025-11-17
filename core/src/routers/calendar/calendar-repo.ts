import { db } from "../../db.js";
import { calendarProviders, calendars, events } from "../../db/calendar-schema.js";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

/**
 * Calculate the start and end of the current week (Monday to Sunday)
 */
export function getCurrentWeekRange(): { weekStart: Date; weekEnd: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert Sunday to 6 days from Monday
  
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysFromMonday);
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

/**
 * Get calendar provider for a user's account ID
 */
export async function getCalendarProviderForAccount(accountId: string) {
  return db
    .select()
    .from(calendarProviders)
    .where(eq(calendarProviders.accountId, accountId))
    .then(rows => rows[0]);
}

/**
 * Get all calendars for a provider
 */
export async function getCalendarsForProvider(providerId: string) {
  return db
    .select()
    .from(calendars)
    .where(eq(calendars.providerId, providerId));
}

/**
 * Get events for calendars within a date range
 * Returns events that overlap with the date range (start before rangeEnd AND end after rangeStart)
 */
export async function getEventsForCalendarsInRange(
  calendarIds: string[],
  rangeStart: Date,
  rangeEnd: Date
) {
  if (calendarIds.length === 0) {
    return [];
  }

  return db
    .select()
    .from(events)
    .where(
      and(
        // Event is in one of the specified calendars
        inArray(events.calendarId, calendarIds),
        // Event overlaps with the date range
        // (starts before range ends AND ends after range starts)
        lte(events.startTime, rangeEnd),
        gte(events.endTime, rangeStart)
      )
    )
    .orderBy(events.startTime);
}

/**
 * Transform database event to Google Calendar API-like format
 */
export function transformEventToApiFormat(event: InferSelectModel<typeof events>) {
  return {
    id: event.providerEventId,
    summary: event.title,
    description: event.description || null,
    location: event.location || null,
    start: {
      dateTime: event.allDay ? null : event.startTime.toISOString(),
      date: event.allDay ? event.startTime.toISOString().split('T')[0] : null,
      timeZone: event.timeZone || null,
    },
    end: {
      dateTime: event.allDay ? null : event.endTime.toISOString(),
      date: event.allDay ? event.endTime.toISOString().split('T')[0] : null,
      timeZone: event.timeZone || null,
    },
  };
}

/**
 * Get current week's events for a user's Google account
 */
export async function getCurrentWeekEventsForAccount(accountId: string) {
  const { weekStart, weekEnd } = getCurrentWeekRange();

  // Find the calendar provider for this account
  const provider = await getCalendarProviderForAccount(accountId);
  if (!provider) {
    return [];
  }

  // Find all calendars for this provider
  const userCalendars = await getCalendarsForProvider(provider.id);
  if (userCalendars.length === 0) {
    return [];
  }

  const calendarIds = userCalendars.map(cal => cal.id);

  // Get events for these calendars within the current week
  const weekEvents = await getEventsForCalendarsInRange(calendarIds, weekStart, weekEnd);

  // Transform to API format
  return weekEvents.map(transformEventToApiFormat);
}

