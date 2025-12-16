import { router } from '../trpc.js';
import { calendarRouter } from './calendar/calendar-router.js';
import { householdRouter } from './household/household-router.js';
import { integrationRouter } from './integrations/integration-router.js';

export const appRouter = router({
  calendar: calendarRouter,
  integration: integrationRouter,
  household: householdRouter,
});

export type AppRouter = typeof appRouter;
