


import { trpc } from "@/lib/trpc";

export default function CalendarPage() {
const healthQuery = trpc.calendar.health.useQuery();

const eventsQuery = trpc.calendar.fetchEvents.useQuery();

console.log(eventsQuery.data);



  return (
    <section className="rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-card-foreground">Calendar</h2>
      <p className="text-sm text-muted-foreground">
        {healthQuery.isLoading
          ? "Checking API…"
          : healthQuery.error
          ? "API error"
          : `API ok at ${healthQuery.data?.time}`}
      </p>
    </section>
  )
}

