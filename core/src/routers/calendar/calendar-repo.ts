import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { db } from "../../db.js";
import { calendarProviders, calendars, events } from "../../db/calendar-schema.js";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

/**
 * Calculate the start and end of a month based on index offset from current month
 */
export const getMonthRange = (date: Date) => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  return { monthStart, monthEnd };
}

/**
 * Calculate the start and end of a week based on index offset from current week
 */
export function getWeekRange(date: Date) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 }); // Sunday
  return { weekStart, weekEnd };
}

/**
 * Calculate the start and end of a day based on index offset from current day
 */
export function getDayRange(date: Date) {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
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
 * Main function to list events for an account within a specified range
 * This performs the actual database query
 */
export const listEvents = async (
  accountId: string, 
  range: "day" | "week" | "month", 
  date?: Date
) => {
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

  const calendarIds = userCalendars.map(cal => cal.id);
  const targetDay = date ?? new Date();

  // Calculate the date range based on the requested range type
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

  // Query events from the database
  // Events that overlap with the range: startTime <= endDate AND endTime >= startDate
  const dbEvents = await db
    .select()
    .from(events)
    .where(
      and(
        inArray(events.calendarId, calendarIds),
        lte(events.startTime, endDate),
        gte(events.endTime, startDate)
      )
    );

  // Transform to API format
  return dbEvents.map(transformEventToApiFormat);
}

/**
 * Get current week's events for a user's account (convenience function)
 */
export async function getCurrentWeekEventsForAccount(accountId: string) {
  return listEvents(accountId, "week");
}

/**
 * Get current month's events for a user's account (convenience function)
 */
export async function getCurrentMonthEventsForAccount(accountId: string) {
  return listEvents(accountId, "month");
}

