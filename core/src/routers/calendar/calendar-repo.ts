import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { UTCDate } from "@date-fns/utc";
import { db } from "../../db.js";

import { calendarProviders, calendars, events } from "../../db/calendar-schema.js";
import { eq, and, or, gte, lte, inArray, isNull, isNotNull } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

/**
 * Convert a regular Date to UTCDate for UTC-aware calculations
 */
function toUTCDate(date: Date): UTCDate {
  return new UTCDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds());
}

/**
 * Calculate the start and end of a month based on index offset from current month
 * Uses UTC to avoid timezone issues
 */
export const getMonthRange = (date: Date) => {
  const utcDate = toUTCDate(date);
  const monthStart = startOfMonth(utcDate);
  const monthEnd = endOfMonth(utcDate);
  return { monthStart, monthEnd };
}

/**
 * Calculate the start and end of a week based on index offset from current week
 * Uses UTC to avoid timezone issues
 */
export function getWeekRange(date: Date) {
  const utcDate = toUTCDate(date);
  const weekStart = startOfWeek(utcDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(utcDate, { weekStartsOn: 1 }); // Sunday
  return { weekStart, weekEnd };
}

/**
 * Calculate the start and end of a day based on index offset from current day
 * Uses UTC to avoid timezone issues
 */
export function getDayRange(date: Date) {
  const utcDate = toUTCDate(date);
  const dayStart = startOfDay(utcDate);
  const dayEnd = endOfDay(utcDate);
  return { dayStart, dayEnd };
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
 * Transform event from database format to API format
 */
export function transformEventToApiFormat(event: InferSelectModel<typeof events>) {
  return {
    id: event.providerEventId,
    calendarId: event.calendarId,
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
 * Main function to list events for an account within specified date ranges
 * This performs the actual database query
 * @param accountId - The account ID
 * @param range - The range type (day, week, or month) to calculate for each date
 * @param dateStrings - Array of date strings in YYYY-MM-DD format
 */
export const listEventsByAccountId = async (
  accountId: string, 
  range: "day" | "week" | "month", 
  dateStrings: string[],
  filterCalendarIds?: string[] 
) => {

  const { rrulestr } = await import("rrule");

  // Get the calendar provider for this account
  const provider = await getCalendarProviderForAccount(accountId);
  if (!provider) {
    return [];
  }

  // Get all calendars for this provider
  const userCalendars = await getCalendarsForProvider(provider.id);
  if (userCalendars.length === 0) {
    return [];
  }

  // Use filterCalendarIds if provided, otherwise use all user calendars
  const calendarIds = filterCalendarIds || userCalendars.map(cal => cal.id);
  
  if (calendarIds.length === 0) {
    return [];
  }
  
  // Parse each date string and calculate the appropriate range for each
  const dateRanges: Array<{ startDate: Date; endDate: Date }> = [];
  
  for (const dateString of dateStrings) {
    // Parse YYYY-MM-DD as UTC date
    const [year, month, day] = dateString.split('-').map(Number);
    const targetDay = new Date(Date.UTC(year, month - 1, day));
    
    let startDate: Date;
    let endDate: Date;
    
    if (range === "week") {
      const { weekStart, weekEnd } = getWeekRange(targetDay);
      startDate = weekStart;
      endDate = weekEnd;
    } else if (range === "month") {
      const { monthStart, monthEnd } = getMonthRange(targetDay);
      startDate = monthStart;
      endDate = monthEnd;
    } else { // day
      const { dayStart, dayEnd } = getDayRange(targetDay);
      startDate = dayStart;
      endDate = dayEnd;
    }
    
    dateRanges.push({ startDate, endDate });
  }

  // If no date ranges, return empty array
  if (dateRanges.length === 0) {
    return [];
  }

  // Build OR conditions for each date range
  // Events that overlap with any range: (startTime <= endDate AND endTime >= startDate)
  const rangeConditions = dateRanges.map(({ startDate, endDate }) =>
    and(
      lte(events.startTime, endDate),
      gte(events.endTime, startDate)
    )
  );

  // Query events from the database
  // Events that overlap with any of the date ranges
  const nonRecurringEvents = await db
    .select()
    .from(events)
    .where(
      and(
        inArray(events.calendarId, calendarIds),
        isNull(events.recurringRule),
        or(...rangeConditions)
      )
    );
    const recurringEvents = await db
    .select()
    .from(events)
    .where(
      and(
        inArray(events.calendarId, calendarIds),
        isNotNull(events.recurringRule),
      )
    );
  // Separate recurring and non-recurring events


  // Calculate the overall date range window for expanding recurring events
  const overallStart = new Date(Math.min(...dateRanges.map(r => r.startDate.getTime())));
  const overallEnd = new Date(Math.max(...dateRanges.map(r => r.endDate.getTime())));

  // Expand recurring events
  const expanded: Array<InferSelectModel<typeof events>> = [];
  for (const event of recurringEvents) {
    if (!event.recurringRule) continue;

    try {
      // Create RRule object with dtstart
      const rule = rrulestr(event.recurringRule, {
        dtstart: new Date(event.startTime),
      });

      // Calculate event duration
      const eventDuration = event.endTime.getTime() - event.startTime.getTime();

      // Expand within the overall visible window
      const occurrenceDates = rule.between(
        overallStart,
        overallEnd,
        true // inclusive
      );

      // Create instances for each occurrence
      const instances = occurrenceDates.map((occurrenceDate: Date) => ({
        ...event,
        startTime: occurrenceDate,
        endTime: new Date(occurrenceDate.getTime() + eventDuration),
      }));

      expanded.push(...instances);
    } catch (error) {
      // If RRule parsing fails, skip this recurring event
      console.error(`Failed to parse RRule for event ${event.id}:`, error);
      continue;
    }
  }

  // Combine non-recurring events with expanded recurring instances
console.log(dateRanges)
  const allEvents = [...nonRecurringEvents, ...expanded];

  // Transform to API format
  return allEvents.map(transformEventToApiFormat);
}

/**
 * Get current week's events for a user's account (convenience function)
 */
export async function getCurrentWeekEventsForAccount(accountId: string) {
  const today = new Date();
  const dateString = today.toISOString().split('T')[0];
  return listEventsByAccountId(accountId, "week", [dateString]);
}

/**
 * Get current month's events for a user's account (convenience function)
 */
export async function getCurrentMonthEventsForAccount(accountId: string) {
  const today = new Date();
  const dateString = today.toISOString().split('T')[0];
  return listEventsByAccountId(accountId, "month", [dateString]);
}

