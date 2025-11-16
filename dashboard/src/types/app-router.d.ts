// Snapshot of server router paths for the dashboard build.
// This avoids importing backend code while enabling property access like trpc.calendar.health.
export type AppRouter = {
  calendar: {
    health: unknown;
    fetchEvents: unknown;
  };
};


