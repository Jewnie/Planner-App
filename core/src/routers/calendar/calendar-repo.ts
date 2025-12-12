import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { UTCDate } from "@date-fns/utc";
import { db } from "../../db.js";

import { calendarProviders, calendars, calendarWatches, events } from "../../db/calendar-schema.js";
import { account } from "../../db/auth-schema.js";
import { eq, and, or, inArray, isNull, isNotNull, gt, desc, lt } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

import RRulePkg from "rrule";
import { getTemporalClient } from "../../workflows/temporal-client.js";
import { getValidGoogleOAuthClient } from "../../lib/google-auth.js";
import { google } from "googleapis";

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

export const assertCalenderHasProvider = async (params: { accountId: string, calendarId: string }) => {

  const provider = await db.select({id: calendarProviders.id, providerType: calendarProviders.name}).from(calendarProviders).where(and(eq(calendarProviders.accountId, params.accountId)));

  if (provider.length === 0) {
    throw new Error("Provider not found");
  }

  const calendar = await db.select({id: calendars.id, calendarProviderCalendarId: calendars.providerCalendarId}).from(calendars).where(and(eq(calendars.providerId, provider[0].id), eq(calendars.id, params.calendarId)));
  if (calendar.length === 0) {
    throw new Error("Calendar not found");
  }

  return {calendarId: calendar[0].id, providerId: provider[0].id, providerType: provider[0].providerType, calendarProviderCalendarId: calendar[0].calendarProviderCalendarId};
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
      lt(events.startTime, endDate),
      gt(events.endTime, startDate)
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

export const createAllDayEvent = async (params: {
  accountId: string;
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  recurringRule?: string;
  start: {
    date: string;
    timeZone: string;
  };
  end: {
    date: string;
    timeZone: string;
  };
}) => {
  let providerEventId = "pending";
  let calendarProviderCalendarId : null | string = null;
  if(params.calendarId){
   const calendarProvider = await assertCalenderHasProvider({accountId: params.accountId, calendarId: params.calendarId})
   calendarProviderCalendarId = calendarProvider.calendarProviderCalendarId;
   console.log("Calendar provider", calendarProvider);
  } else {
    providerEventId = "internalCalendar"; // Later will be replaced by internal calendar's id ? TODO: Allow user to create internal calendars
  }
  console.log("inserting event into db");
  const dbEvent = await db.insert(events).values({
    startTime: new Date(params.start.date),
    endTime: new Date(params.end.date),
    allDay: true,
    providerEventId : providerEventId,
    title: params.title,
    description: params.description,
    location: params.location,
    rawData:{},
    timeZone: params.start.timeZone,
    recurringRule:params.recurringRule || null,
    calendarId: params.calendarId as string
  }).returning();

  if(params.calendarId && calendarProviderCalendarId){ // TODO: update this when users can create internal calendars
    console.log("notifying provider of created event");
    await notifyProviderOfCreatedEvent({dbEvent: dbEvent[0], accountId: params.accountId, calendarProviderCalendarId: calendarProviderCalendarId})
  }

  return dbEvent[0];
}

export const createTimedEvent = async (params: {
  accountId: string;
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  recurringRule?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
})=>{
  let providerEventId = "pending";
  let calendarProviderCalendarId : null | string = null;
  if(params.calendarId){
    const calendarProvider = await assertCalenderHasProvider({accountId: params.accountId, calendarId: params.calendarId})
    calendarProviderCalendarId = calendarProvider.calendarProviderCalendarId;
    console.log("Calendar provider", calendarProvider);
  } else {
    providerEventId = "internalCalendar"; // Later will be replaced by internal calendar's id ? TODO: Allow user to create internal calendars
  }
  console.log("inserting event into db");
  const dbEvent = await db.insert(events).values({
   calendarId: params.calendarId,
   startTime: new Date(params.start.dateTime),
   endTime: new Date(params.end.dateTime),
   allDay:false,
   providerEventId : providerEventId,
   title: params.title,
   description: params.description,
   location: params.location,
   rawData:{},
   timeZone: params.start.timeZone,
   recurringRule:params.recurringRule || null,
  }).returning();
  if(params.calendarId && calendarProviderCalendarId){ // TODO: update this when users can create internal calendars
    console.log("notifying provider of created event");
    await notifyProviderOfCreatedEvent({dbEvent: dbEvent[0], accountId: params.accountId, calendarProviderCalendarId: calendarProviderCalendarId})
  }
  return dbEvent[0];
}

export const notifyProviderOfCreatedEvent = async (params: {dbEvent: InferSelectModel<typeof events>, accountId: string, calendarProviderCalendarId: string}) => {

  const authClient = await getValidGoogleOAuthClient({accountId: params.accountId});
  const calendarClient = google.calendar({ version: "v3", auth: authClient });
  const startTime = params.dbEvent.allDay ? params.dbEvent.startTime.toISOString().slice(0, 10) : params.dbEvent.startTime.toISOString();
  const endTime = params.dbEvent.allDay ? params.dbEvent.endTime.toISOString().slice(0, 10) : params.dbEvent.endTime.toISOString();
    const providerResponse = await calendarClient.events.insert({
      calendarId: params.calendarProviderCalendarId,
      requestBody: {
        summary: params.dbEvent.title,
        description: params.dbEvent.description,
        location: params.dbEvent.location,
        start: params.dbEvent.allDay ? { date: startTime } : { dateTime: startTime, timeZone: params.dbEvent.timeZone },
        end: params.dbEvent.allDay ? { date: endTime } : { dateTime: endTime, timeZone: params.dbEvent.timeZone },
      },
    });
    if(providerResponse.status === 200){
      console.log("updating provider event id");
      await updateEventProviderEventId({providerEventId: providerResponse.data.id as string, eventId: params.dbEvent.id});
      return providerResponse.data;
    } else {
      throw new Error("Failed to create event in provider");
    }

}


export const updateEventProviderEventId = async (params :{providerEventId: string, eventId: string}) => {
  await db.update(events).set({providerEventId: params.providerEventId}).where(eq(events.id, params.eventId));
}

export const assertUserHasWritePermissionToCalendar = async (params: {accountId: string, calendarId: string}) => {
  const provider = await assertCalenderHasProvider({accountId: params.accountId, calendarId: params.calendarId})
  const calendar = await db.query.calendars.findFirst({
    where: and(eq(calendars.id, params.calendarId), eq(calendars.providerId, provider.providerId)),
  })
  if(!calendar || !provider) {
    throw new Error("Calendar not found");
  }
  if(calendar.accessRole !== 'owner' && calendar.accessRole !== 'writer'){
    throw new Error("FORBIDDEN");
  }

  return {provider, calendar}

}

export const assertEventExists = async(params:{accountId: string, eventId: string, calendarId:string}) => {
  const event = await db.query.events.findFirst({
    where: and(eq(events.id, params.eventId), eq(events.calendarId, params.calendarId)),
    columns:{id: true, calendarId: true, providerEventId: true}
  })
  if(!event) {
    throw new Error("Event not found");
  }
  return event;
}

export const deleteEvent = async(params:{accountId: string, eventId: string, calendarId:string}) => {
  const {provider, calendar} = await assertUserHasWritePermissionToCalendar({accountId: params.accountId, calendarId: params.calendarId})
  const event = await assertEventExists({accountId: params.accountId, eventId: params.eventId, calendarId: params.calendarId})

  if(provider.providerType !== "plnnr"){
    const authClient = await getValidGoogleOAuthClient({accountId: params.accountId});
    const calendarClient = google.calendar({ version: "v3", auth: authClient });
    await calendarClient.events.delete({
      calendarId: calendar.providerCalendarId,
      eventId: event.providerEventId,
    });
  }
  await db.delete(events).where(and(eq(events.id, params.eventId), eq(events.calendarId, params.calendarId))); // TODO: SOFTDELETE VS HARDDELETE?
 
}