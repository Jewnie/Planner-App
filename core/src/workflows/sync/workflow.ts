import { proxyActivities, log } from '@temporalio/workflow';
import type * as activities from './activities.js';
import type { GoogleCalendarInfo } from './activities.js';
import type { calendar_v3 } from 'googleapis';


// Configure activity retry policy
const activityOptions = {
  startToCloseTimeout: 5 * 60 * 1000, // 5 minutes in milliseconds
  retry: {
    initialInterval: 1000, // 1 second in milliseconds
    backoffCoefficient: 2,
    maximumInterval: 100 * 1000, // 100 seconds in milliseconds
    maximumAttempts: 3,
  },
};

const {
  fetchGoogleCalendars,
  createCalendarWatch,
  batchDownloadCalendarEvents,
  getCalendarProvider,
  upsertCalendar,
  upsertEvents,
  updateCalendarProviderSyncToken,
  updateCalendarSyncToken,
  getCalendarSyncToken,
  handleIntegrationUpsertion,
  clearCalendarProviderSyncToken,
  clearCalendarSyncTokens,
} = proxyActivities<typeof activities>(activityOptions);

export interface SyncWorkflowInput {
  accountId: string;
  userId: string;
  timeMin?: string; // ISO date string, defaults to 30 days ago
  timeMax?: string; // ISO date string, defaults to 1 year from now
  forceFullSync?: boolean; // If true, clears sync tokens to force a full resync
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
    

  const provider = await getCalendarProvider({accountId: input.accountId, providerName: 'google'});
  await handleIntegrationUpsertion({accountId: input.accountId, type: 'google', status: 'syncing'});

  // If forceFullSync is true, clear all sync tokens to force a full resync
  if (input.forceFullSync) {
    log.info('Force full sync requested - clearing sync tokens');
    await clearCalendarProviderSyncToken({accountId: input.accountId, providerName: 'google'});
    await clearCalendarSyncTokens({providerId: provider.id});
  }

  let accountSyncToken: string  | null = input.forceFullSync ? null : provider.syncToken; 
  let allCalendars: GoogleCalendarInfo[] = [];
  let pageToken: string | null = null;

    // Step 2: Fetch list of calendars from Google
    log.info('Fetching calendars from Google');
    do {
      const result: { calendars: GoogleCalendarInfo[], nextPageToken: string | null, nextSyncToken: string | null } = await fetchGoogleCalendars({accountId: input.accountId, nextPageToken: pageToken || undefined, nextSyncToken: accountSyncToken || undefined});

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

        // Upsert calendar in database first to get the database calendar ID (UUID)
        const calendarId = await upsertCalendar({
          providerId: provider.id,
          googleCalendarId: calendar.id,
          name: calendar.summary,
          color: calendar.foregroundColor,
          accessRole: calendar.accessRole,
          metadata: {
            colorId: calendar.colorId,
            backgroundColor: calendar.backgroundColor,
            foregroundColor: calendar.foregroundColor,
          },
        });

        // Try to create calendar watch, but don't fail if it's not supported
        // Some calendars (like read-only system calendars) don't support watches
        // Pass both Google Calendar ID (for API) and database calendar ID (for storage)
        try {
          await createCalendarWatch({
            accountId: input.accountId, 
            googleCalendarId: calendar.id, // For Google API call
            databaseCalendarId: calendarId, // For storing in calendarWatches table
            providerId: provider.id
          });
          log.info(`Calendar watch created for ${calendar.summary}`);
        } catch (watchError) {
          const watchErrorMessage = watchError instanceof Error ? watchError.message : String(watchError);
          
          // Check if this is specifically a "watch not supported" error
          const isWatchNotSupported = watchErrorMessage.toLowerCase().includes('does not support watch');
          
          if (isWatchNotSupported) {
            log.info(`Calendar ${calendar.summary} (${calendar.id}) does not support watch notifications. Syncing without watch.`);
          } else {
            log.warn(`Could not create watch for calendar ${calendar.summary} (${calendar.id}): ${watchErrorMessage}. Continuing without watch.`);
          }
          // Continue without watch - calendar will still be synced
        }

        if(accountSyncToken){
          await updateCalendarProviderSyncToken({accountId: input.accountId,providerName: 'google', syncToken: accountSyncToken});
        }

        // Get existing calendar sync token from database (null if forceFullSync)
        let calendarSyncToken: string | null = input.forceFullSync ? null : await getCalendarSyncToken({ calendarId });

        // Batch download events
        let calendarPageToken: string | null = null;
        let calendarEventsCreated = 0;
        let calendarEventsUpdated = 0;

        do {
          log.info(`Downloading events batch for calendar`);
          const batchResult: {
            events: calendar_v3.Schema$Event[];
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
        await updateCalendarSyncToken({calendarId: calendarId, syncToken: calendarSyncToken});
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

    await handleIntegrationUpsertion({accountId: input.accountId, type: 'google', status: 'synced'});

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

