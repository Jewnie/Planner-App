import { proxyActivities, log } from '@temporalio/workflow';
import type * as activities from './activities.js';

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
  upsertCalendarProvider,
  upsertCalendar,
  upsertEvents,
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
  log.info('Starting Google Calendar sync workflow', { accountId: input.accountId });

  const errors: string[] = [];
  let calendarsSynced = 0;
  let eventsCreated = 0;
  let eventsUpdated = 0;
  let totalEvents = 0;

  // Set default time range if not provided
  const timeMin = input.timeMin || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = input.timeMax || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Step 1: Ensure calendar provider exists in database
    log.info('Upserting calendar provider', { accountId: input.accountId });
    const providerId = await upsertCalendarProvider(input.accountId, 'Google Calendar');

    // Step 2: Fetch list of calendars from Google
    log.info('Fetching calendars from Google', { accountId: input.accountId });
    const googleCalendars = await fetchGoogleCalendars(input.accountId);
    log.info(`Found ${googleCalendars.length} calendars to sync`);

    // Step 3: For each calendar, sync events
    for (const googleCalendar of googleCalendars) {
      try {
        log.info(`Syncing calendar: ${googleCalendar.summary}`, {
          calendarId: googleCalendar.id,
        });

        // Upsert calendar in database
        const calendarId = await upsertCalendar(
          providerId,
          googleCalendar.id,
          googleCalendar.summary,
          googleCalendar.foregroundColor,
          {
            googleCalendarId: googleCalendar.id,
            colorId: googleCalendar.colorId,
            backgroundColor: googleCalendar.backgroundColor,
            foregroundColor: googleCalendar.foregroundColor,
          }
        );

        // Batch download events with pagination
        let pageToken: string | undefined;
        let calendarEventsCreated = 0;
        let calendarEventsUpdated = 0;

        do {
          log.info(`Downloading events batch for calendar: ${googleCalendar.summary}`, {
            pageToken: pageToken || 'first page',
          });

          const { events: batchEvents, nextPageToken } = await batchDownloadCalendarEvents(
            input.accountId,
            googleCalendar.id,
            timeMin,
            timeMax,
            pageToken
          );

          log.info(`Downloaded ${batchEvents.length} events from batch`);

          // Save events to database
          const result = await upsertEvents(calendarId, batchEvents);
          calendarEventsCreated += result.created;
          calendarEventsUpdated += result.updated;

          pageToken = nextPageToken;
        } while (pageToken);

        calendarsSynced++;
        eventsCreated += calendarEventsCreated;
        eventsUpdated += calendarEventsUpdated;
        totalEvents += calendarEventsCreated + calendarEventsUpdated;

        log.info(`Completed sync for calendar: ${googleCalendar.summary}`, {
          created: calendarEventsCreated,
          updated: calendarEventsUpdated,
        });
      } catch (error) {
        const errorMessage = `Error syncing calendar ${googleCalendar.summary}: ${
          error instanceof Error ? error.message : String(error)
        }`;
        log.error(errorMessage);
        errors.push(errorMessage);
        // Continue with next calendar instead of failing entire workflow
      }
    }

    log.info('Google Calendar sync workflow completed', {
      calendarsSynced,
      eventsCreated,
      eventsUpdated,
      totalEvents,
    });

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

