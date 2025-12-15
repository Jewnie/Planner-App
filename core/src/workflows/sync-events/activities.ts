import {
  batchDownloadCalendarEvents,
  getCalendarSyncToken,
  updateCalendarSyncToken,
  upsertEvents,
  getGoogleCalendarId,
  deleteEvents,
} from '../sync/activities.js';

export const syncEventsIncremental = async (params: { calendarId: string; accountId: string }) => {
  const { calendarId, accountId } = params;
  const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 * 12 * 2).toISOString(); // 24 months ago

  // calendarId is the database calendar ID (UUID)
  // We need to get the Google Calendar ID for batchDownloadCalendarEvents
  const googleCalendarId = await getGoogleCalendarId({ calendarId });

  const calendarSyncToken: string | null = await getCalendarSyncToken({ calendarId });

  let pageToken: string | null = null;
  let nextSyncToken: string | null = null;
  let totalDeleted = 0;
  let isFirstPage = true; // Track if this is the first page

  do {
    // Only use syncToken on the first page. For subsequent pages, only use pageToken
    const events = await batchDownloadCalendarEvents({
      accountId,
      calendarId: googleCalendarId,
      pageToken,
      timeMin,
      syncToken: isFirstPage ? calendarSyncToken : null, // Only use sync token on first page
    });

    // Separate events into active and deleted (cancelled)
    const activeEvents = events.events.filter((event) => event.status !== 'cancelled');
    const deletedEventIds = events.events
      .filter((event) => event.status === 'cancelled')
      .map((event) => event.id)
      .filter(Boolean) as string[];

    // Upsert active events
    if (activeEvents.length > 0) {
      await upsertEvents(calendarId, activeEvents);
    }

    // Delete cancelled events from database
    if (deletedEventIds.length > 0) {
      const deletedCount = await deleteEvents(calendarId, deletedEventIds);
      totalDeleted += deletedCount;
    }

    // Capture nextSyncToken only from the last page
    if (events.nextSyncToken) {
      nextSyncToken = events.nextSyncToken;
    }

    pageToken = events.nextPageToken;
    isFirstPage = false; // After first page, we're paginating
  } while (pageToken !== null);

  // Update sync token if we got one
  if (nextSyncToken) {
    await updateCalendarSyncToken({ calendarId, syncToken: nextSyncToken });
  } else if (!calendarSyncToken) {
    // If we didn't have a sync token and didn't get one, log a warning
    console.warn(
      `[Sync Events] No sync token received after sync. Calendar might need full resync.`,
    );
  }

  console.log(`[Sync Events] Deleted ${totalDeleted} cancelled events`);
};
