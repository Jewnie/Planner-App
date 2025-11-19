import { z } from "zod";
import { router, protectedProcedure } from "../../trpc.js";
import { getGoogleAccountForUser } from "../user/user-repo.js";
import { TRPCError } from "@trpc/server";
import { getTemporalClient } from "../../workflows/temporal-client.js";
import { listEvents } from "./calendar-repo.js";
export const appRouter = router({
 



  listEvents: protectedProcedure.input(z.object({ range: z.enum(["day", "week", "month"]), date: z.union([z.coerce.date(), z.string()]).transform((val) => {
    // Handle both Date objects and date strings (YYYY-MM-DD)
    // If it's a string, parse it as a date in UTC to avoid timezone issues
    if (typeof val === 'string') {
      // Parse YYYY-MM-DD as UTC date to avoid timezone shifts
      const [year, month, day] = val.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day));
    }
    return val as Date;
  }) })).query(async ({ ctx, input }) => {
    const userAccount = await getGoogleAccountForUser(ctx.session!.user.id);
    if (!userAccount) {
      throw new TRPCError({ code: "FORBIDDEN", message: "No Google account linked" });
    }
    const items = await listEvents(userAccount.id, input.range, input.date);
    return items;
  }),

  syncCalendar: protectedProcedure
    .input(
      z.object({
        timeMin: z.string().optional(), // ISO date string
        timeMax: z.string().optional(), // ISO date string
      }).optional()
    )
    .mutation(async ({ ctx, input }) => {
      const userAccount = await getGoogleAccountForUser(ctx.session!.user.id);
      if (!userAccount) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No Google account linked" });
      }

      try {
        const client = await getTemporalClient();
        
        const workflowId = `calendar-sync-${ctx.session!.user.id}-${Date.now()}`;
        
        // Note: We use the workflow type name as a string since workflows
        // can only be imported in the worker context
        const handle = await client.workflow.start('syncGoogleCalendarWorkflow', {
          args: [{
            accountId: userAccount.id,
            userId: ctx.session!.user.id,
            timeMin: input?.timeMin,
            timeMax: input?.timeMax,
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


});

export type AppRouter = typeof appRouter;


