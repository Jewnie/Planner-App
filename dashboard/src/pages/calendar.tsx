


import { trpc } from "@/lib/trpc";

export default function CalendarPage() {
const healthQuery = trpc.calendar.health.useQuery();

const eventsQuery = trpc.calendar.fetchEvents.useQuery();

  return (
    <section className="rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-card-foreground">Calendar</h2>
      <div className="text-sm text-muted-foreground mb-4">
        {healthQuery.isLoading
          ? "Checking API…"
          : healthQuery.error
          ? "API error"
          : `API ok at ${healthQuery.data?.time}`}
      </div>

      {eventsQuery.isLoading && (
        <div className="text-sm text-muted-foreground">Loading events…</div>
      )}

      {eventsQuery.error && (
        <div className="text-sm text-red-600">Failed to load events.</div>
      )}

      {!eventsQuery.isLoading && !eventsQuery.error && (
        <>
          {!eventsQuery.data?.items?.length ? (
            <div className="text-sm text-muted-foreground">
              No upcoming events.
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-md border">
              {(() => {
                type GoogleEvent = {
                  id?: string | null;
                  summary?: string | null;
                  location?: string | null;
                  start?: { dateTime?: string | null; date?: string | null } | null;
                  end?: { dateTime?: string | null; date?: string | null } | null;
                };
                const items = (eventsQuery.data!.items as unknown as GoogleEvent[]) || [];
                return items.map((evt) => {
                  const startRaw = evt?.start?.dateTime || evt?.start?.date || undefined;
                const endRaw = evt?.end?.dateTime || evt?.end?.date || undefined;
                const start = startRaw ? new Date(startRaw) : null;
                const end = endRaw ? new Date(endRaw) : null;
                const format = (d: Date | null) =>
                  d
                    ? `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : "—";
                const whenStart = format(start);
                const whenEnd = format(end);
                return (
                  <li key={evt.id ?? `${whenStart}-${Math.random()}`} className="p-3 flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                    <div className="flex-1">
                      <div className="font-medium text-card-foreground">
                        {evt.summary ?? "Untitled event"}
                      </div>
                      <dl className="mt-1 grid gap-1 text-xs text-muted-foreground">
                        <div className="flex gap-2">
                          <dt className="min-w-12 text-foreground/70">Starts:</dt>
                          <dd>{whenStart}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="min-w-12 text-foreground/70">Ends:</dt>
                          <dd>{whenEnd}</dd>
                        </div>
                        {evt.location ? (
                          <div className="flex gap-2">
                            <dt className="min-w-12 text-foreground/70">Where:</dt>
                            <dd>{evt.location}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>
                  </li>
                );
                });
              })()}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

