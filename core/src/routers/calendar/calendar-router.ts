import { z } from "zod";
import { router, protectedProcedure } from "../../trpc.js";
import { getGoogleAccountForUser } from "../user/user-repo.js";
import { TRPCError } from "@trpc/server";
import { getTemporalClient } from "../../workflows/temporal-client.js";
import { listEventsByAccountId, getCalendarProvidersForAccount, getCalendarsForProviders, checkIfSyncIsRunning } from "./calendar-repo.js";
import { formatDateToYYYYMMDD } from "../../lib/date-utils.js";
export const calendarRouter = router({
 



  listCalendars: protectedProcedure.query(async ({ ctx }) => {
    
    
    const providers = await getCalendarProvidersForAccount({ accountId: ctx.accountId });
    if (!providers) {
      return [];
    }
    
    const userCalendars = await getCalendarsForProviders({ providerIds: providers.map(p => p.id) });
    return userCalendars.map(calendar => ({
      id: calendar.id,
      name: calendar.name,
    }));
  }),

  listEvents: protectedProcedure.input(z.object({ 
    range: z.enum(["day", "week", "month"]), 
    dates: z.array(z.union([z.coerce.date(), z.string()])),
    filters: z.object({
      calendarIds: z.array(z.string()).optional(),
    }).optional(),
  })).query(async ({ ctx, input }) => {
    const userAccount = await getGoogleAccountForUser(ctx.session!.user.id);
    if (!userAccount) {
      throw new TRPCError({ code: "NOT_FOUND", message: "No Google account linked for user" });
    }
    
    // Format dates to YYYY-MM-DD strings
    const formattedDates = input.dates.map(date => {
      if (typeof date === 'string') {
        return date;
      }
      return formatDateToYYYYMMDD(date);
    });
    
    const items = await listEventsByAccountId(
      userAccount.id, 
      input.range, 
      formattedDates,
      input.filters?.calendarIds
    );
    return items;
  }),

  syncCalendar: protectedProcedure
    .input(
      z.object({
      calendarType: z.enum(["google","outlook"]),
    })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const client = await getTemporalClient();
        
        // Workflow ID format: calendar-sync-{accountId}-{calendarType}
        const workflowId = `calendar-sync-${ctx.accountId}-${input?.calendarType}`;
        
        // TODO handle type of calendar sync GOOGLE/OUTLOOK
        const handle = await client.workflow.start('syncGoogleCalendarWorkflow', {
          args: [{
            accountId: ctx.accountId,
            userId: ctx.session!.user.id,
            calendarType: input?.calendarType,
          }],
          taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'calendar-sync-queue',
          workflowId,
          // Workflow execution timeout
          workflowExecutionTimeout: '1h',
          // Workflow run timeout
          workflowRunTimeout: '1h',
        });

        return {
          workflowId: handle.workflowId,
          runId: handle.firstExecutionRunId,
          status: 'started',
        };
      } catch (error) {
        console.error('Failed to start calendar sync workflow:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Provide more helpful error messages
        if (errorMessage.includes('Failed to connect to Temporal server')) {
          throw new TRPCError({
            code: "SERVICE_UNAVAILABLE",
            message: `Temporal server is not available. Please ensure the Temporal server is running. ${errorMessage}`,
          });
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to start sync: ${errorMessage}`,
        });
      }
    }),

  getCalendarProviders: protectedProcedure.query(async ({ ctx }) => {

    
    const providers = await getCalendarProvidersForAccount({ accountId: ctx.accountId });
    if (!providers) {
      return [];
    }

    return providers;
  }),


  getSyncStatus: protectedProcedure
    .input(z.object({ workflowId: z.string() }))
    .query(async ({ input }) => {
      try {
        const client = await getTemporalClient();
        const handle = client.workflow.getHandle(input.workflowId);
        
        const description = await handle.describe();
        const result = await handle.result().catch(() => null);

        return {
          workflowId: description.workflowId,
          status: description.status.name,
          runId: description.runId,
          startTime: description.startTime?.toISOString(),
          closeTime: description.closeTime?.toISOString(),
          result: result || undefined,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get sync status: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }),

  /**
   * Check if a sync workflow is currently running for a given integration type
   */
  isSyncRunning: protectedProcedure
    .input(z.object({ calendarType: z.enum(["google", "outlook"]) }))
    .query(async ({ ctx, input }) => {
      return await checkIfSyncIsRunning({
        accountId: ctx.accountId,
        calendarType: input.calendarType,
      });
    }),


});

export type AppRouter = typeof calendarRouter;


