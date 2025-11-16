import { router } from "../trpc.js";
import { appRouter as calendarRouter } from "./calendar/calendar-router.js";

export const appRouter = router({
  calendar: calendarRouter,
});

export type AppRouter = typeof appRouter;


