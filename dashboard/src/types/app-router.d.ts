// Snapshot of server router paths for the dashboard build.
// This avoids importing backend code while enabling property access like trpc.calendar.listEvents.
export type AppRouter = {
  calendar: {
    listEvents: {
      input: { range: "day" | "week" | "month"; index?: number };
      output: Array<{
        id: string;
        summary: string;
        description: string | null;
        location: string | null;
        start: {
          dateTime: string | null;
          date: string | null;
          timeZone: string | null;
        };
        end: {
          dateTime: string | null;
          date: string | null;
          timeZone: string | null;
        };
      }>;
    };
    syncCalendar: {
      input: { timeMin?: string; timeMax?: string } | undefined;
      output: {
        workflowId: string;
        runId: string;
        status: string;
      };
    };
    getSyncStatus: {
      input: { workflowId: string };
      output: {
        workflowId: string;
        status: string;
        runId: string;
        startTime: string | undefined;
        closeTime: string | undefined;
        result: unknown;
      };
    };
  };
};


