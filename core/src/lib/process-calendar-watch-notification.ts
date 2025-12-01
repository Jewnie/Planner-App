import { db } from "../db.js";
import { getTemporalClient } from "../workflows/temporal-client.js";

export const processCalendarWatchNotification = async(headers: {
    channelId: string;
    resourceId: string;
    resourceState: string;
    messageNumber: string;
  })=> {
    try {
      const { channelId } = headers;
    
      // Look up the active watch (not deleted and not expired)
      const watch = await db.query.calendarWatches.findFirst({
        where: (watch, { eq, isNull, gt, and }) => and(
          eq(watch.channelId, channelId), 
          isNull(watch.deletedAt), 
          gt(watch.expiration, new Date())
        ),
      });
    
      if (!watch) {
        console.warn("Webhook for unknown or expired channel:", channelId);
        return;
      }
    
      // Get the provider to retrieve accountId
      const provider = await db.query.calendarProviders.findFirst({
        where: (provider, { eq }) => eq(provider.id, watch.providerId),
      });
    
      if (!provider) {
        console.error("Provider not found for watch:", watch.providerId);
        return;
      }
    
      // watch.calendarId now contains the database calendar ID (UUID)
      // We can use it directly without looking it up
      const temporalClient = await getTemporalClient();
    
      const workflowId = `events-notification-sync-${watch.channelId}-${Date.now()}`;
    
      await temporalClient.workflow.start("syncEventsIncrementalWorkflow", {
        taskQueue: "calendar-sync-queue",
        workflowId,
        args: [
          {
            calendarId: watch.calendarId, // Database calendar ID (UUID)
            accountId: provider.accountId,
          },
        ],
      });
    
      console.log("Enqueued workflow:", workflowId);
    } catch (error) {
      console.error("Error processing calendar watch notification:", error);
      throw error;
    }
  }