import { proxyActivities } from "@temporalio/workflow";
import type * as activities from './activities.js';

const activityOptions = {
    startToCloseTimeout: 5 * 60 * 1000, // 5 minutes in milliseconds
    retry: {
      initialInterval: 1000, // 1 second in milliseconds
      backoffCoefficient: 2,
      maximumInterval: 100 * 1000, // 100 seconds in milliseconds
      maximumAttempts: 3,
    },
  };

 const {syncEventsIncremental} = proxyActivities<typeof activities>(activityOptions);

export const syncEventsIncrementalWorkflow = async (params:{calendarId: string, accountId:string}) =>{
    const { calendarId, accountId } = params;
    await syncEventsIncremental({ calendarId, accountId });
}