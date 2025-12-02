import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { UTCDate } from "@date-fns/utc";
import { db } from "../../db.js";

import { calendarProviders, calendars, calendarWatches, events } from "../../db/calendar-schema.js";
import { account } from "../../db/auth-schema.js";
import { eq, and, or, gte, lte, inArray, isNull, isNotNull, gt, desc } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

import RRulePkg from "rrule";
import { getTemporalClient } from "../../workflows/temporal-client.js";

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
export async function getCalendarProvidersForAccount(params: { accountId: string }) {
  return await db
    .select()
    .from(calendarProviders)
    .where(eq(calendarProviders.accountId, params.accountId))
    
}

export const assertUserAccountExists = async (userId: string) => {
  const response = await db.select().from(account).where(eq(account.userId, userId));
  if (!response) {
    throw new Error("User account not found");
  }
  return response[0];
}

/**
 * Get all calendars for a provider
 */
export async function getCalendarsForProviders(params: { providerIds: string[] }) {
  return db
    .select()
    .from(calendars)
    .where(inArray(calendars.providerId, params.providerIds));
}


export const listEventsByAccountId = async (
  accountId: string, 
  range: "day" | "week" | "month", 
  dateStrings: string[],
  filterCalendarIds?: string[] 
) => {
  const { rrulestr } = RRulePkg;


  // Get the calendar provider for this account
  const providers = await getCalendarProvidersForAccount({ accountId });
  if (!providers) {
    return [];
  }

  // Get all calendars for this provider
  const userCalendars = await getCalendarsForProviders({ providerIds: providers.map(p => p.id) });
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
    } else { 
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
  const allEvents = [...nonRecurringEvents, ...expanded];

  


  // Transform to API format
  return allEvents
}

export const getExistingCalendarWatchDataForCalendar = async (params: { calendarId: string, providerId: string }) => {
  return await db.select({id: calendarWatches.id, channelId: calendarWatches.channelId, resourceId: calendarWatches.resourceId}).from(calendarWatches).where(
    and(
      eq(calendarWatches.calendarId, params.calendarId), 
      eq(calendarWatches.providerId, params.providerId), 
      isNotNull(calendarWatches.channelId), 
      gt(calendarWatches.expiration, new Date())
    )
    ).orderBy(desc(calendarWatches.createdAt))
}


export async function checkIfSyncIsRunning(params: {
  accountId: string;
  calendarType: 'google' | 'outlook';
}): Promise<{
  isRunning: boolean;
  workflowId: string | null;
  status: string | null;
}> {
  try {
    const client = await getTemporalClient();
    
    // Check both full sync and incremental sync workflows
    const workflowIds = [
      `calendar-sync-${params.accountId}-${params.calendarType}`, // Full sync
      `calendar-sync-incremental-${params.accountId}-${params.calendarType}`, // Incremental sync
    ];
    
    for (const workflowId of workflowIds) {
      try {
        const handle = client.workflow.getHandle(workflowId);
        const description = await handle.describe();
        
        const status = description.status.name;
        // Check if workflow is running
        if (status === 'RUNNING' || status === 'CONTINUED_AS_NEW') {
          return {
            isRunning: true,
            workflowId,
            status,
          };
        }
      } catch {
        // Workflow doesn't exist or can't be accessed, continue checking
        continue;
      }
    }
    
    return {
      isRunning: false,
      workflowId: null,
      status: null,
    };
  } catch (error) {
    console.error('Error checking if sync is running:', error);
    // Return false on error to avoid blocking UI
    return {
      isRunning: false,
      workflowId: null,
      status: null,
    };
  }
}



