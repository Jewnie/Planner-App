import { batchDownloadCalendarEvents, getCalendarSyncToken, updateCalendarSyncToken, upsertEvents, getGoogleCalendarId, deleteEvents } from "../sync/activities.js";

export const syncEventsIncremental =  async (params:{calendarId: string, accountId:string}) =>{
    const { calendarId, accountId } = params;
    const timeMin =  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 * 12 *2).toISOString(); // 24 months ago

    // calendarId is the database calendar ID (UUID)
    // We need to get the Google Calendar ID for batchDownloadCalendarEvents
    const googleCalendarId = await getGoogleCalendarId({ calendarId });
    
    const calendarSyncToken: string | null = await getCalendarSyncToken({ calendarId });

    let pageToken: string | null = null;
    let nextSyncToken: string | null = null;
    let totalDeleted = 0;

do{
    const events = await batchDownloadCalendarEvents({ // todo make this a repo function 
        accountId,
        calendarId: googleCalendarId, // Use Google Calendar ID for API call
        pageToken,
        timeMin,
        syncToken: calendarSyncToken,
    })

    // Separate events into active and deleted (cancelled)
    const activeEvents = events.events.filter(event => event.status !== 'cancelled');
    const deletedEventIds = events.events
      .filter(event => event.status === 'cancelled')
      .map(event => event.id);

    // Upsert active events
    if(activeEvents.length > 0){
      await upsertEvents(calendarId, activeEvents); // Use database calendar ID for upsert
    }

    // Delete cancelled events from database
    if(deletedEventIds.length > 0){
      const deletedCount = await deleteEvents(calendarId, deletedEventIds);
      totalDeleted += deletedCount;
    }
  
  
   pageToken = events.nextPageToken;
   nextSyncToken = events.nextSyncToken;
  
  }while(pageToken !== null)

    if(nextSyncToken){
      await updateCalendarSyncToken({ calendarId, syncToken: nextSyncToken }); // Use database calendar ID
    }

    console.log(`[Sync Events] Deleted ${totalDeleted} cancelled events`);

}