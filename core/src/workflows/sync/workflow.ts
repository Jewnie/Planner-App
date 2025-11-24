import { proxyActivities, log } from '@temporalio/workflow';
import type * as activities from './activities.js';
import type { CalendarInfo } from './activities.js';

// Configure activity retry policy
const activityOptions = {
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '100s',
    maximumAttempts: 3,
  },
};

const {
  fetchGoogleCalendars,
  batchDownloadCalendarEvents,
  assertCalendarProviderExists,
  upsertCalendar,
  upsertEvents,
  updateCalendarProviderSyncToken,
  updateCalendarSyncToken,
  getCalendarSyncToken,
} = proxyActivities<typeof activities>(activityOptions);

export interface SyncWorkflowInput {
  accountId: string;
  userId: string;
  timeMin?: string; // ISO date string, defaults to 30 days ago
  timeMax?: string; // ISO date string, defaults to 1 year from now
}

export interface SyncWorkflowOutput {
  calendarsSynced: number;
  eventsCreated: number;
  eventsUpdated: number;
  totalEvents: number;
  errors?: string[];
}

/**
 * Main workflow for syncing Google Calendar events
 */
export async function syncGoogleCalendarWorkflow(
  input: SyncWorkflowInput
): Promise<SyncWorkflowOutput> {
  log.info('Starting Google Calendar sync workflow');

  const errors: string[] = [];
  let calendarsSynced = 0;
  let eventsCreated = 0;
  let eventsUpdated = 0;
  let totalEvents = 0;

  // Set default time range if not provided
  const timeMin = input.timeMin || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 * 12 *2).toISOString(); // 24 months ago

  try {
    // Step 1: Ensure calendar provider exists in database
    

  const provider = await assertCalendarProviderExists({accountId: input.accountId, providerName: 'google'});


  let accountSyncToken: string  | null = provider.syncToken; 
  let allCalendars: CalendarInfo[] = [];
  let pageToken: string | null = null;

    // Step 2: Fetch list of calendars from Google
    log.info('Fetching calendars from Google');
    do {
      const result: {
        calendars: CalendarInfo[];
        nextPageToken?: string | null;
        nextSyncToken?: string | null;
      } = await fetchGoogleCalendars({accountId: input.accountId, nextPageToken: pageToken || undefined, nextSyncToken: accountSyncToken || undefined});
      allCalendars = [...allCalendars, ...result.calendars];
      pageToken = result.nextPageToken || null;
      accountSyncToken = result.nextSyncToken || null;
    } while (pageToken);
    // Step 3: For each calendar, sync events
    for (const calendar of allCalendars) {
      try {
        log.info(`Syncing calendar: ${calendar.summary}`, {
          calendarId: calendar.id,
        });

        // Upsert calendar in database
        const calendarId = await upsertCalendar(
          provider.id,
          calendar.id,
          calendar.summary,
          calendar.foregroundColor,
          {
            googleCalendarId: calendar.id,
            colorId: calendar.colorId,
            backgroundColor: calendar.backgroundColor,
            foregroundColor: calendar.foregroundColor,
          }
        );

        if(accountSyncToken){
          await updateCalendarProviderSyncToken({accountId: input.accountId,providerName: 'google', syncToken: accountSyncToken});
        }

        // Get existing calendar sync token from database
        let calendarSyncToken: string | null = await getCalendarSyncToken({ calendarId });

        // Batch download events
        let calendarPageToken: string | null = null;
        let calendarEventsCreated = 0;
        let calendarEventsUpdated = 0;

        do {
          log.info(`Downloading events batch for calendar`);

          const batchResult: {
            events: activities.GoogleCalendarEventNormalized[];
            nextPageToken: string | null;
            nextSyncToken: string | null;
          } = await batchDownloadCalendarEvents({
            timeMin: timeMin,
            accountId: input.accountId,
            calendarId: calendar.id,
            pageToken: calendarPageToken,
            syncToken: calendarSyncToken,
          });
          const { events: batchEvents, nextPageToken, nextSyncToken } = batchResult;


          // Save events to database
          const upsertResult = await upsertEvents(calendarId, batchEvents);
          calendarEventsCreated += upsertResult.created;
          calendarEventsUpdated += upsertResult.updated;

          calendarPageToken = nextPageToken ?? null;
          calendarSyncToken = nextSyncToken ?? null;
        } while (calendarPageToken !== null);

        if(calendarSyncToken){
          console.log("-------------------NŃEWSYNCTOKEN----------------------------------", calendarSyncToken);
        await updateCalendarSyncToken({calendarId: calendarId,providerId: provider.id, syncToken: calendarSyncToken});
        }


        calendarsSynced++;
        eventsCreated += calendarEventsCreated;
        eventsUpdated += calendarEventsUpdated;
        totalEvents += calendarEventsCreated + calendarEventsUpdated;
        console.log("-------------------TOTALEVENTS----------------------------------", totalEvents);
        console.log("-------------------EVENTSCREATED----------------------------------", calendarEventsCreated);
        console.log("-------------------EVENTSUPDATED----------------------------------", calendarEventsUpdated);

        log.info(`Completed sync for calendar`);
      } catch (error) {
        const errorMessage = `Error syncing calendar ${calendar.summary}: ${
          error instanceof Error ? error.message : String(error)
        }`;
        log.error(errorMessage);
        errors.push(errorMessage);
        // Continue with next calendar instead of failing entire workflow
      }
    }

    log.info('Google Calendar sync workflow completed');

    return {
      calendarsSynced,
      eventsCreated,
      eventsUpdated,
      totalEvents,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    const errorMessage = `Workflow failed: ${error instanceof Error ? error.message : String(error)}`;
    log.error(errorMessage);
    throw new Error(errorMessage);
  }
}

